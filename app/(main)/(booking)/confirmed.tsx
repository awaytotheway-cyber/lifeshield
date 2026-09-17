import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CalendarCheck } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import {
  buildPrepSteps,
  formatSlotDay,
  formatSlotTime,
  planBookingReminders,
  type BookingRow,
} from "@/lib/booking";
import {
  loadOwnBookings,
} from "@/lib/booking-data";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useBookingTests } from "@/lib/use-booking-tests";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Step 5 — confirmation.
 *
 * Repeats the preparation steps rather than assuming the previous screen was
 * read, and says plainly when the reminders will arrive.
 */
export default function BookingConfirmedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();
  const bookingId = typeof params.id === "string" ? params.id : "";
  const kind = params.kind === "home_kit" ? "home_kit" : "clinic";
  const session = useAuthStore((state) => state.session);
  const { tests } = useBookingTests();
  const [booking, setBooking] = useState<BookingRow | null>(null);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !bookingId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const result = await loadOwnBookings(userId);
        if (cancelled || !result.ok) {
          return;
        }
        setBooking(result.bookings.find((row) => row.id === bookingId) ?? null);
      } catch {
        // The booking is saved either way — this screen just shows less detail.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, bookingId]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  const prepSteps = buildPrepSteps(tests);
  const reminders = booking?.scheduled_for
    ? planBookingReminders(booking.scheduled_for, prepSteps, new Date())
    : [];

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader title={COPY.bookingConfirmedTitle} />

      <View style={styles.hero}>
        <CalendarCheck width={160} height={130} />
      </View>

      <Text style={styles.body}>
        {kind === "home_kit"
          ? COPY.bookingConfirmedKitBody
          : COPY.bookingConfirmedBody}
      </Text>

      {booking?.scheduled_for ? (
        <Card>
          <Text style={styles.when}>
            {formatSlotDay(booking.scheduled_for.slice(0, 10))} at{" "}
            {formatSlotTime(booking.scheduled_for)}
          </Text>
        </Card>
      ) : null}

      {prepSteps.length > 0 ? (
        <Card>
          <Text style={styles.heading}>{COPY.bookingConfirmedPrepHeading}</Text>
          {prepSteps.map((step) => (
            <Text key={step.id} style={styles.step}>
              • {step.text}
            </Text>
          ))}
        </Card>
      ) : null}

      {reminders.length > 0 ? (
        <Text style={styles.reminders}>
          {reminders.length === 2
            ? "We will remind you the day before and again two hours before."
            : "We will remind you a couple of hours before."}
        </Text>
      ) : null}

      <PrimaryButton
        title={COPY.bookingConfirmedSeeAppointments}
        onPress={() => router.replace(routes.appointments)}
      />
      <TextButton
        title={COPY.bookingConfirmedDone}
        onPress={() => router.replace(routes.home)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    marginBottom: spacing.base,
  },
  when: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 18,
    color: colors.charcoal,
  },
  heading: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  step: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  reminders: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
    marginVertical: spacing.mdSm,
  },
});
