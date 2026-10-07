import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
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
import { useAuthStore } from "@/stores/auth-store";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

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

  return (
    <Screen scroll contentPadding={Measure.gutter} centered={false}>
      <ScreenHeader
        title={row?.name ?? COPY.recipesTitle}
        onBack={() => router.back()}
        backLabel={COPY.recipesTitle}
      />

      {loading ? <StaticSkeleton rows={4} /> : null}
      {message ? <Text style={styles.error}>{message}</Text> : null}

      {row ? (
        <View style={styles.card}>
          {row.description ? (
            <Text style={styles.desc}>{row.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            <MetaItem label={COPY.recipesPrepLabel} value={`${row.prep_min} min`} />
            <MetaItem label={COPY.recipesCookLabel} value={`${row.cook_min} min`} />
            <MetaItem label={COPY.recipesTotalMinutes} value={`${totalMinutes(row)} min`} />
          </View>

          <View style={styles.portionsRow}>
            <Text style={styles.portionsLabel}>{COPY.recipesPortionsLabel}:</Text>
            <View style={styles.portionsControls}>
              <Pressable
                accessibilityLabel="Fewer servings"
                onPress={() =>
                  setPortions((p) => Math.max(1, (p ?? row.servings) - 1))
                }
                style={styles.portionBtn}
              >
                <Text style={styles.portionBtnText}>−</Text>
              </Pressable>
              <Text style={styles.portionsValue}>{portions ?? row.servings}</Text>
              <Pressable
                accessibilityLabel="More servings"
                onPress={() =>
                  setPortions((p) => Math.min(20, (p ?? row.servings) + 1))
                }
                style={styles.portionBtn}
              >
                <Text style={styles.portionBtnText}>+</Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionLabel}>{COPY.recipesIngredientsLabel}</Text>
          {adjustIngredientsForPortions(
            row.ingredients,
            row.servings,
            portions ?? row.servings,
          ).map((line, idx) => (
            <Text key={idx} style={styles.line}>
              • {line}
            </Text>
          ))}

          <Text style={styles.sectionLabel}>{COPY.recipesInstructionsLabel}</Text>
          {row.instructions.map((line, idx) => (
            <Text key={idx} style={styles.line}>
              {idx + 1}. {line}
            </Text>
          ))}

          {row.nutrition ? (
            <>
              <Text style={styles.sectionLabel}>
                {COPY.recipesNutritionLabel}
              </Text>
              <Text style={styles.line}>
                {[
                  row.nutrition.kcal ? `${row.nutrition.kcal} kcal` : null,
                  row.nutrition.protein_g ? `${row.nutrition.protein_g} g protein` : null,
                  row.nutrition.carbs_g ? `${row.nutrition.carbs_g} g carbs` : null,
                  row.nutrition.fat_g ? `${row.nutrition.fat_g} g fat` : null,
                  row.nutrition.fiber_g ? `${row.nutrition.fiber_g} g fibre` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
            </>
          ) : null}

          <View style={{ marginTop: Measure.loose }}>
            <PrimaryButton
              title={isSaved ? COPY.recipesUnsaveCta : COPY.recipesSaveCta}
              loading={busy}
              onPress={toggleSave}
            />
            <TextButton title="Back to recipes" onPress={() => router.back()} />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Measure.base,
    padding: Measure.loose,
    backgroundColor: Paper.mount,
    borderRadius: Edge.mount,
  },
  desc: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 24,
    color: Ink.soft,
  },
  metaRow: {
    marginTop: Measure.base,
    flexDirection: "row",
    gap: Measure.base,
  },
  metaItem: { alignItems: "flex-start" },
  metaLabel: {
    fontFamily: SpecimenType.mono,
    fontSize: 13,
    letterSpacing: 0.3,
    color: Ink.soft,
    textTransform: "uppercase",
  },
  metaValue: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 16,
    color: Ink.full,
  },
  portionsRow: {
    marginTop: Measure.base,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  portionsLabel: {
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    color: Ink.soft,
  },
  portionsControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: Measure.tight,
  },
  portionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Paper.sheet,
    alignItems: "center",
    justifyContent: "center",
  },
  portionBtnText: {
    fontFamily: SpecimenType.serif,
    fontSize: 20,
    color: Accent.tag,
  },
  portionsValue: {
    fontFamily: SpecimenType.serif,
    fontSize: 18,
    color: Ink.full,
    minWidth: 24,
    textAlign: "center",
  },
  sectionLabel: {
    marginTop: Measure.loose,
    marginBottom: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    color: Ink.soft,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  line: {
    marginBottom: 4,
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.full,
  },
  error: {
    marginTop: Measure.base,
    fontFamily: SpecimenType.mono,
    color: Accent.tag,
  },
});
