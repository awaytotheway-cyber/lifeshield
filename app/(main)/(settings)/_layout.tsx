import { Stack } from "expo-router";

/**
 * Settings stack: the hub plus profile, privacy, help and the small shells.
 * Reached from the menu drawer — there is no bottom tab bar anymore, so every
 * screen in here renders its own ScreenHeader with a back button.
 */
export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="help" />
      <Stack.Screen name="about" />
      <Stack.Screen name="delete-account" />
      <Stack.Screen name="consents" />
      <Stack.Screen name="appointments" />
      <Stack.Screen name="prescriptions" />
      <Stack.Screen name="notifications-inbox" />
      <Stack.Screen name="buddies-settings" />
    </Stack>
  );
}
