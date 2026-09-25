import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import {
  DangerButton,
  IconButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  appendDay,
  removeLastDay,
  removeMeal,
  swapMeal,
  summarizePlan,
  type MealPlanPayload,
  type MealSlot,
} from "@/lib/meal-planner";
import {
  deleteMealPlan,
  loadMealPlanById,
  updateMealPlanPayload,
  updateMealPlanStatus,
  type MealPlanRow,
  type MealPlanStatus,
} from "@/lib/meal-plans-io";
import { loadRecipeSummaries } from "@/lib/recipes-io";
import type { RecipeSummary } from "@/lib/recipes";
import { fontFamily } from "@/lib/typography";
import {
  mealPlanShoppingListHref,
  recipeHref,
  routes,
} from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default function MealPlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const session = useAuthStore((state) => state.session);
  const planId = typeof id === "string" ? id.trim() : "";

  const [state, setState] = useState<LoadState>("idle");
  const [row, setRow] = useState<MealPlanRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [swapContext, setSwapContext] = useState<{
    date: string;
    slot: MealSlot;
  } | null>(null);

  const refresh = useCallback(async () => {
    if (!planId) return;
    setState("loading");
    setErrorMessage(null);
    const outcome = await loadMealPlanById(planId);
    if (!outcome.ok) {
      setErrorMessage(outcome.message);
      setState("error");
      return;
    }
    if (!outcome.row) {
      setErrorMessage("This meal plan wasn't found. It may have been deleted.");
      setState("error");
      return;
    }
    setRow(outcome.row);
    setState("ready");
  }, [planId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Recipe library is only needed for the editing UI; fetch lazily on mount
  // so a read-only view of a plan doesn't wait on it. A failed fetch just
  // leaves the swap picker showing the "no candidates" state.
  useEffect(() => {
    let cancelled = false;
    void loadRecipeSummaries().then((outcome) => {
      if (cancelled) return;
      if (outcome.ok) setRecipes(outcome.rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!session) return <Redirect href={routes.login} />;
  if (!planId) return <Redirect href={routes.mealPlans} />;

  async function persistPayload(next: MealPlanPayload) {
    if (!row) return;
    // Optimistic update first — the picker closes immediately even if the
    // write races. On failure we revert and surface the error.
    const previous = row.plan;
    setRow({ ...row, plan: next });
    const outcome = await updateMealPlanPayload(row.id, next);
    if (!outcome.ok) {
      setRow({ ...row, plan: previous });
      Alert.alert("Couldn't save change", outcome.message);
      return;
    }
    setRow(outcome.row);
  }

  async function onSwap(pick: RecipeSummary) {
    if (!row || !swapContext) return;
    const next = swapMeal(row.plan, swapContext.date, swapContext.slot, pick);
    setSwapContext(null);
    await persistPayload(next);
  }

  async function onRemoveMeal(date: string, slot: MealSlot) {
    if (!row) return;
    await persistPayload(removeMeal(row.plan, date, slot));
  }

  async function onAddDay() {
    if (!row) return;
    const outcome = appendDay(
      row.plan,
      recipes,
      row.preferences,
      row.end_date,
    );
    if (!outcome.ok) {
      Alert.alert("Couldn't add a day", outcome.error.message);
      return;
    }
    await persistPayload(outcome.plan);
  }

  async function onRemoveLastDay() {
    if (!row) return;
    if (row.plan.days.length === 0) return;
    Alert.alert("Remove the last day?", "Its meals will be dropped.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => void persistPayload(removeLastDay(row.plan)),
      },
    ]);
  }

  async function onSetStatus(next: MealPlanStatus) {
    if (!row || busy) return;
    setBusy(true);
    const outcome = await updateMealPlanStatus(row.id, next);
    setBusy(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't update meal plan", outcome.message);
      return;
    }
    setRow(outcome.row);
  }

  async function onDelete() {
    if (!row || busy) return;
    Alert.alert(
      "Delete this meal plan?",
      "It won't appear in your list anymore.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            const outcome = await deleteMealPlan(row.id);
            setBusy(false);
            if (!outcome.ok) {
              Alert.alert("Couldn't delete", outcome.message);
              return;
            }
            router.replace(routes.mealPlans);
          },
        },
      ],
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title="Meal plan"
        onBack={() => router.replace(routes.mealPlans)}
      />

      {state === "loading" ? (
        <ActivityIndicator color={colors.primaryBlue} style={styles.spinner} />
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't open this plan</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
          <SecondaryButton title="Try again" onPress={() => void refresh()} />
        </GlassCard>
      ) : null}

      {state === "ready" && row ? (
        <PlanBody
          row={row}
          busy={busy}
          onSetStatus={onSetStatus}
          onDelete={onDelete}
          onOpenRecipe={(slug) => router.push(recipeHref(slug))}
          onOpenShoppingList={() =>
            router.push(mealPlanShoppingListHref(row.id))
          }
          onEditMeal={(date, slot) => setSwapContext({ date, slot })}
          onRemoveMeal={onRemoveMeal}
          onAddDay={onAddDay}
          onRemoveLastDay={onRemoveLastDay}
        />
      ) : null}

      <SwapPickerModal
        context={swapContext}
        recipes={recipes}
        onClose={() => setSwapContext(null)}
        onPick={onSwap}
      />
    </Screen>
  );
}

function SwapPickerModal({
  context,
  recipes,
  onClose,
  onPick,
}: {
  context: { date: string; slot: MealSlot } | null;
  recipes: RecipeSummary[];
  onClose: () => void;
  onPick: (recipe: RecipeSummary) => void;
}) {
  const candidates = useMemo(() => {
    if (!context) return [];
    // Prefer active recipes tagged for this slot; fall back to all active.
    const active = recipes.filter((recipe) => recipe.active);
    const bucket = active.filter((recipe) =>
      recipe.tags.some((tag) => tag.toLowerCase() === context.slot),
    );
    return (bucket.length > 0 ? bucket : active).slice(0, 100);
  }, [context, recipes]);

  return (
    <Modal
      transparent
      visible={context !== null}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {context
                ? `Swap ${SLOT_LABELS[context.slot]} · ${context.date}`
                : "Swap meal"}
            </Text>
            <IconButton
              icon="x"
              accessibilityLabel="Close"
              onPress={onClose}
            />
          </View>
          {candidates.length === 0 ? (
            <Text style={styles.helper}>
              No recipe candidates available for this slot.
            </Text>
          ) : (
            <ScrollView style={styles.modalScroll}>
              {candidates.map((recipe) => (
                <Pressable
                  key={recipe.id}
                  onPress={() => onPick(recipe)}
                  style={styles.candidateRow}
                >
                  <Text style={styles.candidateName}>{recipe.name}</Text>
                  {recipe.tags.length > 0 ? (
                    <Text style={styles.candidateTags}>
                      {recipe.tags.slice(0, 4).join(" · ")}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PlanBody({
  row,
  busy,
  onSetStatus,
  onDelete,
  onOpenRecipe,
  onOpenShoppingList,
  onEditMeal,
  onRemoveMeal,
  onAddDay,
  onRemoveLastDay,
}: {
  row: MealPlanRow;
  busy: boolean;
  onSetStatus: (next: MealPlanStatus) => void;
  onDelete: () => void;
  onOpenRecipe: (slug: string) => void;
  onOpenShoppingList: () => void;
  onEditMeal: (date: string, slot: MealSlot) => void;
  onRemoveMeal: (date: string, slot: MealSlot) => void;
  onAddDay: () => void;
  onRemoveLastDay: () => void;
}) {
  const summary = summarizePlan(row.plan);
  return (
    <>
      <GlassCard intensity="card" style={styles.summary}>
        <Text style={styles.range}>
          {row.start_date} → {row.end_date}
        </Text>
        <Text style={styles.title}>{row.title}</Text>
        <Text style={styles.meta}>
          {summary.day_count} {summary.day_count === 1 ? "day" : "days"} ·{" "}
          {summary.meal_count} meals · {summary.unique_recipe_count} recipes
        </Text>
        <Text style={styles.meta}>Status: {statusLabel(row.status)}</Text>
        {row.clinician_reviewed ? (
          <View style={styles.reviewedChip}>
            <Text style={styles.reviewedChipText}>Reviewed</Text>
          </View>
        ) : null}
      </GlassCard>

      {row.clinician_reviewed && row.reviewer_note ? (
        <GlassCard intensity="card" style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>
            Reviewer note{row.reviewed_by ? ` · ${row.reviewed_by}` : ""}
          </Text>
          <Text style={styles.reviewBody}>{row.reviewer_note}</Text>
        </GlassCard>
      ) : null}

      <View style={styles.actionRow}>
        <PrimaryButton
          title="Shopping list"
          disabled={busy || summary.meal_count === 0}
          onPress={onOpenShoppingList}
        />
        {row.status === "active" ? (
          <>
            <SecondaryButton
              title="Mark complete"
              disabled={busy}
              onPress={() => onSetStatus("completed")}
            />
            <SecondaryButton
              title="Archive"
              disabled={busy}
              onPress={() => onSetStatus("archived")}
            />
          </>
        ) : (
          <SecondaryButton
            title="Reactivate"
            disabled={busy}
            onPress={() => onSetStatus("active")}
          />
        )}
        <DangerButton title="Delete" disabled={busy} onPress={onDelete} />
      </View>

      {row.plan.days.map((day) => (
        <GlassCard key={day.date} intensity="card" style={styles.dayCard}>
          <Text style={styles.dayDate}>{day.date}</Text>
          {day.meals.length === 0 ? (
            <Text style={styles.empty}>No meals planned for this day.</Text>
          ) : (
            day.meals.map((meal) => (
              <View
                key={`${meal.slot}-${meal.recipe_id}`}
                style={styles.mealRow}
              >
                <Text style={styles.mealSlot}>{SLOT_LABELS[meal.slot]}</Text>
                <Pressable
                  onPress={() => onOpenRecipe(meal.recipe_slug)}
                  accessibilityRole="button"
                  style={styles.mealNameWrap}
                >
                  <Text style={styles.mealName}>{meal.recipe_name}</Text>
                </Pressable>
                <Pressable
                  onPress={() => onEditMeal(day.date, meal.slot)}
                  accessibilityLabel={`Swap ${SLOT_LABELS[meal.slot]}`}
                  disabled={busy}
                  style={styles.iconHit}
                >
                  <Feather
                    name="refresh-cw"
                    size={16}
                    color={colors.primaryBlue}
                  />
                </Pressable>
                <Pressable
                  onPress={() => onRemoveMeal(day.date, meal.slot)}
                  accessibilityLabel={`Remove ${SLOT_LABELS[meal.slot]}`}
                  disabled={busy}
                  style={styles.iconHit}
                >
                  <Feather name="x" size={16} color={colors.riskHigh} />
                </Pressable>
              </View>
            ))
          )}
        </GlassCard>
      ))}

      <View style={styles.dayActions}>
        <SecondaryButton
          title="Add day"
          disabled={busy}
          onPress={onAddDay}
        />
        {row.plan.days.length > 0 ? (
          <SecondaryButton
            title="Remove last day"
            disabled={busy}
            onPress={onRemoveLastDay}
          />
        ) : null}
      </View>
    </>
  );
}

function statusLabel(status: MealPlanStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "completed":
      return "Completed";
    case "archived":
      return "Archived";
    default:
      return status;
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
  range: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.primaryBlue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.micro,
  },
  title: {
    fontFamily: fontFamily.display,
    fontSize: 22,
    color: colors.deepNavy,
    marginBottom: spacing.micro,
  },
  meta: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.slate,
    marginTop: spacing.micro,
  },
  reviewedChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.riskLow,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginTop: spacing.sm,
  },
  reviewedChipText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 11,
    color: colors.white,
  },
  reviewCard: {
    marginTop: spacing.sm,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  reviewLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.primaryBlue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.micro,
  },
  reviewBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.charcoal,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  dayCard: {
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
    marginBottom: spacing.sm,
  },
  dayDate: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 14,
    color: colors.primaryBlue,
    marginBottom: spacing.sm,
  },
  empty: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.micro,
  },
  mealSlot: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.slate,
    minWidth: 80,
  },
  mealNameWrap: {
    flex: 1,
  },
  mealName: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.deepNavy,
    textDecorationLine: "underline",
  },
  iconHit: {
    padding: spacing.micro,
  },
  dayActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  helper: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(11,30,77,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.base,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "80%",
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.base,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  modalTitle: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.deepNavy,
    flex: 1,
  },
  modalScroll: {
    maxHeight: 400,
  },
  candidateRow: {
    paddingVertical: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  candidateName: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.deepNavy,
  },
  candidateTags: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.slate,
    marginTop: 2,
  },
});
