
import { BodyText, ErrorText } from "@/components/ui/Typography";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
import { useAuthStore } from "@/stores/auth-store";

export function SetupBanners() {
  const configured = useAuthStore((state) => state.configured);
  const setupMessage = useAuthStore((state) => state.setupMessage);
  const errorMessage = useAuthStore((state) => state.errorMessage);

  return (
    <>
      {!configured ? (
        <ErrorText className="mb-4" centered>{COPY.missingKeys}</ErrorText>
      ) : null}
      {setupMessage ? (
        <BodyText className="mb-4" centered style={{ color: colors.primaryBlue }}>{setupMessage}</BodyText>
      ) : null}
      {errorMessage ? (
        <ErrorText className="mb-4" centered>{errorMessage}</ErrorText>
      ) : null}
    </>
  );
}
