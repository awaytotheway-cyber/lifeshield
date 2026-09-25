import { Redirect, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  ALL_SLOTS,
  generateMealPlan,
  type MealPlanPayload,
  type MealPlanPreferences,
  type MealSlot,
} from "@/lib/meal-planner";
import { createMealPlan } from "@/lib/meal-plans-io";
import { uniqueTags, type RecipeSummary } from "@/lib/recipes";
import { loadRecipeSummaries } from "@/lib/recipes-io";
import { fontFamily } from "@/lib/typography";
import { mealPlanHref, routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function todayYmd(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDaysYmd(source: string, days: number): string {
  const parsed = new Date(`${source}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return source;
  parsed.setDate(parsed.getDate() + days);
  return todayYmd(parsed);
}

export default function NewMealPlanScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [recipesLoading, setRecipesLoading] = useState(true);
  const [recipesError, setRecipesError] = useState<string | null>(null);

  const [title, setTitle] = useState("This week");
  const [startDate, setStartDate] = useState(todayYmd());
  const [endDate, setEndDate] = useState(addDaysYmd(todayYmd(), 6));
  const [slots, setSlots] = useState<MealSlot[]>([
    "breakfast",
    "lunch",
    "dinner",
  ]);
  const [avoidTags, setAvoidTags] = useState<string[]>([]);
  const [preview, setPreview] = useState<MealPlanPayload | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadRecipeSummaries().then((outcome) => {
      if (cancelled) return;
      setRecipesLoading(false);
      if (outcome.ok) {
        setRecipes(outcome.rows);
      } else {
        setRecipesError(outcome.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableTags = useMemo(() => uniqueTags(recipes), [recipes]);

  if (!session) return <Redirect href={routes.login} />;

  function toggleSlot(slot: MealSlot) {
    setSlots((current) =>
      current.includes(slot)
        ? current.filter((s) => s !== slot)
        : [...current, slot],
    );
    setPreview(null);
  }

  function toggleAvoidTag(tag: string) {
    setAvoidTags((current) => {
      const lower = tag.toLowerCase();
      const has = current.some((t) => t.toLowerCase() === lower);
      return has
        ? current.filter((t) => t.toLowerCase() !== lower)
        : [...current, tag];
    });
    setPreview(null);
  }

  function onGenerate() {
    setPreviewError(null);
    const preferences: MealPlanPreferences = {
      slots,
      avoid_tags: avoidTags,
    };
    const outcome = generateMealPlan({
      recipes,
      preferences,
      start_date: startDate,
      end_date: endDate,
    });
    if (!outcome.ok) {
      setPreview(null);
      setPreviewError(outcome.error.message);
      return;
    }
    setPreview(outcome.plan);
  }

  async function onSave() {
    if (!preview || !userId) return;
    if (!title.trim()) {
      Alert.alert("Add a title", "Give this plan a short name first.");
      return;
    }
    setSaving(true);
    const outcome = await createMealPlan(userId, {
      title: title.trim(),
      start_date: startDate,
      end_date: endDate,
      plan: preview,
      preferences: { slots, avoid_tags: avoidTags },
    });
    setSaving(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't save meal plan", outcome.message);
      return;
    }
    router.replace(mealPlanHref(outcome.row.id));
  }

  return (
    <Screen scroll>
      <ScreenHeader title="New meal plan" onBack={() => router.back()} />

      {recipesLoading ? (
        <ActivityIndicator color={colors.primaryBlue} style={styles.spinner} />
      ) : null}

      {!recipesLoading && recipesError ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't load recipes</Text>
          <Text style={styles.errorBody}>{recipesError}</Text>
        </GlassCard>
      ) : null}

      {!recipesLoading && !recipesError && recipes.length === 0 ? (
        <EmptyState
          icon="book-open"
          heading="Add recipes first"
          explanation="The recipe library is empty, so there's nothing to plan. Ask an admin to publish some."
        />
      ) : null}

      {!recipesLoading && recipes.length > 0 ? (
        <>
          <TextInput
            label="Title"
            placeholder="This week"
            value={title}
            onChangeText={(next) => {
              setTitle(next);
              setPreview(null);
            }}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <TextInput
                label="Start date"
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChangeText={(next) => {
                  setStartDate(next);
                  setPreview(null);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextInput
                label="End date"
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChangeText={(next) => {
                  setEndDate(next);
                  setPreview(null);
                }}
              />
            </View>
          </View>

          <Text style={styles.label}>Meal slots</Text>
          <View style={styles.chipRow}>
            {ALL_SLOTS.map((slot) => {
              const active = slots.includes(slot);
              return (
                <Pressable
                  key={slot}
                  onPress={() => toggleSlot(slot)}
                  style={[styles.chip, active ? styles.chipActive : null]}
                >
                  <Text
                    style={[
                      styles.chipLabel,
                      active ? styles.chipLabelActive : null,
                    ]}
                  >
                    {SLOT_LABELS[slot]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {availableTags.length > 0 ? (
            <>
              <Text style={styles.label}>Avoid tags</Text>
              <Text style={styles.helper}>
                Recipes with any of these tags won't appear in the plan.
              </Text>
              <View style={styles.chipRow}>
                {availableTags.map((tag) => {
                  const active = avoidTags.some(
                    (t) => t.toLowerCase() === tag.toLowerCase(),
                  );
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleAvoidTag(tag)}
                      style={[
                        styles.chip,
                        active ? styles.chipAvoidActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipLabel,
                          active ? styles.chipLabelActive : null,
                        ]}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {previewError ? (
            <Text style={styles.error}>{previewError}</Text>
          ) : null}

          <View style={styles.actions}>
            <SecondaryButton title="Generate preview" onPress={onGenerate} />
            {preview ? (
              <PrimaryButton
                title="Save plan"
                loading={saving}
                onPress={onSave}
              />
            ) : null}
          </View>

          {preview ? <PreviewList payload={preview} /> : null}
        </>
      ) : null}
    </Screen>
  );
}

function PreviewList({ payload }: { payload: MealPlanPayload }) {
  return (
    <View style={styles.preview}>
      <Text style={styles.previewHeading}>Preview</Text>
      {payload.days.length === 0 ? (
        <Text style={styles.helper}>No days generated.</Text>
      ) : null}
      {payload.days.map((day) => (
        <GlassCard key={day.date} intensity="card" style={styles.previewCard}>
          <Text style={styles.previewDate}>{day.date}</Text>
          {day.meals.length === 0 ? (
            <Text style={styles.helper}>No meals planned.</Text>
          ) : (
            day.meals.map((meal) => (
              <View key={`${meal.slot}-${meal.recipe_id}`} style={styles.mealRow}>
                <Text style={styles.mealSlot}>{SLOT_LABELS[meal.slot]}</Text>
                <Text style={styles.mealName}>{meal.recipe_name}</Text>
              </View>
            ))
          )}
        </GlassCard>
      ))}
    </View>
  );
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
  },
  row: { flexDirection: "row", gap: spacing.sm },
  label: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.deepNavy,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  helper: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.micro,
  },
  chip: {
    borderRadius: radius.chip,
    paddingHorizontal: spacing.mdSm,
    paddingVertical: spacing.micro,
    backgroundColor: colors.glassChrome,
  },
  chipActive: { backgroundColor: colors.primaryBlue },
  chipAvoidActive: { backgroundColor: colors.riskHigh },
  chipLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.deepNavy,
  },
  chipLabelActive: { color: colors.white },
  error: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.riskHigh,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    flexWrap: "wrap",
  },
  preview: { marginTop: spacing.md, gap: spacing.sm },
  previewHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    color: colors.deepNavy,
    marginBottom: spacing.sm,
  },
  previewCard: {
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  previewDate: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.primaryBlue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.micro,
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
    fontSize: 14,
    color: colors.charcoal,
  },
});
