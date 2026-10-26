import { useState } from "react";
import { Redirect, useRouter } from "expo-router";
import { Text } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import {
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
 * One clear action: Agree to continue. Decline is saved but does not open
 * the questionnaire. Back cannot skip into a later consent.
 */
export function SequentialConsentScreen({
  consentType,
  extraBody,
}: ConsentScreenProps) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const agreed = useConsentStore((state) => state.agreed);
  const loading = useConsentStore((state) => state.loading);
  const loaded = useConsentStore((state) => state.loaded);
  const save = useConsentStore((state) => state.save);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

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

  const bounce = redirectIfConsentOutOfOrder(consentType, agreed);
  if (bounce) {
    return <Redirect href={bounce} />;
  }

  const onAgree = async () => {
    setSaving(true);
    setMessage(null);
    setDeclined(false);
    try {
      const result = await save(session.user.id, consentType, true);
      if (!result.ok) {
        setMessage(result.message ?? COPY.consentSaveFailed);
        return;
      }
      router.replace(hrefAfterConsent(consentType));
    } catch {
      setMessage(COPY.consentSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const onDecline = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await save(session.user.id, consentType, false);
      if (!result.ok) {
        setMessage(result.message ?? COPY.consentSaveFailed);
        return;
      }
      setDeclined(true);
      setMessage(COPY.consentDeclined);
    } catch {
      setMessage(COPY.consentSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <Text className="text-coral text-3xl">{COPY.appName}</Text>
      <Text className="mt-4 text-2xl text-charcoal">{COPY.consentTitle}</Text>
      <Text className="mt-3 text-charcoal">{COPY.consentIntro}</Text>
      <ClinicalTerm termKey={consentType} />
      <Text className="mt-4 text-charcoal">{extraBody}</Text>
      <SetupBanners />

      {message ? (
        <Text className="mt-4 text-center text-coral">{message}</Text>
      ) : null}

      {declined ? (
        <>
          <Text className="mt-3 text-center text-charcoal">
            {COPY.consentDeclinedHint}
          </Text>
          <Button
            title={COPY.consentGoHome}
            variant="ghost"
            onPress={() => {
              router.replace(routes.home);
            }}
          />
        </>
      ) : null}

      <Button
        title={COPY.consentAgree}
        onPress={() => void onAgree()}
        loading={saving}
        disabled={saving || loading}
      />
      <Button
        title={COPY.consentDecline}
        variant="ghost"
        onPress={() => void onDecline()}
        disabled={saving || loading}
      />
    </Screen>
  );
}
