import { SequentialConsentScreen } from "@/components/consent/SequentialConsentScreen";
import { COPY } from "@/lib/copy";

export default function SnpConsentScreen() {
  return (
    <SequentialConsentScreen
      consentType="snp"
      extraBody={COPY.consentSnpBody}
    />
  );
}
