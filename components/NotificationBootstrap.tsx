/**
 * Registers push tokens (EAS builds) and routes notification taps to the right screen.
 * Wrapped inside SessionProvider so we have a signed-in user id when available.
 */
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { hrefFromNotificationData } from "@/lib/notification-routing";
import { registerForPushNotifications } from "@/lib/push-notifications";
import { useAuthStore } from "@/stores/auth-store";

export function NotificationBootstrap() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const onboardingCompleted = useAuthStore((state) => state.onboardingCompleted);
  const registeredUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    let subscription: { remove: () => void } | undefined;

    void (async () => {
      try {
        const Notifications = await import("expo-notifications");
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        subscription = Notifications.addNotificationResponseReceivedListener(
          (response) => {
            try {
              const data = response.notification.request.content.data as
                | Record<string, unknown>
                | undefined;
              const href = hrefFromNotificationData(data);
              if (href) {
                router.push(href);
              }
            } catch {
              // Never crash the app from a bad payload.
            }
          },
        );
      } catch {
        // Notifications optional on this platform.
      }
    })();

    return () => {
      subscription?.remove();
    };
  }, [router]);

  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }
    const userId = session?.user.id;
    if (!userId || !onboardingCompleted) {
      registeredUserRef.current = null;
      return;
    }
    if (registeredUserRef.current === userId) {
      return;
    }
    registeredUserRef.current = userId;
    void registerForPushNotifications(userId);
  }, [session?.user.id, onboardingCompleted]);

  return null;
}
