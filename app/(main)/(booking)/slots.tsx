import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyHourglass } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import {
  formatPrice,
  formatSlotDay,
  formatSlotTime,
  groupSlotsByDay,
  type LabSlot,
} from "@/lib/booking";
import {
  loadSlots,
} from "@/lib/booking-data";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import { bookingPrepHref, routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Step 3 — pick a time.
 *
 * Availability here is a snapshot. The database re-checks it when the patient
 * confirms, so a slot that goes in the meantime fails cleanly rather than
 * double-booking someone.
 */
export default function BookingSlotsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    clinicId?: string;
    clinicName?: string;
  }>();
  const clinicId = typeof params.clinicId === "string" ? params.clinicId : "";
  const clinicName =
    typeof params.clinicName === "string" ? params.clinicName : "";
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);

  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<LabSlot[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await loadSlots(clinicId);
      if (result.ok) {
        setSlots(result.slots);
        setMessage(null);
      } else {
        setSlots([]);
        setMessage(result.message);
      }
    } catch {
      setSlots([]);
      setMessage(COPY.bookingSlotsFailed);
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const days = useMemo(() => groupSlotsByDay(slots, new Date()), [slots]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={clinicName || COPY.bookingSlotsTitle}
        onBack={() => router.back()}
      />
      <Text style={styles.body}>{COPY.bookingSlotsBody}</Text>

      {loading ? <StaticSkeleton rows={5} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.bookingSlotsRetry}
            onPress={() => void refresh()}
          />
        </>
      ) : null}

      {!loading && !message && days.length === 0 ? (
        <>
          <EmptyState
            icon="clock"
            heading={COPY.bookingSlotsEmptyHeading}
            explanation={COPY.bookingSlotsEmptyBody}
            illustration={<EmptyHourglass width={100} height={100} />}
          />
          <PrimaryButton
            title={COPY.bookingProvidersTitle}
            onPress={() => router.back()}
          />
        </>
      ) : null}

      {days.map((day) => (
        <View key={day.dayKey} style={styles.day}>
          <Text style={styles.dayLabel}>{formatSlotDay(day.dayKey)}</Text>
          <View style={styles.slotRow}>
            {day.slots.map((slot) => (
              <Pressable
                key={slot.id}
                style={styles.slot}
                accessibilityRole="button"
                accessibilityLabel={`${formatSlotDay(day.dayKey)} at ${formatSlotTime(
                  slot.starts_at,
                )}, ${formatPrice(slot.price_cents, slot.currency)}`}
                onPress={() =>
                  router.push(
                    bookingPrepHref({
                      kind: "clinic",
                      slotId: slot.id,
                      clinicName,
                      startsAt: slot.starts_at,
                    }),
                  )
                }
              >
                <Text style={styles.slotTime}>
                  {formatSlotTime(slot.starts_at)}
                </Text>
                <Text style={styles.slotPrice}>
                  {formatPrice(slot.price_cents, slot.currency)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    marginBottom: spacing.base,
  },
  day: {
    marginBottom: spacing.base,
  },
  dayLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.primaryBlue,
    marginBottom: spacing.sm,
  },
  slotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  slot: {
    minHeight: tapTarget,
    minWidth: 96,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.mdSm,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  slotTime: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  slotPrice: {
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.slate,
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
    marginTop: spacing.mdSm,
  },
});
