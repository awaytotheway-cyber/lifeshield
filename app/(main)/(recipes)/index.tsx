import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextInput } from "@/components/ui/TextInput";
import { TextButton } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import {
  loadRecipes,
  loadSavedRecipeIds,
  totalMinutes,
  type RecipeRow,
} from "@/lib/recipes";
import { recipeDetailHref, routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

type Filter = "all" | "quick" | "medium";

export default function RecipesListScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<RecipeRow[] | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const maxMinutes = filter === "quick" ? 15 : filter === "medium" ? 30 : null;
    const res = await loadRecipes({ search: q, maxMinutes });
    setLoading(false);
    if (!res.ok) {
      setMessage(res.message);
      setRows([]);
      return;
    }
    setMessage(null);
    setRows(res.rows);
    if (session?.user.id) {
      const s = await loadSavedRecipeIds(session.user.id);
      if (s.ok) setSaved(s.ids);
    }
  }, [q, filter, session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!session) return <Redirect href={routes.login} />;

  return (
    <Screen scroll contentPadding={Measure.gutter} centered={false}>
      <ScreenHeader
        title={COPY.recipesTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />
      <Text style={styles.body}>{COPY.recipesSubtitle}</Text>

      <View style={{ marginTop: Measure.tight }}>
        <TextInput
          label="Search"
          placeholder={COPY.recipesSearchPlaceholder}
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => void load()}
          returnKeyType="search"
        />
      </View>

      <View style={styles.chips}>
        {(
          [
            ["all", COPY.recipesFilterAll],
            ["quick", COPY.recipesFilterQuick],
            ["medium", COPY.recipesFilterMedium],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === value }}
            onPress={() => setFilter(value)}
            style={[styles.chip, filter === value && styles.chipOn]}
          >
            <Text style={[styles.chipText, filter === value && styles.chipTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading && rows === null ? <StaticSkeleton rows={3} /> : null}

      {message ? <Text style={styles.error}>{message}</Text> : null}

      {rows !== null && rows.length === 0 && !loading ? (
        <EmptyState
          icon="coffee"
          heading={COPY.recipesEmptyTitle}
          explanation={COPY.recipesEmptyBody}
        />
      ) : null}

      {(rows ?? []).map((row) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          onPress={() => router.push(recipeDetailHref(row.id))}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <Text style={styles.name}>{row.name}</Text>
          {row.description ? (
            <Text style={styles.meta}>{row.description}</Text>
          ) : null}
          <View style={styles.rowMeta}>
            <Text style={styles.metaLight}>
              {totalMinutes(row)} min · {row.servings} servings
            </Text>
            {saved.has(row.id) ? (
              <Text style={styles.savedBadge}>★ {COPY.recipesSavedLabel}</Text>
            ) : null}
          </View>
          {row.tags.length > 0 ? (
            <Text style={styles.tags}>{row.tags.join(" · ")}</Text>
          ) : null}
        </Pressable>
      ))}

      <TextButton title="Refresh" onPress={() => void load()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: 16,
    lineHeight: 22,
    color: Ink.soft,
  },
  chips: {
    marginTop: Measure.tight,
    marginBottom: Measure.base,
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Edge.tag,
    backgroundColor: Paper.mount,
    borderWidth: 1,
    borderColor: Ink.rule,
  },
  chipOn: { backgroundColor: Accent.tag, borderColor: Accent.tag },
  chipText: { fontFamily: SpecimenType.monoBold, fontSize: 15, color: Ink.full },
  chipTextOn: { color: Paper.mount },
  card: {
    marginBottom: Measure.tight,
    backgroundColor: Paper.mount,
    borderRadius: Edge.mount,
    padding: Measure.base,
  },
  cardPressed: { opacity: 0.85 },
  name: {
    fontFamily: SpecimenType.serif,
    fontSize: 19,
    color: Ink.full,
  },
  meta: {
    marginTop: 2,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Ink.soft,
  },
  rowMeta: {
    marginTop: Measure.tight,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLight: {
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    color: Ink.faint,
  },
  savedBadge: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 14,
    color: Accent.tag,
  },
  tags: {
    marginTop: Measure.hair,
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    color: Ink.faint,
  },
  error: {
    marginTop: Measure.base,
    fontFamily: SpecimenType.mono,
    color: Accent.tag,
  },
});
