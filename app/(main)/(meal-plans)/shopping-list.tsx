import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { loadMealPlanById, type MealPlanRow } from "@/lib/meal-plans-io";
import { loadRecipesByIds } from "@/lib/recipes-io";
import {
  aggregateIngredients,
  distinctProductIds,
  matchIngredientsToProducts,
  type MatchedItem,
  type ProductLite,
  type ShoppingList,
  type UnmatchedItem,
} from "@/lib/shopping-list";
import { addToCart, loadActiveProducts } from "@/lib/store";
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

export default function ShoppingListScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;
  const planId = typeof id === "string" ? id.trim() : "";

  const [state, setState] = useState<LoadState>("idle");
  const [plan, setPlan] = useState<MealPlanRow | null>(null);
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (!planId) return;
    setState("loading");
    setErrorMessage(null);

    const planOutcome = await loadMealPlanById(planId);
    if (!planOutcome.ok) {
      setErrorMessage(planOutcome.message);
      setState("error");
      return;
    }
    if (!planOutcome.row) {
      setErrorMessage("This meal plan wasn't found.");
      setState("error");
      return;
    }
    setPlan(planOutcome.row);

    const uniqueRecipeIds = Array.from(
      new Set(
        planOutcome.row.plan.days.flatMap((day) =>
          day.meals.map((meal) => meal.recipe_id),
        ),
      ),
    );

    if (uniqueRecipeIds.length === 0) {
      setShoppingList({ matched: [], unmatched: [] });
      setState("ready");
      return;
    }

    const [recipesOutcome, productsOutcome] = await Promise.all([
      loadRecipesByIds(uniqueRecipeIds),
      loadActiveProducts(),
    ]);

    if (!recipesOutcome.ok) {
      setErrorMessage(recipesOutcome.message);
      setState("error");
      return;
    }

    // loadActiveProducts returns { ok: false } when the catalog is empty; we
    // treat that as "no matches" rather than as an error — the unmatched
    // section still tells the user what to buy.
    const products: ProductLite[] = productsOutcome.ok
      ? productsOutcome.products.map((product) => ({
          id: product.id,
          plain_name: product.plain_name,
          clinical_name: product.clinical_name,
          price: product.price,
          currency: product.currency ?? "INR",
          active: product.active !== false,
        }))
      : [];

    const ingredients = aggregateIngredients(
      recipesOutcome.rows.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        ingredients: recipe.ingredients,
      })),
    );
    setShoppingList(matchIngredientsToProducts(ingredients, products));
    setState("ready");
  }, [planId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const productIdsToAdd = useMemo(() => {
    if (!shoppingList) return [];
    return distinctProductIds(shoppingList.matched).filter(
      (id) => !addedIds.has(id),
    );
  }, [shoppingList, addedIds]);

  if (!session) return <Redirect href={routes.login} />;
  if (!planId) return <Redirect href={routes.mealPlans} />;

  async function onAddAll() {
    if (!userId || productIdsToAdd.length === 0 || addingAll) return;
    setAddingAll(true);
    const failures: string[] = [];
    for (const productId of productIdsToAdd) {
      const outcome = await addToCart(userId, productId);
      if (outcome.ok) {
        setAddedIds((current) => new Set(current).add(productId));
      } else {
        failures.push(outcome.message);
      }
    }
    setAddingAll(false);
    if (failures.length > 0) {
      Alert.alert(
        "Some items didn't add",
        failures.slice(0, 3).join("\n\n"),
      );
    }
  }

  async function onAddOne(productId: string) {
    if (!userId || addedIds.has(productId)) return;
    const outcome = await addToCart(userId, productId);
    if (!outcome.ok) {
      Alert.alert("Couldn't add to cart", outcome.message);
      return;
    }
    setAddedIds((current) => new Set(current).add(productId));
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Shopping list"
        onBack={() => router.back()}
      />

      {state === "loading" ? (
        <ActivityIndicator color={colors.primaryBlue} style={styles.spinner} />
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't build the list</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <SecondaryButton title="Try again" onPress={() => void refresh()} />
        </GlassCard>
      ) : null}

      {state === "ready" && plan && shoppingList ? (
        <ShoppingBody
          plan={plan}
          shoppingList={shoppingList}
          onAddAll={onAddAll}
          onAddOne={onAddOne}
          addingAll={addingAll}
          addedIds={addedIds}
          productIdsToAdd={productIdsToAdd}
          onOpenCart={() => router.push(routes.storeCart)}
        />
      ) : null}
    </Screen>
  );
}

function ShoppingBody({
  plan,
  shoppingList,
  onAddAll,
  onAddOne,
  addingAll,
  addedIds,
  productIdsToAdd,
  onOpenCart,
}: {
  plan: MealPlanRow;
  shoppingList: ShoppingList;
  onAddAll: () => void;
  onAddOne: (productId: string) => void;
  addingAll: boolean;
  addedIds: Set<string>;
  productIdsToAdd: string[];
  onOpenCart: () => void;
}) {
  const totalIngredients =
    shoppingList.matched.length + shoppingList.unmatched.length;

  if (totalIngredients === 0) {
    return (
      <EmptyState
        icon="shopping-cart"
        heading="No ingredients to list"
        explanation="The recipes in this plan don't have ingredient rows yet. Ask an admin to fill them in."
      />
    );
  }

  return (
    <>
      <GlassCard intensity="card" style={styles.summary}>
        <Text style={styles.summaryTitle}>{plan.title}</Text>
        <Text style={styles.summaryMeta}>
          {shoppingList.matched.length} in store · {shoppingList.unmatched.length}{" "}
          to source elsewhere
        </Text>
      </GlassCard>

      {shoppingList.matched.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Available in the store</Text>
            <SecondaryButton
              title="Open cart"
              onPress={onOpenCart}
            />
          </View>

          {productIdsToAdd.length > 0 ? (
            <PrimaryButton
              title={`Add ${productIdsToAdd.length} to cart`}
              loading={addingAll}
              onPress={onAddAll}
            />
          ) : (
            <Text style={styles.helper}>
              All matched items are already in your cart.
            </Text>
          )}

          <FlatList
            data={shoppingList.matched}
            scrollEnabled={false}
            keyExtractor={(item, index) => `${item.product.id}-${index}`}
            renderItem={({ item }) => (
              <MatchedRow
                item={item}
                added={addedIds.has(item.product.id)}
                onAdd={() => onAddOne(item.product.id)}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        </View>
      ) : null}

      {shoppingList.unmatched.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Buy elsewhere</Text>
          <Text style={styles.helper}>
            Nothing in the store matches these ingredients yet — grab them
            from your usual shop.
          </Text>
          <FlatList
            data={shoppingList.unmatched}
            scrollEnabled={false}
            keyExtractor={(item, index) => `${item.ingredient.key}-${index}`}
            renderItem={({ item }) => <UnmatchedRow item={item} />}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          />
        </View>
      ) : null}
    </>
  );
}

function MatchedRow({
  item,
  added,
  onAdd,
}: {
  item: MatchedItem;
  added: boolean;
  onAdd: () => void;
}) {
  return (
    <GlassCard intensity="card" style={styles.card}>
      <Text style={styles.ingredient}>{item.ingredient.display_name}</Text>
      <Text style={styles.productLine}>
        → {item.product.plain_name} · {item.product.currency}{" "}
        {item.product.price}
      </Text>
      <Text style={styles.meta}>
        used in {formatRecipeList(item.ingredient.used_in_recipes)} ·{" "}
        {matchKindLabel(item.match_kind)}
      </Text>
      {added ? (
        <Text style={styles.addedLabel}>Added to cart</Text>
      ) : (
        <SecondaryButton title="Add" onPress={onAdd} />
      )}
    </GlassCard>
  );
}

function UnmatchedRow({ item }: { item: UnmatchedItem }) {
  return (
    <GlassCard intensity="card" style={styles.card}>
      <Text style={styles.ingredient}>{item.ingredient.display_name}</Text>
      <Text style={styles.meta}>
        used in {formatRecipeList(item.ingredient.used_in_recipes)}
      </Text>
      {item.ingredient.amounts.length > 0 ? (
        <Text style={styles.meta}>
          amounts: {item.ingredient.amounts.join(", ")}
        </Text>
      ) : null}
    </GlassCard>
  );
}

function formatRecipeList(names: readonly string[]): string {
  if (names.length === 0) return "—";
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

function matchKindLabel(kind: MatchedItem["match_kind"]): string {
  switch (kind) {
    case "exact":
      return "exact name match";
    case "product_contains":
      return "product name contains this ingredient";
    case "ingredient_contains":
      return "ingredient name contains this product";
    default:
      return kind;
  }
}

const styles = StyleSheet.create({
  spinner: { marginTop: spacing.md },
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
  summary: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  summaryTitle: {
    fontFamily: fontFamily.display,
    fontSize: 20,
    color: colors.deepNavy,
  },
  summaryMeta: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.slate,
    marginTop: spacing.micro,
  },
  section: { marginTop: spacing.md },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    color: colors.deepNavy,
  },
  helper: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  card: {
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  ingredient: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 15,
    color: colors.deepNavy,
  },
  productLine: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.charcoal,
    marginTop: spacing.micro,
  },
  meta: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.slate,
    marginTop: spacing.micro,
  },
  addedLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.riskLow,
    marginTop: spacing.sm,
  },
});
