import { SequentialConsentScreen } from "@/components/consent/SequentialConsentScreen";
import { DnaHelix } from "@/components/illustrations";
import { COPY } from "@/lib/copy";

export default function BrcaConsentScreen() {
  return (
    <SequentialConsentScreen
      consentType="brca"
      extraBody={COPY.consentBrcaBody}
      illustration={<DnaHelix width={100} height={100} />}
    />
  );
}
