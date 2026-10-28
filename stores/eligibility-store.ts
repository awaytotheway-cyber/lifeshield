/**
 * Date of birth and sex, held only to decide whether this person may start the
 * screening pathway (lib/eligibility.ts). They live on `profiles`, the same
 * columns the Demographics section and Settings → Profile edit, so asking for
 * them early does not create a second copy.
 *
 * Fails closed: a failed load reads as "needs details", so the patient is sent
 * to the details screen rather than waved past an age check that never ran.
 */
import { create } from "zustand";

import { COPY } from "@/lib/copy";
import { eligibilityFor, type Eligibility } from "@/lib/eligibility";
import { ensureProfileRow } from "@/lib/ensure-profile";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SaveResult = { ok: boolean; message?: string };

type EligibilityState = {
  loading: boolean;
  /** False until the first fetch for this user finishes (success or error). */
  loaded: boolean;
  dateOfBirth: string | null;
  sex: string | null;
  status: Eligibility["status"];
  load: (userId: string) => Promise<void>;
  save: (userId: string, dateOfBirth: string, sex: string) => Promise<SaveResult>;
  reset: () => void;
};

const empty = {
  loading: false,
  loaded: false,
  dateOfBirth: null,
  sex: null,
  status: "needs_details" as const,
};

export const useEligibilityStore = create<EligibilityState>((set) => ({
  ...empty,

  reset: () => set({ ...empty }),

  load: async (userId) => {
    set({ loading: true });

    if (!isSupabaseConfigured) {
      set({ ...empty, loaded: true });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("date_of_birth, sex")
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        throw error;
      }
      const dateOfBirth = data?.date_of_birth ?? null;
      const sex = data?.sex ?? null;
      set({
        loading: false,
        loaded: true,
        dateOfBirth,
        sex,
        status: eligibilityFor({ sex, dateOfBirth }).status,
      });
    } catch {
      set({ ...empty, loaded: true });
    }
  },

  save: async (userId, dateOfBirth, sex) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }
    try {
      const ensured = await ensureProfileRow(userId);
      if (!ensured.ok) {
        return { ok: false, message: ensured.message ?? COPY.eligibilitySaveFailed };
      }
      const { error } = await supabase
        .from("profiles")
        .update({ date_of_birth: dateOfBirth, sex })
        .eq("id", userId);
      if (error) {
        throw error;
      }
      set({
        loaded: true,
        dateOfBirth,
        sex,
        status: eligibilityFor({ sex, dateOfBirth }).status,
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.eligibilitySaveFailed),
      };
    }
  },
}));
