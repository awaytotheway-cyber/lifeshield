/**
 * BRCA / CTC / SNP consent rows. Agreed means consented = true in Supabase.
 * A decline is saved as consented = false and does not unlock the questionnaire.
 */
import { create } from "zustand";

import {
  emptyConsentFlags,
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
  agreed: ConsentFlags;
  errorMessage: string | null;
  load: (userId: string) => Promise<void>;
  save: (
    userId: string,
    consentType: SequentialConsent,
    consented: boolean,
  ) => Promise<SaveResult>;
  reset: () => void;
};

function foldConsentRows(
  rows: { consent_type: string; consented: boolean }[] | null,
): ConsentFlags {
  const next = { ...emptyConsentFlags };
  if (!rows) {
    return next;
  }
  for (const row of rows) {
    if (
      row.consent_type === "brca" ||
      row.consent_type === "ctc" ||
      row.consent_type === "snp"
    ) {
      next[row.consent_type] = Boolean(row.consented);
    }
  }
  return next;
}

export const useConsentStore = create<ConsentState>((set, get) => ({
  loading: false,
  loaded: false,
  agreed: { ...emptyConsentFlags },
  errorMessage: null,

  reset: () => {
    set({
      loading: false,
      loaded: false,
      agreed: { ...emptyConsentFlags },
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

      set({
        loading: false,
        loaded: true,
        agreed: foldConsentRows(data),
        errorMessage: null,
      });
    } catch (error) {
      set({
        loading: false,
        loaded: true,
        agreed: { ...emptyConsentFlags },
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
