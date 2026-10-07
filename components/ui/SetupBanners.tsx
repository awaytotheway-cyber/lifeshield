import { Text } from "react-native";

import { COPY } from "@/lib/copy";
import { useAuthStore } from "@/stores/auth-store";

export function SetupBanners() {
  const configured = useAuthStore((state) => state.configured);
  const setupMessage = useAuthStore((state) => state.setupMessage);
  const errorMessage = useAuthStore((state) => state.errorMessage);

  return (
    <>
      {!configured ? (
        <Text className="mb-4 text-center text-tag">{COPY.missingKeys}</Text>
      ) : null}
      {setupMessage ? (
        <Text className="mb-4 text-center text-tag">{setupMessage}</Text>
      ) : null}
      {errorMessage ? (
        <Text className="mb-4 text-center text-tag">{errorMessage}</Text>
      ) : null}
    </>
  );
}
