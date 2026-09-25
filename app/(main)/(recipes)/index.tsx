import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import {
  filterRecipes,
  sortRecipes,
  totalMinutes,
  uniqueTags,
  type RecipeSummary,
} from "@/lib/recipes";
import {
  loadFavoriteRecipeIds,
  loadRecipeSummaries,
} from "@/lib/recipes-io";
import { fontFamily } from "@/lib/typography";
import { recipeHref, routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function RecipesScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<LoadState>("idle");
  const [rows, setRows] = useState<RecipeSummary[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);

  const [query, setQuery] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setState("loading");
      setErrorMessage(null);

      if (isSupabaseConfigured) {
        void supabase
          .from("profiles")
          .select("feature_flags")
          .eq("id", userId)
          .maybeSingle()
          .then(({ data }) => {
            if (cancelled) return;
            setProfile((data ?? { feature_flags: {} }) as FeatureFlagProfile);
          });
      } else {
        setProfile({ feature_flags: {} });
      }

      void Promise.all([
        loadRecipeSummaries(),
        loadFavoriteRecipeIds(userId),
      ]).then(([summariesOutcome, favoritesOutcome]) => {
        if (cancelled) return;
        if (!summariesOutcome.ok) {
          setErrorMessage(summariesOutcome.message);
          setState("error");
          return;
        }
        setRows(summariesOutcome.rows);
        setFavorites(favoritesOutcome.ok ? favoritesOutcome.ids : new Set());
        setState("ready");
      });
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  const enabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.recipes_v1
      : isFeatureEnabled(profile, "recipes_v1");

  const tags = useMemo(() => uniqueTags(rows), [rows]);
  const filtered = useMemo(
    () => sortRecipes(filterRecipes(rows, query, activeTags), "name"),
    [rows, query, activeTags],
  );

  if (!session) return <Redirect href={routes.login} />;

  if (!enabled) {
    return (
      <Screen scroll>
        <ScreenHeader title="Recipes" onBack={() => router.back()} />
        <EmptyState
          icon="book-open"
          heading="Recipes are coming soon"
          explanation="This feature is behind a flag while we test it with a small group. Ask us to switch it on for your account."
        />
      </Screen>
    );
  }

  function toggleTag(tag: string) {
    setActiveTags((current) => {
      const lower = tag.toLowerCase();
      const has = current.some((t) => t.toLowerCase() === lower);
      return has
        ? current.filter((t) => t.toLowerCase() !== lower)
        : [...current, tag];
    });
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Recipes" onBack={() => router.back()} />

      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={colors.slate} />
        <RNTextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search recipes"
          placeholderTextColor={colors.mist}
          style={styles.searchInput}
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery("")}
            accessibilityLabel="Clear search"
          >
            <Feather name="x-circle" size={16} color={colors.slate} />
          </Pressable>
        ) : null}
      </View>

      {tags.length > 0 ? (
        <View style={styles.tagRow}>
          {tags.map((tag) => {
            const isActive = activeTags.some(
              (t) => t.toLowerCase() === tag.toLowerCase(),
            );
            return (
              <Pressable
                key={tag}
                onPress={() => toggleTag(tag)}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.tagChip,
                  isActive ? styles.tagChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.tagChipLabel,
                    isActive ? styles.tagChipLabelActive : null,
                  ]}
                >
                  {tag}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {state === "loading" ? (
        <View style={styles.skeletons}>
          <StaticSkeleton rows={3} />
        </View>
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't load recipes</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </GlassCard>
      ) : null}

      {state === "ready" && rows.length === 0 ? (
        <EmptyState
          icon="book-open"
          heading="No recipes yet"
          explanation="The library is empty. Ask an admin to add some — or check back once we've published the first set."
        />
      ) : null}

      {state === "ready" && rows.length > 0 && filtered.length === 0 ? (
        <EmptyState
          icon="search"
          heading="No matches"
          explanation="Try clearing the search or turning off a tag filter."
        />
      ) : null}

      {filtered.length > 0 ? (
        <FlatList
          data={filtered}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              favorited={favorites.has(item.id)}
              onOpen={() => router.push(recipeHref(item.slug))}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      ) : null}
    </Screen>
  );
}

function RecipeCard({
  recipe,
  favorited,
  onOpen,
}: {
  recipe: RecipeSummary;
  favorited: boolean;
  onOpen: () => void;
}) {
  const minutes = totalMinutes(recipe);
  return (
    <Pressable onPress={onOpen} accessibilityRole="button">
      <GlassCard intensity="card" style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{recipe.name}</Text>
          {favorited ? (
            <Feather name="heart" size={18} color={colors.riskHigh} />
          ) : null}
        </View>
        {recipe.description ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {recipe.description}
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          {minutes > 0 ? (
            <Text style={styles.metaText}>{minutes} min</Text>
          ) : null}
          {recipe.servings ? (
            <Text style={styles.metaText}>
              {minutes > 0 ? "· " : ""}serves {recipe.servings}
            </Text>
          ) : null}
        </View>
        {recipe.tags.length > 0 ? (
          <View style={styles.cardTags}>
            {recipe.tags.slice(0, 4).map((tag) => (
              <Text key={tag} style={styles.cardTag}>
                {tag}
              </Text>
            ))}
          </View>
        ) : null}
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.input,
    paddingHorizontal: spacing.base,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.deepNavy,
    padding: 0,
  },
  tagRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.micro,
  },
  tagChip: {
    borderRadius: radius.chip,
    paddingHorizontal: spacing.mdSm,
    paddingVertical: spacing.micro,
    backgroundColor: colors.glassChrome,
  },
  tagChipActive: {
    backgroundColor: colors.primaryBlue,
  },
  tagChipLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.deepNavy,
  },
  tagChipLabelActive: {
    color: colors.white,
  },
  skeletons: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  errorHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.riskHigh,
    marginBottom: spacing.micro,
  },
  errorBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
  },
  card: {
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  cardTitle: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    color: colors.deepNavy,
    flex: 1,
  },
  cardDescription: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginTop: spacing.micro,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.micro,
    marginTop: spacing.sm,
  },
  metaText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.slate,
  },
  cardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.micro,
    marginTop: spacing.sm,
  },
  cardTag: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    color: colors.primaryBlue,
    backgroundColor: colors.glassChrome,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
    overflow: "hidden",
  },
});
