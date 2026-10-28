import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { SEQUENTIAL_CONSENTS } from "@/lib/consent-flow";
import { COPY } from "@/lib/copy";
import {
  clearSymptomChecked,
  consentSnapshotNote,
  wasSymptomChecked,
} from "@/lib/follow-up-contact";
import { completeFollowUp, todayIsoDate } from "@/lib/follow-ups";
import { getTerm } from "@/lib/plain-language";
import { followUpContactHref, routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Second step of a review, after the symptom question: show what the patient
 * said about each test and let them confirm or change it. Confirming completes
 * the review and writes a dated record of the three answers onto the row.
 */
export default function ReviewConsentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const agreed = useConsentStore((state) => state.agreed);
  const decided = useConsentStore((state) => state.decided);
  const loaded = useConsentStore((state) => state.loaded);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const followUpId = rawId ?? "";

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }
  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }
  if (!followUpId) {
    return <Redirect href={routes.followUp} />;
  }
  // The symptom question comes first at every contact; opening this step
  // directly sends the patient back to it.
  if (!wasSymptomChecked(followUpId)) {
    return <Redirect href={followUpContactHref(followUpId)} />;
  }
  if (!loaded) {
    return <GateLoading />;
  }

  const confirm = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await completeFollowUp(
        session.user.id,
        followUpId,
        consentSnapshotNote(agreed, decided, todayIsoDate()),
      );
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      clearSymptomChecked(followUpId);
      router.replace(routes.followUp);
    } catch {
      setMessage(COPY.followUpSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Text className="text-2xl text-ink">{COPY.followUpReviewConsentsTitle}</Text>
      <Text className="mt-3 text-ink">{COPY.followUpReviewConsentsBody}</Text>

      {SEQUENTIAL_CONSENTS.map((type) => (
        <Card key={type}>
          <Text className="text-ink">{getTerm(type).plainName}</Text>
          <Text className="mt-1 text-ink">
            {!decided[type]
              ? COPY.followUpReviewConsentsNotAnswered
              : agreed[type]
                ? COPY.followUpReviewConsentsAgreed
                : COPY.followUpReviewConsentsDeclined}
          </Text>
        </Card>
      ))}

      {message ? (
        <Text className="mt-4 text-center text-worthDiscussing">{message}</Text>
      ) : null}

      <Button
        title={COPY.followUpReviewConsentsConfirm}
        onPress={() => void confirm()}
        loading={saving}
        disabled={saving}
      />
      <Button
        title={COPY.followUpReviewConsentsChange}
        variant="text"
        onPress={() => router.push(routes.settingsConsents)}
        disabled={saving}
      />
    </Screen>
  );
}
