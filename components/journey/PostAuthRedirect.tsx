import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { useJourney } from "@/lib/use-journey";
import { Colors, Space, typeStyle } from "@/lib/theme";

/** Shared spinner so every gate looks the same. */
function GateLoading() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={Colors.orange} />
      <Text style={styles.label}>Loading…</Text>
    </View>
  );
}

/**
 * Sends a signed-in user to welcome, symptom check, Pathway B, or home.
 * Used after login/register so we never dump a locked user on Home.
 */
export function PostAuthRedirect() {
  const { loading, href } = useJourney();

  if (loading) {
    return <GateLoading />;
  }

  return <Redirect href={href} />;
}

export { GateLoading };

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  label: {
    ...typeStyle("body"),
    marginTop: Space.md,
    color: Colors.body,
  },
});
