/**
 * Questionnaire save-and-resume.
 * Section 1 writes to profiles. Sections 2–10 write one JSON row each.
 * Final submit also writes test_orders from the rules engine.
 */
import { create } from "zustand";

import {
  QUESTIONNAIRE_HUB_SECTIONS,
  SYMPTOM_INTERRUPT_CLEARED_KEY,
  type HubSectionKey,
  type QuestionnaireDbSection,
} from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { ensureProfileRow } from "@/lib/ensure-profile";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { parseFiniteNumber } from "@/lib/questionnaire/numbers";
import type { EngineRecommendation } from "@/lib/rules-engine";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type HubProgress = Record<HubSectionKey, boolean>;

export type ProfileDraft = {
  date_of_birth: string;
  sex: string;
  height_cm: number;
  weight_kg: number;
  waist_cm: number | null;
  hip_cm: number | null;
  ethnicity: string;
  country_of_origin: string;
};

export type ProfileRow = {
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | string | null;
  weight_kg: number | string | null;
  waist_cm: number | string | null;
  hip_cm: number | string | null;
  ethnicity: string | null;
  country_of_origin: string | null;
  bmi: number | string | null;
};

export type TestOrderRow = {
  id: string;
  test_tier: number;
  test_name: string;
  trigger_reason: string | null;
  status: string | null;
  created_at: string;
};

type SaveResult = { ok: boolean; message?: string };

function emptyProgress(): HubProgress {
  return {
    demographics: false,
    reproductive_menstrual: false,
    radiation_occupational: false,
    comorbidities: false,
    family_history: false,
    personal_history: false,
    lifestyle: false,
    stress: false,
    diet_environment: false,
    prior_screening: false,
  };
}

function demographicsComplete(profile: {
  date_of_birth?: string | null;
  sex?: string | null;
  height_cm?: number | string | null;
  weight_kg?: number | string | null;
} | null): boolean {
  if (!profile) {
    return false;
  }
  const height = parseFiniteNumber(profile.height_cm);
  const weight = parseFiniteNumber(profile.weight_kg);
  return Boolean(
    profile.date_of_birth &&
      profile.sex &&
      height !== null &&
      height > 0 &&
      weight !== null &&
      weight > 0,
  );
}

function asJson(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

type QuestionnaireState = {
  loading: boolean;
  /** True after the first hub load attempt (success or friendly error). */
  hydrated: boolean;
  progress: HubProgress;
  errorMessage: string | null;
  interruptPendingReproductive: boolean;
  interruptPendingFamily: boolean;
  /** True when at least one suggestion row exists (Home “Tests” step). */
  hasRecommendations: boolean;
  load: (userId: string) => Promise<void>;
  loadProfile: (userId: string) => Promise<{
    ok: boolean;
    profile: ProfileRow | null;
    message?: string;
  }>;
  saveProfile: (userId: string, draft: ProfileDraft) => Promise<SaveResult>;
  loadSection: (
    userId: string,
    section: QuestionnaireDbSection,
  ) => Promise<{
    ok: boolean;
    responses: Record<string, unknown> | null;
    message?: string;
  }>;
  saveSection: (
    userId: string,
    section: QuestionnaireDbSection,
    responses: Record<string, unknown>,
  ) => Promise<SaveResult>;
  loadForEngine: (userId: string) => Promise<{
    ok: boolean;
    bmi: number | string | null;
    sections: Record<string, Record<string, unknown> | null>;
    message?: string;
  }>;
  replaceTestOrders: (
    userId: string,
    orders: EngineRecommendation[],
  ) => Promise<SaveResult>;
  loadTestOrders: (userId: string) => Promise<{
    ok: boolean;
    orders: TestOrderRow[];
    message?: string;
  }>;
  reset: () => void;
};

export function completedSectionCount(progress: HubProgress): number {
  return QUESTIONNAIRE_HUB_SECTIONS.filter((section) => progress[section.key])
    .length;
}

export const useQuestionnaireStore = create<QuestionnaireState>((set, get) => ({
  loading: false,
  hydrated: false,
  progress: emptyProgress(),
  errorMessage: null,
  interruptPendingReproductive: false,
  interruptPendingFamily: false,
  hasRecommendations: false,

  reset: () => {
    set({
      loading: false,
      hydrated: false,
      progress: emptyProgress(),
      errorMessage: null,
      interruptPendingReproductive: false,
      interruptPendingFamily: false,
      hasRecommendations: false,
    });
  },

  load: async (userId: string) => {
    set({ loading: true, errorMessage: null });

    if (!isSupabaseConfigured) {
      set({
        loading: false,
        hydrated: true,
        progress: emptyProgress(),
        errorMessage: COPY.missingKeys,
        interruptPendingReproductive: false,
        interruptPendingFamily: false,
        hasRecommendations: false,
      });
      return;
    }

    try {
      const [profileResult, responsesResult, ordersResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("date_of_birth, sex, height_cm, weight_kg")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("questionnaire_responses")
          .select("section, responses")
          .eq("user_id", userId),
        supabase
          .from("test_orders")
          .select("id")
          .eq("user_id", userId)
          .limit(1),
      ]);

      if (profileResult.error) {
        throw profileResult.error;
      }
      if (responsesResult.error) {
        throw responsesResult.error;
      }
      if (ordersResult.error) {
        throw ordersResult.error;
      }

      const done = emptyProgress();
      done.demographics = demographicsComplete(profileResult.data);

      let interruptPendingReproductive = false;
      let interruptPendingFamily = false;

      for (const row of responsesResult.data ?? []) {
        const section = row.section as string;
        const json = asJson(row.responses);
        const interruptCleared =
          json?.[SYMPTOM_INTERRUPT_CLEARED_KEY] === true;
        for (const hub of QUESTIONNAIRE_HUB_SECTIONS) {
          if (hub.dbSection && hub.dbSection === section) {
            // Sections 2 and 5 are only “done” after the safety pause is answered No.
            if (
              section === "reproductive_menstrual" ||
              section === "family_history"
            ) {
              done[hub.key] = interruptCleared;
            } else {
              done[hub.key] = true;
            }
          }
        }
        if (section === "reproductive_menstrual") {
          interruptPendingReproductive = !interruptCleared;
        }
        if (section === "family_history") {
          interruptPendingFamily = !interruptCleared;
        }
      }

      set({
        loading: false,
        hydrated: true,
        progress: done,
        errorMessage: null,
        interruptPendingReproductive,
        interruptPendingFamily,
        hasRecommendations: (ordersResult.data ?? []).length > 0,
      });
    } catch (error) {
      set({
        loading: false,
        hydrated: true,
        progress: emptyProgress(),
        errorMessage: messageFromUnknown(error, COPY.hubLoadFailed),
        interruptPendingReproductive: false,
        interruptPendingFamily: false,
        hasRecommendations: false,
      });
    }
  },

  loadProfile: async (userId) => {
    if (!isSupabaseConfigured) {
      return { ok: false, profile: null, message: COPY.missingKeys };
    }
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "date_of_birth, sex, height_cm, weight_kg, waist_cm, hip_cm, ethnicity, country_of_origin, bmi",
        )
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return { ok: true, profile: (data as ProfileRow | null) ?? null };
    } catch (error) {
      return {
        ok: false,
        profile: null,
        message: messageFromUnknown(error, COPY.sectionLoadFailed),
      };
    }
  },

  saveProfile: async (userId, draft) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }
    const height = parseFiniteNumber(draft.height_cm);
    const weight = parseFiniteNumber(draft.weight_kg);
    if (height === null || weight === null) {
      return { ok: false, message: COPY.sectionNeedFix };
    }
    try {
      const ensured = await ensureProfileRow(userId);
      if (!ensured.ok) {
        return { ok: false, message: ensured.message ?? COPY.missingProfile };
      }
      const { error } = await supabase
        .from("profiles")
        .update({
          date_of_birth: draft.date_of_birth,
          sex: draft.sex,
          height_cm: height,
          weight_kg: weight,
          waist_cm: parseFiniteNumber(draft.waist_cm),
          hip_cm: parseFiniteNumber(draft.hip_cm),
          ethnicity: draft.ethnicity,
          country_of_origin: draft.country_of_origin,
        })
        .eq("id", userId);
      if (error) {
        throw error;
      }
      await get().load(userId);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.sectionSaveFailed),
      };
    }
  },

  loadSection: async (userId, section) => {
    if (!isSupabaseConfigured) {
      return { ok: false, responses: null, message: COPY.missingKeys };
    }
    try {
      const { data, error } = await supabase
        .from("questionnaire_responses")
        .select("responses")
        .eq("user_id", userId)
        .eq("section", section)
        .maybeSingle();
      if (error) {
        throw error;
      }
      return { ok: true, responses: asJson(data?.responses) };
    } catch (error) {
      return {
        ok: false,
        responses: null,
        message: messageFromUnknown(error, COPY.sectionLoadFailed),
      };
    }
  },

  saveSection: async (userId, section, responses) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }
    try {
      const { error } = await supabase.from("questionnaire_responses").upsert(
        {
          user_id: userId,
          section,
          responses,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,section" },
      );
      if (error) {
        throw error;
      }
      await get().load(userId);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.sectionSaveFailed),
      };
    }
  },

  loadForEngine: async (userId) => {
    if (!isSupabaseConfigured) {
      return {
        ok: false,
        bmi: null,
        sections: {},
        message: COPY.missingKeys,
      };
    }
    try {
      const [profileResult, responsesResult] = await Promise.all([
        supabase.from("profiles").select("bmi").eq("id", userId).maybeSingle(),
        supabase
          .from("questionnaire_responses")
          .select("section, responses")
          .eq("user_id", userId),
      ]);
      if (profileResult.error) {
        throw profileResult.error;
      }
      if (responsesResult.error) {
        throw responsesResult.error;
      }
      const sections: Record<string, Record<string, unknown> | null> = {};
      for (const row of responsesResult.data ?? []) {
        const json = asJson(row.responses);
        sections[row.section as string] = json;
      }
      return {
        ok: true,
        bmi: (profileResult.data as { bmi: number | string | null } | null)
          ?.bmi ?? null,
        sections,
      };
    } catch (error) {
      return {
        ok: false,
        bmi: null,
        sections: {},
        message: messageFromUnknown(error, COPY.sectionLoadFailed),
      };
    }
  },

  replaceTestOrders: async (userId, orders) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }
    try {
      const { error: deleteError } = await supabase
        .from("test_orders")
        .delete()
        .eq("user_id", userId);
      if (deleteError) {
        throw deleteError;
      }
      if (orders.length === 0) {
        set({ hasRecommendations: false });
        return { ok: true };
      }
      const { error: insertError } = await supabase.from("test_orders").insert(
        orders.map((order) => ({
          user_id: userId,
          test_tier: order.test_tier,
          test_name: order.test_name,
          trigger_reason: order.trigger_reason,
          status: "recommended",
        })),
      );
      if (insertError) {
        throw insertError;
      }
      set({ hasRecommendations: true });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.resultsSaveFailed),
      };
    }
  },

  loadTestOrders: async (userId) => {
    if (!isSupabaseConfigured) {
      return { ok: false, orders: [], message: COPY.missingKeys };
    }
    try {
      const { data, error } = await supabase
        .from("test_orders")
        .select("id, test_tier, test_name, trigger_reason, status, created_at")
        .eq("user_id", userId)
        .order("test_tier", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) {
        throw error;
      }
      const orders = (data as TestOrderRow[]) ?? [];
      set({ hasRecommendations: orders.length > 0 });
      return { ok: true, orders };
    } catch (error) {
      return {
        ok: false,
        orders: [],
        message: messageFromUnknown(error, COPY.resultsLoadFailed),
      };
    }
  },
}));
