import { Redirect } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Screen } from "@/components/ui/Screen";
import { SEX_OPTIONS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { dateFromYmd, todayLocalDate } from "@/lib/datetime";
import { eligibilityFor } from "@/lib/eligibility";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { useEligibilityStore } from "@/stores/eligibility-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Date of birth and sex, before the consents. The layout sends anyone whose
 * details are missing here, and sends anyone already eligible on to the
 * consents, so this screen is only ever shown when it has work to do.
 */
export default function EligibilityScreen() {
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const loaded = useEligibilityStore((state) => state.loaded);
  const storedDob = useEligibilityStore((state) => state.dateOfBirth);
  const storedSex = useEligibilityStore((state) => state.sex);
  const save = useEligibilityStore((state) => state.save);

  const [dateOfBirth, setDateOfBirth] = useState<string>(storedDob ?? "");
  const [sex, setSex] = useState<string>(storedSex ?? "");
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
  if (!loaded) {
    return <GateLoading />;
  }

  const onContinue = async () => {
    if (!dateOfBirth || !sex) {
      setMessage(COPY.eligibilityPickBoth);
      return;
    }
    // A date the rule cannot read (a future date, say) is not saved: the
    // picker caps at today, so this only catches a malformed value.
    if (eligibilityFor({ sex, dateOfBirth }).status === "needs_details") {
      setMessage(COPY.eligibilityPickBoth);
      return;
    }
    setSaving(true);
    setMessage(null);
    const result = await save(session.user.id, dateOfBirth, sex);
    setSaving(false);
    if (!result.ok) {
      setMessage(result.message ?? COPY.eligibilitySaveFailed);
      return;
    }
    // Nothing to navigate to: the layout watches the stored result and moves
    // on by itself, to the consents when eligible or to the exit screen.
  };

  return (
    <Screen scroll>
      <Text className="text-worthDiscussing text-3xl">{COPY.appName}</Text>
      <Text className="mt-4 text-2xl text-ink">{COPY.eligibilityTitle}</Text>
      <Text className="mt-3 text-ink">{COPY.eligibilityBody}</Text>

      <DatePicker
        label={COPY.eligibilityDob}
        value={dateOfBirth}
        onChange={setDateOfBirth}
        maximumDate={todayLocalDate()}
        minimumDate={dateFromYmd(1920, 1, 1)}
      />
      <RadioGroup
        label={COPY.eligibilitySex}
        options={SEX_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        value={sex}
        onChange={setSex}
      />

      {message ? (
        <Text className="mt-4 text-center text-worthDiscussing">{message}</Text>
      ) : null}

      <Button
        title={COPY.eligibilityContinue}
        onPress={() => void onContinue()}
        loading={saving}
        disabled={saving}
      />
    </Screen>
  );
}
