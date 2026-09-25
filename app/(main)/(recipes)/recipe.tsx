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
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { totalMinutes, type Recipe } from "@/lib/recipes";
import {
  loadFavoriteRecipeIds,
  loadRecipeBySlug,
  toggleRecipeFavorite,
} from "@/lib/recipes-io";
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

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
        <ActivityIndicator color={colors.primaryBlue} style={styles.spinner} />
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't open this recipe</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <SecondaryButton title="Try again" onPress={() => void refresh()} />
        </GlassCard>
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

      <GlassCard intensity="card" style={styles.headerCard}>
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
              color={favorited ? colors.riskHigh : colors.slate}
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
      </GlassCard>

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
    marginBottom: spacing.sm,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: radius.card,
    marginTop: spacing.md,
  },
  headerCard: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.deepNavy,
    flex: 1,
  },
  favoriteButton: {
    padding: spacing.sm,
    marginRight: -spacing.sm,
    marginTop: -spacing.sm,
  },
  description: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
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
    color: colors.deepNavy,
    backgroundColor: colors.glassChrome,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
    borderRadius: radius.chip,
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
    color: colors.primaryBlue,
    backgroundColor: colors.glassChrome,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.chip,
    overflow: "hidden",
  },
  section: {
    marginTop: spacing.md,
  },
  sectionHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    color: colors.deepNavy,
    marginBottom: spacing.sm,
  },
  ingredient: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.charcoal,
    marginBottom: spacing.micro,
  },
  step: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  stepNumber: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 14,
    color: colors.primaryBlue,
    minWidth: 24,
  },
  stepText: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.charcoal,
  },
  nutritionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  nutritionCell: {
    minWidth: 80,
    padding: spacing.sm,
    borderRadius: radius.card,
    backgroundColor: colors.glassChrome,
  },
  nutritionValue: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.deepNavy,
  },
  nutritionLabel: {
    fontFamily: fontFamily.body,
    fontSize: 11,
    color: colors.slate,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
