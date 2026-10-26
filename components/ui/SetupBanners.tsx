import { StyleSheet, Text } from "react-native";

import { COPY } from "@/lib/copy";
import { colors, status } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

/** Clay, borrowed from `worthDiscussing` — Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * The configuration and auth messages shown above a sign-in form. Plain lines
 * of type, not boxes: a failure is said in words, in clay, and nothing else.
 */
export function SetupBanners() {
  const configured = useAuthStore((state) => state.configured);
  const setupMessage = useAuthStore((state) => state.setupMessage);
  const errorMessage = useAuthStore((state) => state.errorMessage);

  return (
    <>
      {!configured ? (
        <Text style={styles.problem}>{COPY.missingKeys}</Text>
      ) : null}
      {setupMessage ? (
        <Text style={styles.note}>{setupMessage}</Text>
      ) : null}
      {errorMessage ? (
        <Text style={styles.problem}>{errorMessage}</Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  problem: {
    marginBottom: 16,
    ...typography.label,
    color: CLAY,
    textAlign: "center",
  },
  note: {
    marginBottom: 16,
    ...typography.label,
    color: colors.mossDeep,
    textAlign: "center",
  },
});
