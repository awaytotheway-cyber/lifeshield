import { useEffect, type ReactNode } from "react";

import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Starts auth once, then loads the symptom-check lock, consents, and hub
 * progress for the signed-in user.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const initialize = useAuthStore((state) => state.initialize);
  const session = useAuthStore((state) => state.session);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const loadTriage = useTriageStore((state) => state.load);
  const resetTriage = useTriageStore((state) => state.reset);
  const triageStatus = useTriageStore((state) => state.status);
  const triageLoading = useTriageStore((state) => state.loading);
  const loadConsent = useConsentStore((state) => state.load);
  const resetConsent = useConsentStore((state) => state.reset);
  const consentAgreed = useConsentStore((state) => state.agreed);
  const loadQuestionnaire = useQuestionnaireStore((state) => state.load);
  const resetQuestionnaire = useQuestionnaireStore((state) => state.reset);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!session?.user.id) {
      resetTriage();
      resetConsent();
      resetQuestionnaire();
      return;
    }
    if (!onboardingCompleted) {
      resetTriage();
      resetConsent();
      resetQuestionnaire();
      return;
    }
    void loadTriage(session.user.id);
  }, [
    session?.user.id,
    onboardingCompleted,
    loadTriage,
    resetTriage,
    resetConsent,
    resetQuestionnaire,
  ]);

  useEffect(() => {
    if (!session?.user.id || !onboardingCompleted) {
      return;
    }
    if (triageLoading) {
      return;
    }
    if (triageStatus === "clear") {
      void loadConsent(session.user.id);
      return;
    }
    resetConsent();
    resetQuestionnaire();
  }, [
    session?.user.id,
    onboardingCompleted,
    triageLoading,
    triageStatus,
    loadConsent,
    resetConsent,
    resetQuestionnaire,
  ]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    if (triageStatus !== "clear") {
      return;
    }
    if (
      consentAgreed.brca &&
      consentAgreed.ctc &&
      consentAgreed.snp
    ) {
      void loadQuestionnaire(session.user.id);
    }
  }, [
    session?.user.id,
    triageStatus,
    consentAgreed.brca,
    consentAgreed.ctc,
    consentAgreed.snp,
    loadQuestionnaire,
  ]);

  return children;
}

export function useSession() {
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);
  const errorMessage = useAuthStore((state) => state.errorMessage);
  const configured = useAuthStore((state) => state.configured);

  return {
    session,
    loading,
    errorMessage,
    configured: configured || isSupabaseConfigured,
  };
}
