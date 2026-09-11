import { Stack } from "expo-router";

/** Store order list and order-placed success. Hidden from tab bar. */
export default function OrdersLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
