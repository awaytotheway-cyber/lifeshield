/**
 * Haptic feedback helpers.
 *
 * PLAIN ENGLISH: these make the phone give a tiny tap when you press a button.
 * Web browsers have no vibration motor, and some phones have haptics disabled,
 * so every call is wrapped in try/catch and silently does nothing if it fails.
 * A missing buzz must never break a button.
 */
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

const supported = Platform.OS === "ios" || Platform.OS === "android";

/** Medium tap — primary buttons and confirmations. */
export function hapticMedium(): void {
  if (!supported) {
    return;
  }
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } catch {
    // No haptics on this device — ignore.
  }
}

/** Light tap — selecting a choice card, toggling a chip. */
export function hapticLight(): void {
  if (!supported) {
    return;
  }
  try {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    // No haptics on this device — ignore.
  }
}
