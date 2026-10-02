import { Image } from "expo-image";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { IconButton, PrimaryButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import {
  adjustIngredientsForPortions,
  loadRecipeById,
  loadSavedRecipeIds,
  saveRecipe,
  totalMinutes,
  unsaveRecipe,
  type RecipeRow,
} from "@/lib/recipes";
import { routes } from "@/lib/routes";
import { Colors, Font, Gap, Radius, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

/** One timing fact: a quiet label with an ink value underneath. */
function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export default function RecipeDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params.id === "string" ? params.id : null;
  const session = useAuthStore((state) => state.session);
  const [row, setRow] = useState<RecipeRow | null>(null);
  const [portions, setPortions] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [r, s] = await Promise.all([
      loadRecipeById(id),
      session?.user.id
        ? loadSavedRecipeIds(session.user.id)
        : Promise.resolve({ ok: true as const, ids: new Set<string>() }),
    ]);
    setLoading(false);
    if (!r.ok) {
      setMessage(r.message);
      return;
    }
    setRow(r.row);
    if (r.row) setPortions(r.row.servings);
    if (s.ok) setIsSaved(s.ids.has(id));
  }, [id, session?.user.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session) return <Redirect href={routes.login} />;

  const toggleSave = async () => {
    if (!row) return;
    setBusy(true);
    const res = isSaved
      ? await unsaveRecipe(session.user.id, row.id)
      : await saveRecipe(session.user.id, row.id);
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    setIsSaved((v) => !v);
  };

  const servings = portions ?? row?.servings ?? 1;

  return (
    <Screen
      scroll
      footer={
        row ? (
          <PrimaryButton
            title={isSaved ? COPY.recipesUnsaveCta : COPY.recipesSaveCta}
            icon={isSaved ? "check" : "bookmark"}
            loading={busy}
            style={styles.saveButton}
            onPress={toggleSave}
          />
        ) : undefined
      }
    >
      <ScreenHeader
        title={row?.name ?? COPY.recipesTitle}
        onBack={() => router.back()}
        backLabel={COPY.recipesTitle}
      />

      {loading ? <StaticSkeleton rows={4} /> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}

      {row ? (
        <>
          {row.image_url ? (
            <Image
              source={{ uri: row.image_url }}
              style={styles.hero}
              contentFit="cover"
              accessibilityIgnoresInvertColors
            />
          ) : null}

          {row.description ? (
            <Text style={styles.desc}>{row.description}</Text>
          ) : null}

          {row.tags.length > 0 ? (
            <View style={styles.tags}>
              {row.tags.map((tag) => (
                <Chip key={tag} label={tag} />
              ))}
            </View>
          ) : null}

          <Card style={styles.timingCard}>
            <View style={styles.metaRow}>
              <MetaItem
                label={COPY.recipesPrepLabel}
                value={`${row.prep_min} min`}
              />
              <MetaItem
                label={COPY.recipesCookLabel}
                value={`${row.cook_min} min`}
              />
              <MetaItem
                label={COPY.recipesTotalMinutes}
                value={`${totalMinutes(row)} min`}
              />
            </View>
          </Card>

          <SectionTitle title={COPY.recipesIngredientsLabel} />
          <Card>
            <View style={styles.portionsRow}>
              <Text style={styles.portionsLabel}>
                {COPY.recipesPortionsLabel}
              </Text>
              <View style={styles.portionsControls}>
                <IconButton
                  icon="minus"
                  accessibilityLabel="Fewer servings"
                  onPress={() =>
                    setPortions((p) => Math.max(1, (p ?? row.servings) - 1))
                  }
                />
                <Text style={styles.portionsValue}>{servings}</Text>
                <IconButton
                  icon="plus"
                  accessibilityLabel="More servings"
                  onPress={() =>
                    setPortions((p) => Math.min(20, (p ?? row.servings) + 1))
                  }
                />
              </View>
            </View>

            <View style={styles.lines}>
              {adjustIngredientsForPortions(
                row.ingredients,
                row.servings,
                servings,
              ).map((line, idx) => (
                <View key={idx} style={styles.bulletRow}>
                  <View style={styles.bullet} />
                  <Text style={styles.line}>{line}</Text>
                </View>
              ))}
            </View>
          </Card>

          <SectionTitle title={COPY.recipesInstructionsLabel} />
          <Card>
            <View style={styles.steps}>
              {row.instructions.map((line, idx) => (
                <View key={idx} style={styles.stepRow}>
                  <Text style={styles.stepNumber}>{idx + 1}</Text>
                  <Text style={styles.line}>{line}</Text>
                </View>
              ))}
            </View>
          </Card>

          {row.nutrition ? (
            <>
              <SectionTitle title={COPY.recipesNutritionLabel} />
              <Card>
                <Text style={styles.line}>
                  {[
                    row.nutrition.kcal ? `${row.nutrition.kcal} kcal` : null,
                    row.nutrition.protein_g
                      ? `${row.nutrition.protein_g} g protein`
                      : null,
                    row.nutrition.carbs_g
                      ? `${row.nutrition.carbs_g} g carbs`
                      : null,
                    row.nutrition.fat_g ? `${row.nutrition.fat_g} g fat` : null,
                    row.nutrition.fiber_g
                      ? `${row.nutrition.fiber_g} g fibre`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              </Card>
            </>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    width: "100%",
    height: 220,
    borderRadius: Radius.hero,
    backgroundColor: Colors.cloud,
  },
  desc: {
    ...typeStyle("body"),
    marginTop: Space.lg,
    color: Colors.body,
  },
  tags: {
    marginTop: Space.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
  },
  timingCard: {
    marginTop: Gap.sections,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    ...typeStyle("label"),
    color: Colors.muted,
  },
  metaValue: {
    ...typeStyle("cardTitle"),
    marginTop: Space.xs,
    color: Colors.ink,
  },
  portionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
    paddingBottom: Space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.line,
  },
  portionsLabel: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  portionsControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  portionsValue: {
    fontFamily: Font.bold,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.orange,
    minWidth: 32,
    textAlign: "center",
  },
  lines: {
    marginTop: Space.md,
    gap: Space.sm,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 11,
    backgroundColor: Colors.orangeTintDeep,
  },
  steps: {
    gap: Space.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.sm,
  },
  stepNumber: {
    ...typeStyle("cardTitle"),
    width: 24,
    color: Colors.orange,
  },
  line: {
    flex: 1,
    ...typeStyle("body"),
    color: Colors.body,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.red,
  },
  saveButton: {
    marginTop: 0,
  },
});
