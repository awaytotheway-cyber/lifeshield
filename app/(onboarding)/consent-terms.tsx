import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";

import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
import { PrimaryButton } from "@/components/ui/Button";
import { ColorSwitch } from "@/components/ui/ColorSwitch";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

export default function ConsentTermsScreen() {
  const router = useRouter();
  const saveTermsConsent = useAuthStore((state) => state.saveTermsConsent);
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const onAgree = async () => {
    if (!agreed) {
      setMessage(COPY.termsNeedCheck);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveTermsConsent();
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
            onPress={() => void onAgree()}
            loading={saving}
            disabled={saving}
          />
        </>
      }
    >
      <ColorSwitch
        label={COPY.termsCheckbox}
        value={agreed}
        color="primary"
        onChange={(next) => {
          setAgreed(next);
          setMessage(null);
        }}
      />
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  error: {
    marginTop: 16,
    textAlign: "center",
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.coral,
  },
});
