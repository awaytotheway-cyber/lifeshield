import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { FollowUpCalendar } from "@/components/illustrations";
import { DangerButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  canSelfCancel,
  formatBookingStatus,
  formatSlotDay,
  formatSlotTime,
  splitBookings,
  type BookingRow,
} from "@/lib/booking";
import {
  cancelBooking,
  loadOwnBookings,
} from "@/lib/booking-data";
import { FEATURES } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Upcoming and past bookings, with self-serve cancelling. */
export default function AppointmentsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);

  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const userId = session?.user.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await loadOwnBookings(userId);
      if (result.ok) {
        setBookings(result.bookings);
        setMessage(null);
      } else {
        setBookings([]);
        setMessage(result.message);
      }
    } catch {
      setBookings([]);
      setMessage(COPY.bookingsLoadFailed);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const { upcoming, past } = useMemo(
    () => splitBookings(bookings, new Date()),
    [bookings],
  );

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }
  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  async function onCancel(booking: BookingRow) {
    setCancellingId(booking.id);
    setNotice(null);
    try {
      const result = await cancelBooking(booking.id);
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setNotice(COPY.bookingCancelled);
      setConfirmingId(null);
      await refresh();
    } catch {
      setNotice(COPY.bookingCancelFailed);
    } finally {
      setCancellingId(null);
    }
  }

  function renderBooking(booking: BookingRow, allowCancel: boolean) {
    const cancellable = allowCancel && canSelfCancel(booking, new Date());
    const confirming = confirmingId === booking.id;
    return (
      <View key={booking.id} style={styles.cardGap}>
        <Card>
          <View style={styles.cardTop}>
            <Text style={styles.kind}>
              {booking.kind === "home_kit"
                ? COPY.bookingKindHomeKit
                : COPY.bookingKindClinic}
            </Text>
            <StatusChip
              kind={booking.status === "cancelled" ? "draft" : "normal"}
              label={formatBookingStatus(booking.status)}
            />
          </View>

          {booking.scheduled_for ? (
            <Text style={styles.when}>
              {formatSlotDay(booking.scheduled_for.slice(0, 10))} at{" "}
              {formatSlotTime(booking.scheduled_for)}
            </Text>
          ) : booking.address_line ? (
            <Text style={styles.when}>
              {booking.address_line}
              {booking.postcode ? `, ${booking.postcode}` : ""}
            </Text>
          ) : null}

          {cancellable && !confirming ? (
            <TextButton
              title={COPY.bookingCancel}
              onPress={() => setConfirmingId(booking.id)}
            />
          ) : null}

          {cancellable && confirming ? (
            <View style={styles.confirmRow}>
              <Text style={styles.confirmText}>{COPY.bookingCancelTitle}</Text>
              <DangerButton
                title={COPY.bookingCancelConfirm}
                loading={cancellingId === booking.id}
                onPress={() => void onCancel(booking)}
              />
              <TextButton
                title={COPY.bookingCancelKeep}
                onPress={() => setConfirmingId(null)}
              />
            </View>
          ) : null}
        </Card>
      </View>
    );
  }

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={COPY.appointmentsTitle}
        onBack={() => router.back()}
      />

      {loading ? <StaticSkeleton rows={3} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.bookingSlotsRetry}
            onPress={() => void refresh()}
          />
        </>
      ) : null}

      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {!loading && !message && bookings.length === 0 ? (
        <>
          <EmptyState
            heading={COPY.appointmentsEmptyHeading}
            explanation={COPY.appointmentsEmptyBody}
            illustration={<FollowUpCalendar width={200} />}
          />
          {FEATURES.guidedBooking ? (
            <PrimaryButton
              title={COPY.bookingOpenBooking}
              onPress={() => router.push(routes.booking)}
            />
          ) : null}
        </>
      ) : null}

      {upcoming.length > 0 ? (
        <>
          <Text style={styles.group}>{COPY.bookingUpcomingHeading}</Text>
          {upcoming.map((booking) => renderBooking(booking, true))}
        </>
      ) : null}

      {past.length > 0 ? (
        <>
          <Text style={styles.group}>{COPY.bookingPastHeading}</Text>
          {past.map((booking) => renderBooking(booking, false))}
        </>
      ) : null}

      {!loading && !message && bookings.length > 0 && FEATURES.guidedBooking ? (
        <TextButton
          title={COPY.bookingOpenBooking}
          onPress={() => router.push(routes.booking)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: {
    marginTop: spacing.base,
    marginBottom: spacing.sm,
    fontFamily: fontFamily.bodySemi,
    fontSize: 18,
    color: colors.primaryBlue,
  },
  cardGap: {
    marginBottom: spacing.mdSm,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.micro,
  },
  kind: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  when: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: colors.charcoal,
  },
  confirmRow: {
    marginTop: spacing.sm,
  },
  confirmText: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
    marginTop: spacing.mdSm,
  },
  notice: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.sage,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
