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
import { Surface } from "@/components/ui/Surface";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { TextInput } from "@/components/ui/TextInput";
import { colors, radius, spacing, status } from "@/lib/design-tokens";
import type { Goal } from "@/lib/goals";
import { loadGoals } from "@/lib/goals-io";
import {
  ALL_SLOTS,
  generateMealPlan,
  goalToPreferTags,
  type MealPlanPayload,
  type MealPlanPreferences,
  type MealSlot,
} from "@/lib/meal-planner";
import { createMealPlan } from "@/lib/meal-plans-io";
import { uniqueTags, type RecipeSummary } from "@/lib/recipes";
import { loadRecipeSummaries } from "@/lib/recipes-io";
import { fontFamily, typography } from "@/lib/typography";
import { mealPlanHref, routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

/** Failure and warning text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

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
  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);

  const [title, setTitle] = useState("This week");
  const [startDate, setStartDate] = useState(todayYmd());
  const [endDate, setEndDate] = useState(addDaysYmd(todayYmd(), 6));
  const [slots, setSlots] = useState<MealSlot[]>([
    "breakfast",
    "lunch",
    "dinner",
  ]);
  const [avoidTags, setAvoidTags] = useState<string[]>([]);
  const [preferTags, setPreferTags] = useState<string[]>([]);
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

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void loadGoals(userId).then((outcome) => {
      if (cancelled) return;
      if (outcome.ok) {
        setActiveGoals(outcome.rows.filter((goal) => goal.status === "active"));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const availableTags = useMemo(() => uniqueTags(recipes), [recipes]);

  // Goals with a mappable tag AND at least one recipe in the library carrying
  // that tag — no point offering a chip that would filter to zero recipes.
  const goalSuggestions = useMemo(() => {
    if (activeGoals.length === 0 || availableTags.length === 0) return [];
    const libraryTagsLower = new Set(
      availableTags.map((tag) => tag.toLowerCase()),
    );
    return activeGoals
      .map((goal) => {
        const derived = goalToPreferTags(goal).filter((tag) =>
          libraryTagsLower.has(tag.toLowerCase()),
        );
        return { goal, tags: derived };
      })
      .filter((entry) => entry.tags.length > 0);
  }, [activeGoals, availableTags]);

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
    // A tag can't be both preferred and avoided; drop from prefer if it was.
    setPreferTags((current) =>
      current.filter((t) => t.toLowerCase() !== tag.toLowerCase()),
    );
    setPreview(null);
  }

  function togglePreferTag(tag: string) {
    setPreferTags((current) => {
      const lower = tag.toLowerCase();
      const has = current.some((t) => t.toLowerCase() === lower);
      return has
        ? current.filter((t) => t.toLowerCase() !== lower)
        : [...current, tag];
    });
    setAvoidTags((current) =>
      current.filter((t) => t.toLowerCase() !== tag.toLowerCase()),
    );
    setPreview(null);
  }

  function applyGoalTags(tags: readonly string[]) {
    if (tags.length === 0) return;
    setPreferTags((current) => {
      const lowered = new Set(current.map((t) => t.toLowerCase()));
      const merged = [...current];
      for (const tag of tags) {
        if (!lowered.has(tag.toLowerCase())) {
          merged.push(tag);
          lowered.add(tag.toLowerCase());
        }
      }
      return merged;
    });
    // A goal tag can't also be avoided.
    setAvoidTags((current) => {
      const suggested = new Set(tags.map((t) => t.toLowerCase()));
      return current.filter((t) => !suggested.has(t.toLowerCase()));
    });
    setPreview(null);
  }

  function onGenerate() {
    setPreviewError(null);
    const preferences: MealPlanPreferences = {
      slots,
      avoid_tags: avoidTags,
      prefer_tags: preferTags,
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
      preferences: {
        slots,
        avoid_tags: avoidTags,
        prefer_tags: preferTags,
      },
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
        <ActivityIndicator color={colors.mossDeep} style={styles.spinner} />
      ) : null}

      {!recipesLoading && recipesError ? (
        <Surface style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't load recipes</Text>
          <Text style={styles.errorBody}>{recipesError}</Text>
        </Surface>
      ) : null}

      {!recipesLoading && !recipesError && recipes.length === 0 ? (
        <EmptyState
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

          {goalSuggestions.length > 0 ? (
            <>
              <Text style={styles.label}>From your goals</Text>
              <Text style={styles.helper}>
                Seed the prefer list from an active goal — one tap adds the
                matching recipe tags.
              </Text>
              <View style={styles.chipRow}>
                {goalSuggestions.map(({ goal, tags }) => (
                  <Pressable
                    key={`goal-${goal.id}`}
                    onPress={() => applyGoalTags(tags)}
                    style={[styles.chip, styles.chipGoal]}
                  >
                    <Text style={styles.chipLabel}>
                      {goal.title} · {tags.join(", ")}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}

          {availableTags.length > 0 ? (
            <>
              <Text style={styles.label}>Prefer tags</Text>
              <Text style={styles.helper}>
                Recipes with any of these get first pick per slot. Great for
                goal-driven planning (e.g. "high-protein").
              </Text>
              <View style={styles.chipRow}>
                {availableTags.map((tag) => {
                  const active = preferTags.some(
                    (t) => t.toLowerCase() === tag.toLowerCase(),
                  );
                  return (
                    <Pressable
                      key={`prefer-${tag}`}
                      onPress={() => togglePreferTag(tag)}
                      style={[
                        styles.chip,
                        active ? styles.chipPreferActive : null,
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
                      key={`avoid-${tag}`}
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
        <Surface key={day.date}>
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
        </Surface>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  spinner: { marginTop: spacing.md },
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
  },
  row: { flexDirection: "row", gap: spacing.sm },
  label: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  helper: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.micro,
  },
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.mdSm,
    paddingVertical: spacing.micro,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.mossDeep },
  chipAvoidActive: { backgroundColor: status.worthDiscussing.fill },
  chipPreferActive: { backgroundColor: status.withinRange.fill },
  chipGoal: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.mossDeep,
  },
  chipLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.ink,
  },
  chipLabelActive: { color: colors.white },
  error: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: CLAY,
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
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  previewDate: {
    marginBottom: spacing.sm,
    // The system's eyebrow: 11px micro-caps in `inkMuted`. A 12px
    // uppercase moss line was a fourth label style and read as a link.
    ...typography.micro,
    color: colors.inkMuted,
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
    color: colors.inkSoft,
    minWidth: 80,
  },
  mealName: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.ink,
  },
});
