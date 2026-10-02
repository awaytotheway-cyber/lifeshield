import { StyleSheet, Text } from "react-native";

import { COPY } from "@/lib/copy";
import { Colors, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

/** Shows the three auth-store setup messages above a login / register form. */
export function SetupBanners() {
  const configured = useAuthStore((state) => state.configured);
  const setupMessage = useAuthStore((state) => state.setupMessage);
  const errorMessage = useAuthStore((state) => state.errorMessage);

  return (
    <>
      {!configured ? (
        <Text style={[styles.line, styles.alert]}>{COPY.missingKeys}</Text>
      ) : null}
      {setupMessage ? (
        <Text style={[styles.line, styles.info]}>{setupMessage}</Text>
      ) : null}
      {errorMessage ? (
        <Text style={[styles.line, styles.alert]}>{errorMessage}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  line: {
    ...typeStyle("secondary"),
    marginBottom: Space.lg,
    textAlign: "center",
  },
  alert: {
    color: Colors.red,
  },
  info: {
    color: Colors.body,
  },
});
