import { Stack } from "expo-router";

/** Store catalog, product detail, cart, and checkout stub. Hidden from tab bar. */
export default function StoreLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
