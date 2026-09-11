import { SequentialConsentScreen } from "@/components/consent/SequentialConsentScreen";
import { COPY } from "@/lib/copy";

export default function CtcConsentScreen() {
  return (
    <SequentialConsentScreen
      consentType="ctc"
      extraBody={COPY.consentCtcBody}
    />
  );
}
