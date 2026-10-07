import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { useJourney } from "@/lib/use-journey";
import { Accent } from "@/lib/specimen-tokens";

/** Shared spinner so every gate looks the same. */
function GateLoading() {
  return (
    <View className="flex-1 items-center justify-center bg-paperSheet">
      <ActivityIndicator color={Accent.tag} />
      <Text className="mt-3 text-inkFull">Loading…</Text>
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
