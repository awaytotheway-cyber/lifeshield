import { Image } from "expo-image";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { SecondaryButton } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors, radius, spacing, status } from "@/lib/design-tokens";
import { totalMinutes, type Recipe } from "@/lib/recipes";
import {
  loadFavoriteRecipeIds,
  loadRecipeBySlug,
  toggleRecipeFavorite,
} from "@/lib/recipes-io";
import { fontFamily, typography } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

/** Failure and warning text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

type LoadState = "idle" | "loading" | "ready" | "error";

export default function RecipeDetailScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;
  const recipeSlug = typeof slug === "string" ? slug.trim() : "";

  const [state, setState] = useState<LoadState>("idle");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!recipeSlug || !userId) return;
    setState("loading");
    setErrorMessage(null);
    const [recipeOutcome, favoritesOutcome] = await Promise.all([
      loadRecipeBySlug(recipeSlug),
      loadFavoriteRecipeIds(userId),
    ]);
    if (!recipeOutcome.ok) {
      setErrorMessage(recipeOutcome.message);
      setState("error");
      return;
    }
    if (!recipeOutcome.recipe) {
      setErrorMessage("This recipe wasn't found.");
      setState("error");
      return;
    }
    setRecipe(recipeOutcome.recipe);
    setFavorited(
      favoritesOutcome.ok
        ? favoritesOutcome.ids.has(recipeOutcome.recipe.id)
        : false,
    );
    setState("ready");
  }, [recipeSlug, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!session) return <Redirect href={routes.login} />;
  if (!recipeSlug) return <Redirect href={routes.recipes} />;

  async function onToggleFavorite() {
    if (!recipe || !userId || favoriteBusy) return;
    setFavoriteBusy(true);
    const outcome = await toggleRecipeFavorite(userId, recipe.id, favorited);
    setFavoriteBusy(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't update favorite", outcome.message);
      return;
    }
    setFavorited(outcome.favorited);
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Recipe"
        onBack={() => router.replace(routes.recipes)}
      />

      {state === "loading" ? (
        <ActivityIndicator color={colors.mossDeep} style={styles.spinner} />
      ) : null}

      {state === "error" && errorMessage ? (
        <Surface style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't open this recipe</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <SecondaryButton title="Try again" onPress={() => void refresh()} />
        </Surface>
      ) : null}

      {state === "ready" && recipe ? (
        <RecipeBody
          recipe={recipe}
          favorited={favorited}
          favoriteBusy={favoriteBusy}
          onToggleFavorite={onToggleFavorite}
        />
      ) : null}
    </Screen>
  );
}

function RecipeBody({
  recipe,
  favorited,
  favoriteBusy,
  onToggleFavorite,
}: {
  recipe: Recipe;
  favorited: boolean;
  favoriteBusy: boolean;
  onToggleFavorite: () => void;
}) {
  const minutes = totalMinutes(recipe);
  return (
    <>
      {recipe.image_url ? (
        <Image
          source={{ uri: recipe.image_url }}
          style={styles.image}
          contentFit="cover"
        />
      ) : null}

      <Surface style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{recipe.name}</Text>
          <Pressable
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={favorited ? "Unfavorite" : "Favorite"}
            disabled={favoriteBusy}
            style={styles.favoriteButton}
          >
            <Feather
              name="heart"
              size={24}
              color={favorited ? CLAY : colors.inkSoft}
            />
          </Pressable>
        </View>
        {recipe.description ? (
          <Text style={styles.description}>{recipe.description}</Text>
        ) : null}
        <View style={styles.metaRow}>
          {minutes > 0 ? (
            <Text style={styles.metaChip}>{minutes} min total</Text>
          ) : null}
          {recipe.prep_minutes ? (
            <Text style={styles.metaChip}>prep {recipe.prep_minutes} min</Text>
          ) : null}
          {recipe.cook_minutes ? (
            <Text style={styles.metaChip}>cook {recipe.cook_minutes} min</Text>
          ) : null}
          {recipe.servings ? (
            <Text style={styles.metaChip}>serves {recipe.servings}</Text>
          ) : null}
        </View>
        {recipe.tags.length > 0 ? (
          <View style={styles.tagRow}>
            {recipe.tags.map((tag) => (
              <Text key={tag} style={styles.tag}>
                {tag}
              </Text>
            ))}
          </View>
        ) : null}
      </Surface>

      {recipe.ingredients.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Ingredients</Text>
          {recipe.ingredients.map((ingredient, index) => (
            <Text key={index} style={styles.ingredient}>
              •{" "}
              {[ingredient.amount, ingredient.unit].filter(Boolean).join(" ")}{" "}
              {ingredient.name}
              {ingredient.note ? ` — ${ingredient.note}` : ""}
            </Text>
          ))}
        </View>
      ) : null}

      {recipe.instructions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Instructions</Text>
          {recipe.instructions.map((step) => (
            <View key={`${step.step}-${step.text}`} style={styles.step}>
              <Text style={styles.stepNumber}>{step.step}.</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {hasNutrition(recipe) ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Nutrition (per serving)</Text>
          <View style={styles.nutritionRow}>
            {recipe.nutrition.calories !== undefined ? (
              <NutritionCell
                label="calories"
                value={String(recipe.nutrition.calories)}
              />
            ) : null}
            {recipe.nutrition.protein_g !== undefined ? (
              <NutritionCell
                label="protein"
                value={`${recipe.nutrition.protein_g} g`}
              />
            ) : null}
            {recipe.nutrition.carbs_g !== undefined ? (
              <NutritionCell
                label="carbs"
                value={`${recipe.nutrition.carbs_g} g`}
              />
            ) : null}
            {recipe.nutrition.fat_g !== undefined ? (
              <NutritionCell
                label="fat"
                value={`${recipe.nutrition.fat_g} g`}
              />
            ) : null}
            {recipe.nutrition.fiber_g !== undefined ? (
              <NutritionCell
                label="fiber"
                value={`${recipe.nutrition.fiber_g} g`}
              />
            ) : null}
          </View>
        </View>
      ) : null}
    </>
  );
}

function hasNutrition(recipe: Recipe): boolean {
  const n = recipe.nutrition;
  return (
    n.calories !== undefined ||
    n.protein_g !== undefined ||
    n.carbs_g !== undefined ||
    n.fat_g !== undefined ||
    n.fiber_g !== undefined
  );
}

function NutritionCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.nutritionCell}>
      <Text style={styles.nutritionValue}>{value}</Text>
      <Text style={styles.nutritionLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: {
    marginTop: spacing.md,
  },
  errorCard: {
    marginTop: spacing.md,
  },
  errorHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: CLAY,
    marginBottom: spacing.micro,
  },
  errorBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: radius.surface,
    marginTop: spacing.md,
  },
  headerCard: {
    marginTop: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  // The card title, on the scale: 20, not a one-off 22.
  title: {
    flex: 1,
    ...typography.title,
    color: colors.ink,
  },
  favoriteButton: {
    padding: spacing.sm,
    marginRight: -spacing.sm,
    marginTop: -spacing.sm,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.micro,
    marginTop: spacing.sm,
  },
  metaChip: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.micro,
    marginTop: spacing.sm,
  },
  tag: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    color: colors.mossDeep,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  section: {
    marginTop: spacing.md,
  },
  // A section header is an 11px micro-caps label, not an 18px bold title:
  // a column of those is what made short section names read as one block.
  // `inkMuted`, not `inkFaint` — at 11px only inkMuted clears AA.
  sectionHeading: {
    marginBottom: spacing.sm,
    ...typography.micro,
    color: colors.inkMuted,
  },
  ingredient: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.ink,
    marginBottom: spacing.micro,
  },
  step: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  stepNumber: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 14,
    color: colors.mossDeep,
    minWidth: 24,
  },
  stepText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.ink,
  },
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  nutritionCell: {
    minWidth: 80,
    padding: spacing.sm,
    borderRadius: radius.surface,
    backgroundColor: colors.white,
  },
  nutritionValue: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.ink,
  },
  nutritionLabel: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
