import { useEffect, useRef, type ReactNode } from "react";

import { allConsentsDecided } from "@/lib/consent-flow";
import { baselineRecommendations } from "@/lib/rules-engine";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import { useEligibilityStore } from "@/stores/eligibility-store";
import { useEscalationStore } from "@/stores/escalation-store";
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
  const loadEligibility = useEligibilityStore((state) => state.load);
  const resetEligibility = useEligibilityStore((state) => state.reset);
  const consentsAnswered = useConsentStore((state) =>
    allConsentsDecided(state.decided),
  );
  const eligibility = useEligibilityStore((state) => state.status);
  const ctcPositive = useEscalationStore((state) => state.state.ctcPositive);
  const syncTestOrders = useQuestionnaireStore((state) => state.syncTestOrders);
  const baselineRequestedFor = useRef<string | null>(null);
  const loadQuestionnaire = useQuestionnaireStore((state) => state.load);
  const resetQuestionnaire = useQuestionnaireStore((state) => state.reset);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (!session?.user.id) {
      resetTriage();
      resetConsent();
      resetEligibility();
      resetQuestionnaire();
      return;
    }
    if (!onboardingCompleted) {
      resetTriage();
      resetConsent();
      resetEligibility();
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
    resetEligibility,
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
      void loadEligibility(session.user.id);
      return;
    }
    resetConsent();
    resetEligibility();
    resetQuestionnaire();
  }, [
    session?.user.id,
    onboardingCompleted,
    triageLoading,
    triageStatus,
    loadConsent,
    loadEligibility,
    resetConsent,
    resetEligibility,
    resetQuestionnaire,
  ]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    if (triageStatus !== "clear") {
      return;
    }
    // Once every consent has been answered the questionnaire is reachable,
    // whichever way they were answered. Gating this on "agreed" would leave a
    // patient who declined a test with an empty questionnaire.
    if (consentsAnswered) {
      void loadQuestionnaire(session.user.id);
    }
  }, [session?.user.id, triageStatus, consentsAnswered, loadQuestionnaire]);

  // The Tier 3 baseline does not depend on any questionnaire answer, so it is
  // requisitioned as soon as the pathway is confirmed open: symptom check
  // clear, age and sex eligible, every consent answered, and no positive CTC
  // pausing the arm. Insert-only: it adds what is missing and never touches an
  // order already placed. Tier 4 follows once the questionnaire is done.
  useEffect(() => {
    const userId = session?.user.id;
    if (
      !userId ||
      triageStatus !== "clear" ||
      eligibility !== "eligible" ||
      !consentsAnswered ||
      ctcPositive
    ) {
      return;
    }
    if (baselineRequestedFor.current === userId) {
      return;
    }
    baselineRequestedFor.current = userId;
    void syncTestOrders(userId, baselineRecommendations(), {
      removeStale: false,
    }).then((result) => {
      if (!result.ok) {
        // Let a later change of state try again; the questionnaire's full
        // sync is the backstop either way.
        baselineRequestedFor.current = null;
      }
    });
  }, [
    session?.user.id,
    triageStatus,
    eligibility,
    consentsAnswered,
    ctcPositive,
    syncTestOrders,
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
