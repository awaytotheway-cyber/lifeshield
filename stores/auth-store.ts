/**
 * Global login state. Screens read this instead of calling Supabase
 * in a dozen places. Restart the app → initialize() restores the session.
 */
import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";

import { signupEmailRedirectTo } from "@/lib/auth-redirect";
import { COPY } from "@/lib/copy";
import { ensureProfileRow } from "@/lib/ensure-profile";
import {
  classifyError,
  messageFromUnknown,
  registerFailureMessage,
} from "@/lib/friendly-errors";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

let authListenerAttached = false;

type ActionResult = {
  ok: boolean;
  message?: string;
  needsEmailConfirm?: boolean;
};

type AuthState = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  errorMessage: string | null;
  onboardingCompleted: boolean;
  /** True only after terms_privacy is saved. Blocks every other screen. */
  termsPrivacyAccepted: boolean;
  setupMessage: string | null;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<ActionResult>;
  signOut: () => Promise<ActionResult>;
  requestPasswordReset: (email: string) => Promise<ActionResult>;
  refreshOnboarding: () => Promise<void>;
  saveTermsConsent: () => Promise<ActionResult>;
  completeOnboarding: () => Promise<ActionResult>;
};

async function readOnboarding(userId: string): Promise<{
  completed: boolean;
  termsPrivacyAccepted: boolean;
  setupMessage: string | null;
}> {
  const ensured = await ensureProfileRow(userId);
  const profileWarning = ensured.ok ? null : ensured.message ?? COPY.missingProfile;

  let termsPrivacyAccepted = false;
  try {
    const { data: consent, error: consentError } = await supabase
      .from("consent_records")
      .select("id")
      .eq("user_id", userId)
      .eq("consent_type", "terms_privacy")
      .eq("consented", true)
      .maybeSingle();

    if (consentError) {
      throw consentError;
    }
    termsPrivacyAccepted = Boolean(consent);
  } catch (error) {
    return {
      completed: false,
      termsPrivacyAccepted: false,
      setupMessage: messageFromUnknown(error, profileWarning ?? COPY.setupTables),
    };
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    return {
      completed: Boolean(profile?.onboarding_completed),
      termsPrivacyAccepted,
      // Missing row after upsert = trigger/SQL issue, not a white screen.
      setupMessage: profile ? profileWarning : profileWarning ?? COPY.missingProfile,
    };
  } catch (error) {
    return {
      completed: false,
      termsPrivacyAccepted,
      setupMessage: messageFromUnknown(error, profileWarning ?? COPY.setupTables),
    };
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  loading: true,
  configured: isSupabaseConfigured,
  errorMessage: null,
  onboardingCompleted: false,
  termsPrivacyAccepted: false,
  setupMessage: null,

  initialize: async () => {
    if (!isSupabaseConfigured) {
      set({
        session: null,
        loading: false,
        onboardingCompleted: false,
        termsPrivacyAccepted: false,
        errorMessage: null,
        setupMessage: COPY.missingKeys,
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      const session = data.session ?? null;
      let onboardingCompleted = false;
      let termsPrivacyAccepted = false;
      let setupMessage: string | null = null;
      if (session?.user.id) {
        const status = await readOnboarding(session.user.id);
        onboardingCompleted = status.completed;
        termsPrivacyAccepted = status.termsPrivacyAccepted;
        setupMessage = status.setupMessage;
      }
      set({
        session,
        loading: false,
        errorMessage: null,
        onboardingCompleted,
        termsPrivacyAccepted,
        setupMessage,
      });
    } catch (error) {
      set({
        session: null,
        loading: false,
        onboardingCompleted: false,
        termsPrivacyAccepted: false,
        errorMessage: classifyError(error).message,
      });
    }

    if (!authListenerAttached) {
      authListenerAttached = true;
      try {
        supabase.auth.onAuthStateChange((_event, nextSession) => {
          void (async () => {
            let onboardingCompleted = get().onboardingCompleted;
            let termsPrivacyAccepted = get().termsPrivacyAccepted;
            let setupMessage = get().setupMessage;
            if (nextSession?.user.id) {
              const status = await readOnboarding(nextSession.user.id);
              onboardingCompleted = status.completed;
              termsPrivacyAccepted = status.termsPrivacyAccepted;
              setupMessage = status.setupMessage;
            } else {
              onboardingCompleted = false;
              termsPrivacyAccepted = false;
              setupMessage = null;
            }
            set({
              session: nextSession,
              onboardingCompleted,
              termsPrivacyAccepted,
              setupMessage,
            });
          })();
        });
      } catch {
        authListenerAttached = false;
      }
    }
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        return { ok: false, message: classifyError(error).message };
      }
      const session = data.session ?? null;
      let onboardingCompleted = false;
      let termsPrivacyAccepted = false;
      let setupMessage: string | null = null;
      if (session?.user.id) {
        const metaName =
          typeof session.user.user_metadata?.full_name === "string"
            ? session.user.user_metadata.full_name
            : undefined;
        const ensured = await ensureProfileRow(session.user.id, metaName);
        const status = await readOnboarding(session.user.id);
        onboardingCompleted = status.completed;
        termsPrivacyAccepted = status.termsPrivacyAccepted;
        setupMessage = ensured.ok
          ? status.setupMessage
          : ensured.message ?? status.setupMessage;
      }
      set({
        session,
        errorMessage: null,
        onboardingCompleted,
        termsPrivacyAccepted,
        setupMessage,
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "We couldn't log you in."),
      };
    }
  },

  signUp: async (email, password, fullName) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }
    try {
      const emailRedirectTo = signupEmailRedirectTo();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      });
      if (error) {
        console.warn("PRESCOPE sign-up error:", registerFailureMessage(error));
        return { ok: false, message: registerFailureMessage(error) };
      }

      // Confirm-email ON + existing account: GoTrue returns a user with
      // no identities and no session. That is "already registered", not success.
      const identities = data.user?.identities;
      if (
        !data.session &&
        data.user &&
        Array.isArray(identities) &&
        identities.length === 0
      ) {
        return { ok: false, message: COPY.registerEmailExists };
      }

      const session = data.session ?? null;
      if (session?.user.id) {
        const ensured = await ensureProfileRow(session.user.id, fullName.trim());
        if (!ensured.ok) {
          const setupMessage = ensured.message ?? COPY.missingProfile;
          set({
            session,
            setupMessage,
            onboardingCompleted: false,
            termsPrivacyAccepted: false,
          });
          return { ok: true, message: setupMessage };
        }
        const status = await readOnboarding(session.user.id);
        set({
          session,
          errorMessage: null,
          onboardingCompleted: status.completed,
          termsPrivacyAccepted: status.termsPrivacyAccepted,
          setupMessage: status.setupMessage,
        });
        return { ok: true };
      }

      // Email confirmation is on: account exists, but no session yet.
      return {
        ok: true,
        needsEmailConfirm: true,
        message: COPY.registerEmailConfirm,
      };
    } catch (error) {
      console.warn("PRESCOPE sign-up exception:", registerFailureMessage(error));
      return {
        ok: false,
        message: registerFailureMessage(error),
      };
    }
  },

  requestPasswordReset: async (email) => {
    if (!isSupabaseConfigured) {
      return { ok: false, message: COPY.missingKeys };
    }
    const trimmed = email.trim();
    if (!trimmed) {
      return { ok: false, message: COPY.forgotPasswordNeedEmail };
    }
    try {
      const emailRedirectTo = signupEmailRedirectTo();
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        ...(emailRedirectTo ? { redirectTo: emailRedirectTo } : {}),
      });
      if (error) {
        return { ok: false, message: classifyError(error).message };
      }
      return { ok: true, message: COPY.forgotPasswordSent };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, "We couldn't send a reset email. Try again."),
      };
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { ok: false, message: classifyError(error).message };
      }
      set({
        session: null,
        onboardingCompleted: false,
        termsPrivacyAccepted: false,
        errorMessage: null,
        setupMessage: null,
      });
      return { ok: true };
    } catch (error) {
      set({
        session: null,
        onboardingCompleted: false,
        termsPrivacyAccepted: false,
      });
      return {
        ok: false,
        message: messageFromUnknown(error, "Signed out locally. Please try again if you still see old data."),
      };
    }
  },

  refreshOnboarding: async () => {
    const userId = get().session?.user.id;
    if (!userId) {
      set({ onboardingCompleted: false, termsPrivacyAccepted: false });
      return;
    }
    const status = await readOnboarding(userId);
    set({
      onboardingCompleted: status.completed,
      termsPrivacyAccepted: status.termsPrivacyAccepted,
      setupMessage: status.setupMessage,
    });
  },

  saveTermsConsent: async () => {
    const userId = get().session?.user.id;
    if (!userId) {
      return { ok: false, message: "Please log in first." };
    }
    try {
      const ensured = await ensureProfileRow(userId);
      if (!ensured.ok) {
        return {
          ok: false,
          message: ensured.message ?? COPY.missingProfile,
        };
      }

      const { data: existing, error: existingError } = await supabase
        .from("consent_records")
        .select("id")
        .eq("user_id", userId)
        .eq("consent_type", "terms_privacy")
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (!existing) {
        const { error: insertError } = await supabase
          .from("consent_records")
          .insert({
            user_id: userId,
            consent_type: "terms_privacy",
            consented: true,
          });
        if (insertError) {
          throw insertError;
        }
      } else if (existing) {
        const { error: updateError } = await supabase
          .from("consent_records")
          .update({ consented: true })
          .eq("id", existing.id);
        if (updateError) {
          throw updateError;
        }
      }

      set({ termsPrivacyAccepted: true, setupMessage: null });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.setupTables),
      };
    }
  },

  completeOnboarding: async () => {
    const userId = get().session?.user.id;
    if (!userId) {
      return { ok: false, message: "Please log in first." };
    }
    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("id", userId);

      if (profileError) {
        throw profileError;
      }

      set({ onboardingCompleted: true, setupMessage: null });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: messageFromUnknown(error, COPY.setupTables),
      };
    }
  },
}));
