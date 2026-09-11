import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";

import { SymptomInterrupt } from "@/components/questionnaire/SymptomInterrupt";
import { COPY } from "@/lib/copy";
import { syncLocalFollowUpReminders } from "@/lib/follow-up-reminders";
import {
  completeFollowUp,
  completeSymptomCheckAndScheduleNext,
  firstPendingSymptom,
  loadOwnFollowUps,
} from "@/lib/follow-ups";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Recurring follow-up safety question.
 * Reuses Phase 1 SymptomInterrupt. Yes → Pathway B lock. Cannot return.
 */
export default function FollowUpSymptomRecheckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const lockFromInterrupt = useTriageStore((state) => state.lockFromInterrupt);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestedId = useMemo(() => {
    const raw = params.id;
    if (Array.isArray(raw)) {
      return raw[0] ?? "";
    }
    return raw ?? "";
  }, [params.id]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const onYes = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const lock = await lockFromInterrupt(session.user.id);
      if (!lock.ok) {
        setErrorMessage(lock.message ?? COPY.interruptLockFailed);
        return;
      }
      if (requestedId) {
        try {
          await completeFollowUp(session.user.id, requestedId);
        } catch {
          // Lock already saved. Completing the row is secondary.
        }
      }
      router.replace(routes.pathwayB);
    } catch {
      setErrorMessage(COPY.interruptLockFailed);
    } finally {
      setSaving(false);
    }
  };

  const onNo = async () => {
    setSaving(true);
    setErrorMessage(null);
    try {
      let id = requestedId;
      if (!id) {
        const loaded = await loadOwnFollowUps(session.user.id);
        id = loaded.ok ? (firstPendingSymptom(loaded.rows)?.id ?? "") : "";
      }
      if (!id) {
        router.replace(routes.followUp);
        return;
      }
      const result = await completeSymptomCheckAndScheduleNext(
        session.user.id,
        id,
      );
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      const loaded = await loadOwnFollowUps(session.user.id);
      if (loaded.ok) {
        void syncLocalFollowUpReminders(loaded.rows);
      }
      router.replace(routes.followUp);
    } catch {
      setErrorMessage(COPY.followUpSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SymptomInterrupt
      saving={saving}
      errorMessage={errorMessage}
      onYes={() => {
        void onYes();
      }}
      onNo={() => {
        void onNo();
      }}
    />
  );
}
