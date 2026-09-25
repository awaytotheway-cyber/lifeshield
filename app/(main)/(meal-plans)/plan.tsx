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

import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
} from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { summarizePlan, type MealSlot } from "@/lib/meal-planner";
import {
  deleteMealPlan,
  loadMealPlanById,
  updateMealPlanStatus,
  type MealPlanRow,
  type MealPlanStatus,
} from "@/lib/meal-plans-io";
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

  if (!session) return <Redirect href={routes.login} />;
  if (!planId) return <Redirect href={routes.mealPlans} />;

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
        />
      ) : null}
    </Screen>
  );
}

function PlanBody({
  row,
  busy,
  onSetStatus,
  onDelete,
  onOpenRecipe,
  onOpenShoppingList,
}: {
  row: MealPlanRow;
  busy: boolean;
  onSetStatus: (next: MealPlanStatus) => void;
  onDelete: () => void;
  onOpenRecipe: (slug: string) => void;
  onOpenShoppingList: () => void;
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
      </GlassCard>

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
              <Pressable
                key={`${meal.slot}-${meal.recipe_id}`}
                onPress={() => onOpenRecipe(meal.recipe_slug)}
                accessibilityRole="button"
                style={styles.mealRow}
              >
                <Text style={styles.mealSlot}>{SLOT_LABELS[meal.slot]}</Text>
                <Text style={styles.mealName}>{meal.recipe_name}</Text>
              </Pressable>
            ))
          )}
        </GlassCard>
      ))}
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
  mealName: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.deepNavy,
    textDecorationLine: "underline",
  },
});
