import { SequentialConsentScreen } from "@/components/consent/SequentialConsentScreen";
import { COPY } from "@/lib/copy";

export default function BrcaConsentScreen() {
  return (
    <SequentialConsentScreen
      consentType="brca"
      extraBody={COPY.consentBrcaBody}
    />
  );
}
