import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";
import { useJourney } from "@/lib/use-journey";

/**
 * Shared loading state so every gate looks the same.
 *
 * This is a route gate, not a content view: we do not yet know which screen
 * the user is headed for, so there is no layout to ghost with a skeleton. A
 * calm centred spinner on the brand background is the right affordance, and
 * it is usually on screen for only a moment.
 */
function GateLoading() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={colors.primaryBlue} />
      <Text style={styles.label}>{COPY.authLoading}</Text>
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
    backgroundColor: colors.iceBlue,
  },
  label: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.slate,
  },
});
