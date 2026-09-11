/**
 * Where confirmation emails should send the user after they click the link.
 * Only set on Expo web. Native uses the project Site URL instead, so we
 * do not send a custom URL that is missing from the allow list.
 */
import { Platform } from "react-native";

export function signupEmailRedirectTo(): string | undefined {
  try {
    if (Platform.OS !== "web") {
      return undefined;
    }
    if (typeof window === "undefined" || !window.location?.origin) {
      return undefined;
    }
    return window.location.origin;
  } catch {
    return undefined;
  }
}
