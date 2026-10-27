import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { PrimaryButton } from "@/components/ui/Button";
import { COPY } from "@/lib/copy";
import { spacing, status } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { routes } from "@/lib/routes";
import { typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

/** Failure and warning text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * Last welcome step after the legal gate. Privacy consent is already saved;
 * this only marks onboarding complete so the symptom check can open.
 */
export default function ConsentTermsScreen() {
  const router = useRouter();
  const completeOnboarding = useAuthStore((state) => state.completeOnboarding);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onContinue = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const result = await completeOnboarding();
      if (!result.ok) {
        setMessage(result.message ?? COPY.setupTables);
        return;
      }
      router.replace(routes.symptomCheck);
    } catch (error) {
      setMessage(messageFromUnknown(error, COPY.setupTables));
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingShell
      step={3}
      icon="lock"
      title={COPY.termsTitle}
      body={COPY.termsBody}
      footer={
        <>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <PrimaryButton
            title={COPY.termsButton}
            onPress={() => void onContinue()}
            loading={saving}
            disabled={saving}
          />
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: spacing.base,
    textAlign: "center",
    ...typography.label,
    color: CLAY,
  },
});
