/**
 * Symptom-check state. Locked means Pathway B — the questionnaire stays closed
 * even after the app restarts.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type TriageStatus = "pending" | "clear" | "locked";

type TriageAnswers = {
  has_pain: boolean;
  has_discomfort: boolean;
  has_lump: boolean;
};

type SubmitResult = {
  ok: boolean;
  locked?: boolean;
  message?: string;
};

type TriageState = {
  loading: boolean;
  status: TriageStatus;
  errorMessage: string | null;
  load: (userId: string) => Promise<void>;
  submit: (userId: string, answers: TriageAnswers) => Promise<SubmitResult>;
  lockFromInterrupt: (userId: string) => Promise<SubmitResult>;
  reset: () => void;
};

function lockKey(userId: string) {
  return `lifeshield.triageLock.${userId}`;
}

function isSymptomatic(answers: TriageAnswers): boolean {
  return answers.has_pain || answers.has_discomfort || answers.has_lump;
}

async function readLocalLock(userId: string): Promise<"locked" | "clear" | null> {
  try {
    const value = await AsyncStorage.getItem(lockKey(userId));
    if (value === "locked" || value === "clear") {
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeLocalLock(userId: string, status: "locked" | "clear") {
  try {
    await AsyncStorage.setItem(lockKey(userId), status);
  } catch {
    // Local lock is a backup. Supabase is the main record.
  }
}

export const useTriageStore = create<TriageState>((set) => ({
  loading: true,
  status: "pending",
  errorMessage: null,

  reset: () => {
    set({ loading: true, status: "pending", errorMessage: null });
  },

  load: async (userId: string) => {
    set({ loading: true, errorMessage: null });

    const local = await readLocalLock(userId);
    if (local === "locked") {
      // Safety first: a previous Yes still locks even if the network is slow.
      set({ loading: false, status: "locked", errorMessage: null });
    }

    if (!isSupabaseConfigured) {
      set({
        loading: false,
        status: local === "locked" ? "locked" : "pending",
        errorMessage: COPY.missingKeys,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("triage_responses")
        .select("has_pain, has_discomfort, has_lump, is_symptomatic, triaged_at")
        .eq("user_id", userId)
        .order("triaged_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        set({
          loading: false,
          status: local === "locked" ? "locked" : "pending",
          errorMessage: null,
        });
        return;
      }

      const locked =
        Boolean(data.is_symptomatic) ||
        isSymptomatic({
          has_pain: Boolean(data.has_pain),
          has_discomfort: Boolean(data.has_discomfort),
          has_lump: Boolean(data.has_lump),
        });

      const status: TriageStatus = locked ? "locked" : "clear";
      await writeLocalLock(userId, status);
      set({ loading: false, status, errorMessage: null });
    } catch (error) {
      // If the database fails, keep an existing lock. Never treat failure as "all clear".
      set({
        loading: false,
        status: local === "locked" ? "locked" : "pending",
        errorMessage: messageFromUnknown(error, COPY.triageSaveFailed),
      });
    }
  },

  submit: async (userId, answers) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }

    try {
      const { error } = await supabase.from("triage_responses").insert({
        user_id: userId,
        has_pain: answers.has_pain,
        has_discomfort: answers.has_discomfort,
        has_lump: answers.has_lump,
      });

      if (error) {
        throw error;
      }

      const locked = isSymptomatic(answers);
      const status: TriageStatus = locked ? "locked" : "clear";
      await writeLocalLock(userId, status);
      set({ status, errorMessage: null, loading: false });
      return { ok: true, locked };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.triageSaveFailed),
      };
    }
  },

  /**
   * Mid-questionnaire Yes (nipple discharge, skin change, or lump).
   * Stored as a symptomatic triage row so Pathway B still shows after restart.
   */
  lockFromInterrupt: async (userId) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }

    try {
      const { error } = await supabase.from("triage_responses").insert({
        user_id: userId,
        has_pain: false,
        has_discomfort: true,
        has_lump: true,
      });

      if (error) {
        throw error;
      }

      await writeLocalLock(userId, "locked");
      set({ status: "locked", errorMessage: null, loading: false });
      return { ok: true, locked: true };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.interruptLockFailed),
      };
    }
  },
}));
