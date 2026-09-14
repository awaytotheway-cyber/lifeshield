import { SequentialConsentScreen } from "@/components/consent/SequentialConsentScreen";
import { MolecularStructure } from "@/components/illustrations";
import { COPY } from "@/lib/copy";

export default function SnpConsentScreen() {
  return (
    <SequentialConsentScreen
      consentType="snp"
      extraBody={COPY.consentSnpBody}
      illustration={<MolecularStructure width={100} height={100} />}
    />
  );
}
