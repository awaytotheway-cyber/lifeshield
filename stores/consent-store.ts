/**
 * BRCA / CTC / SNP consent rows.
 *
 *   agreed  — consented = true. Used where the consent itself is needed.
 *   decided — a row exists, yes or no. Used to gate the pathway: declining a
 *             test is the patient's choice and does not block the questionnaire.
 *
 * The folding rules live in lib/consent-flow.ts so they can be unit tested
 * without the Supabase client.
 */
import { create } from "zustand";

import {
  emptyConsentFlags,
  foldConsentRows,
  type ConsentFlags,
  type SequentialConsent,
} from "@/lib/consent-flow";
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type SaveResult = {
  ok: boolean;
  message?: string;
};

type ConsentState = {
  loading: boolean;
  /** False until the first fetch for this user finishes (success or error). */
  loaded: boolean;
  /** Said yes. */
  agreed: ConsentFlags;
  /** Answered, yes or no. */
  decided: ConsentFlags;
  errorMessage: string | null;
  load: (userId: string) => Promise<void>;
  save: (
    userId: string,
    consentType: SequentialConsent,
    consented: boolean,
  ) => Promise<SaveResult>;
  reset: () => void;
};

export const useConsentStore = create<ConsentState>((set, get) => ({
  loading: false,
  loaded: false,
  agreed: { ...emptyConsentFlags },
  decided: { ...emptyConsentFlags },
  errorMessage: null,

  reset: () => {
    set({
      loading: false,
      loaded: false,
      agreed: { ...emptyConsentFlags },
      decided: { ...emptyConsentFlags },
      errorMessage: null,
    });
  },

  load: async (userId: string) => {
    set({ loading: true, errorMessage: null });

    if (!isSupabaseConfigured) {
      set({
        loading: false,
        loaded: true,
        agreed: { ...emptyConsentFlags },
        decided: { ...emptyConsentFlags },
        errorMessage: COPY.missingKeys,
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("consent_records")
        .select("consent_type, consented, consented_at")
        .eq("user_id", userId)
        .in("consent_type", ["brca", "ctc", "snp"])
        .order("consented_at", { ascending: true });

      if (error) {
        throw error;
      }

      const folded = foldConsentRows(data);
      set({
        loading: false,
        loaded: true,
        agreed: folded.agreed,
        decided: folded.decided,
        errorMessage: null,
      });
    } catch (error) {
      // Fail closed: nothing decided, so the patient is sent back to the
      // consent screens rather than waved through on a failed load.
      set({
        loading: false,
        loaded: true,
        agreed: { ...emptyConsentFlags },
        decided: { ...emptyConsentFlags },
        errorMessage: messageFromUnknown(error, COPY.consentSaveFailed),
      });
    }
  },

  save: async (userId, consentType, consented) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }

    try {
      const { data: existing, error: existingError } = await supabase
        .from("consent_records")
        .select("id")
        .eq("user_id", userId)
        .eq("consent_type", consentType)
        .order("consented_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing?.id) {
        const { error: updateError } = await supabase
          .from("consent_records")
          .update({
            consented,
            consented_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from("consent_records")
          .insert({
            user_id: userId,
            consent_type: consentType,
            consented,
          });
        if (insertError) {
          throw insertError;
        }
      }

      set({
        agreed: {
          ...get().agreed,
          [consentType]: consented,
        },
        decided: {
          ...get().decided,
          [consentType]: true,
        },
        errorMessage: null,
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.consentSaveFailed),
      };
    }
  },
}));
