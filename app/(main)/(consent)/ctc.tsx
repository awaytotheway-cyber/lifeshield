import { SequentialConsentScreen } from "@/components/consent/SequentialConsentScreen";
import { Droplet } from "@/components/illustrations";
import { COPY } from "@/lib/copy";

export default function CtcConsentScreen() {
  return (
    <SequentialConsentScreen
      consentType="ctc"
      extraBody={COPY.consentCtcBody}
      illustration={<Droplet width={100} height={100} />}
    />
  );
}
