import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { Text } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import {
  allConsentsDecided,
  hrefAfterConsent,
  redirectIfConsentOutOfOrder,
  type SequentialConsent,
} from "@/lib/consent-flow";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import { useTriageStore } from "@/stores/triage-store";

type ConsentScreenProps = {
  consentType: SequentialConsent;
  extraBody: string;
};

/**
 * One consent, answered yes or no. Both answers move the patient forward:
 * each test is their choice, and saying no to one does not close the rest of
 * the pathway. Back cannot skip into a later consent.
 *
 * Once all three have been answered this screen can be revisited from
 * Settings to change an answer, and then returns there rather than replaying
 * the whole sequence.
 */
export function SequentialConsentScreen({
  consentType,
  extraBody,
}: ConsentScreenProps) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const decided = useConsentStore((state) => state.decided);
  const loading = useConsentStore((state) => state.loading);
  const loaded = useConsentStore((state) => state.loaded);
  const save = useConsentStore((state) => state.save);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  if (!loaded || loading) {
    return <GateLoading />;
  }

  const bounce = redirectIfConsentOutOfOrder(consentType, decided);
  if (bounce) {
    return <Redirect href={bounce} />;
  }

  // Read at render, before this answer is saved, so the last consent in the
  // first-time sequence still hands on to the questionnaire.
  const revisiting = allConsentsDecided(decided);

  const answer = async (consented: boolean) => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await save(session.user.id, consentType, consented);
      if (!result.ok) {
        setMessage(result.message ?? COPY.consentSaveFailed);
        return;
      }
      router.replace(
        revisiting ? routes.settingsConsents : hrefAfterConsent(consentType),
      );
    } catch {
      setMessage(COPY.consentSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Text className="text-worthDiscussing text-3xl">{COPY.appName}</Text>
      <Text className="mt-4 text-2xl text-ink">{COPY.consentTitle}</Text>
      <Text className="mt-3 text-ink">{COPY.consentIntro}</Text>
      <ClinicalTerm termKey={consentType} />
      <Text className="mt-4 text-ink">{extraBody}</Text>
      <SetupBanners />

      {message ? (
        <Text className="mt-4 text-center text-worthDiscussing">{message}</Text>
      ) : null}

      <Button
        title={COPY.consentAgree}
        onPress={() => void answer(true)}
        loading={saving}
        disabled={saving || loading}
      />
      <Button
        title={COPY.consentDecline}
        variant="ghost"
        onPress={() => void answer(false)}
        disabled={saving || loading}
      />

      <Text className="mt-4 text-center text-ink">{COPY.consentChoiceNote}</Text>

      {revisiting ? (
        <Button
          title={COPY.consentBackToConsents}
          variant="text"
          onPress={() => router.replace(routes.settingsConsents)}
          disabled={saving}
        />
      ) : null}
    </Screen>
  );
}
