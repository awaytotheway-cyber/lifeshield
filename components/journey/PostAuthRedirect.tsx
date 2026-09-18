import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";

import { useJourney } from "@/lib/use-journey";

/** Shared spinner so every gate looks the same. */
function GateLoading() {
  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <ActivityIndicator color="#FF6000" />
      <Text className="mt-3 text-charcoal">Loading…</Text>
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
