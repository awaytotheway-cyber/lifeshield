import { Image } from "expo-image";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import {
  loadRecipes,
  loadSavedRecipeIds,
  totalMinutes,
  type RecipeRow,
} from "@/lib/recipes";
import { recipeDetailHref, routes } from "@/lib/routes";
import { Colors, Font, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

type Filter = "all" | "quick" | "medium";

const FILTERS: [Filter, string][] = [
  ["all", COPY.recipesFilterAll],
  ["quick", COPY.recipesFilterQuick],
  ["medium", COPY.recipesFilterMedium],
];

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
    <Screen scroll>
      <ScreenHeader
        title={COPY.recipesTitle}
        subtitle={COPY.recipesSubtitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.orderBackHome}
      />

      <TextInput
        label="Search"
        placeholder={COPY.recipesSearchPlaceholder}
        value={q}
        onChangeText={setQ}
        onSubmitEditing={() => void load()}
        returnKeyType="search"
      />

      <View style={styles.chips}>
        {FILTERS.map(([value, label]) => (
          <Chip
            key={value}
            label={label}
            selected={filter === value}
            onPress={() => setFilter(value)}
          />
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

      <View style={styles.list}>
        {(rows ?? []).map((row) => (
          <Card
            key={row.id}
            padded={false}
            style={styles.card}
            accessibilityLabel={row.name}
            onPress={() => router.push(recipeDetailHref(row.id))}
          >
            {row.image_url ? (
              <Image
                source={{ uri: row.image_url }}
                style={styles.image}
                contentFit="cover"
                accessibilityIgnoresInvertColors
              />
            ) : null}
            <View style={styles.cardBody}>
              <Text style={styles.name}>{row.name}</Text>
              {row.description ? (
                <Text style={styles.desc} numberOfLines={3}>
                  {row.description}
                </Text>
              ) : null}

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Feather name="clock" size={14} color={Colors.muted} />
                  <Text style={styles.metaText}>{totalMinutes(row)} min</Text>
                </View>
                <View style={styles.metaItem}>
                  <Feather name="users" size={14} color={Colors.muted} />
                  <Text style={styles.metaText}>
                    {row.servings} servings
                  </Text>
                </View>
                {saved.has(row.id) ? (
                  <Chip label={COPY.recipesSavedLabel} tone="orange" />
                ) : null}
              </View>

              {row.tags.length > 0 ? (
                <View style={styles.tags}>
                  {row.tags.slice(0, 4).map((tag) => (
                    <Chip key={tag} label={tag} />
                  ))}
                </View>
              ) : null}
            </View>
          </Card>
        ))}
      </View>

      <TextButton title="Refresh" onPress={() => void load()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    marginTop: Space.lg,
    marginBottom: Gap.sections,
    flexDirection: "row",
    gap: Space.sm,
  },
  list: {
    gap: Gap.cards,
  },
  card: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 180,
    backgroundColor: Colors.cloud,
  },
  cardBody: {
    padding: Space.cardPad,
  },
  name: {
    fontFamily: Font.serif,
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
    color: Colors.ink,
  },
  desc: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  metaRow: {
    marginTop: Space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.xs,
  },
  metaText: {
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  tags: {
    marginTop: Space.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.line,
    paddingTop: Space.md,
  },
  error: {
    ...typeStyle("secondary"),
    color: Colors.red,
  },
});
