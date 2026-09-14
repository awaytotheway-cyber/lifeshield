import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Button";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { TRIAGE_QUESTIONS, type TriageAnswerKey } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

type Answers = Record<TriageAnswerKey, boolean | null>;

const emptyAnswers: Answers = {
  has_pain: null,
  has_discomfort: null,
  has_lump: null,
};

/**
 * Safety gate after terms. Any Yes → Pathway B and the questionnaire stays locked.
 * All No → BRCA consent (then CTC, then SNP). We do not continue if the save fails.
 */
export default function SymptomCheckScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const termsPrivacyAccepted = useAuthStore((state) => state.termsPrivacyAccepted);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const triageStatus = useTriageStore((state) => state.status);
  const triageLoading = useTriageStore((state) => state.loading);
  const submit = useTriageStore((state) => state.submit);

  const [answers, setAnswers] = useState<Answers>(emptyAnswers);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (!termsPrivacyAccepted) {
    return <Redirect href={routes.consentPrivacy} />;
  }

  if (!onboardingCompleted) {
    return <Redirect href={routes.welcome} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "clear") {
    return <Redirect href={routes.consentBrca} />;
  }

  const setAnswer = (key: TriageAnswerKey, value: boolean | null) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setMessage(null);
  };

  const allAnswered =
    answers.has_pain !== null &&
    answers.has_discomfort !== null &&
    answers.has_lump !== null;

  const onContinue = async () => {
    if (
      answers.has_pain === null ||
      answers.has_discomfort === null ||
      answers.has_lump === null
    ) {
      setMessage(COPY.triageNeedAll);
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const result = await submit(session.user.id, {
        has_pain: answers.has_pain,
        has_discomfort: answers.has_discomfort,
        has_lump: answers.has_lump,
      });
      if (!result.ok) {
        setMessage(result.message ?? COPY.triageSaveFailed);
        return;
      }
      // replace (not push) so the back button cannot reopen this screen.
      if (result.locked) {
        router.replace(routes.pathwayB);
      } else {
        // Pathway A: consents next. Back cannot reopen this screen.
        router.replace(routes.consentBrca);
      }
    } catch {
      setMessage(COPY.triageSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll contentPadding={spacing.screenX}>
      <Text style={styles.h1}>{COPY.triageTitle}</Text>
      <Text style={styles.sub}>{COPY.triageBody}</Text>
      <Text style={styles.note}>{COPY.triageAwareness}</Text>
      <SetupBanners />

      <View style={styles.questions}>
        {TRIAGE_QUESTIONS.map((question) => {
          const current = answers[question.key];
          const value =
            current === true ? "yes" : current === false ? "no" : "";
          return (
            <RadioGroup
              key={question.key}
              label={question.label}
              allowClear={false}
              options={[
                { value: "yes", label: COPY.triageYes },
                { value: "no", label: COPY.triageNo },
              ]}
              value={value}
              onChange={(next) => {
                if (next === "yes") {
                  setAnswer(question.key, true);
                  return;
                }
                if (next === "no") {
                  setAnswer(question.key, false);
                }
              }}
            />
          );
        })}
      </View>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <View style={styles.cta}>
        <PrimaryButton
          title={COPY.triageContinue}
          onPress={() => void onContinue()}
          loading={saving || triageLoading}
          disabled={!allAnswered || saving}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: colors.deepTeal,
  },
  sub: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  note: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
  questions: {
    marginTop: 24,
    gap: 8,
  },
  error: {
    marginTop: 16,
    textAlign: "center",
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
  cta: {
    marginTop: 40,
  },
});
