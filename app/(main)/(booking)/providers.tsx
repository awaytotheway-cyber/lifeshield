import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { EmptyBox } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import {
  formatPrice,
  formatSlotDay,
  formatSlotTime,
  type ClinicOption,
} from "@/lib/booking";
import {
  loadClinics,
} from "@/lib/booking-data";
import { COPY } from "@/lib/copy";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { bookingPrepHref, bookingSlotsHref, routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Step 2 — choose a lab.
 *
 * Every card shows distance-by-postcode, the next free time and the price.
 * We never hide the price until checkout.
 */
export default function BookingProvidersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ postcode?: string }>();
  const postcode = typeof params.postcode === "string" ? params.postcode : "";
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);

  const [loading, setLoading] = useState(true);
  const [clinics, setClinics] = useState<ClinicOption[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadClinics(postcode);
      if (result.ok) {
        setClinics(result.clinics);
        setMessage(null);
      } else {
        setClinics([]);
        setMessage(result.message);
      }
    } catch {
      setClinics([]);
      setMessage(COPY.bookingClinicsFailed);
    } finally {
      setLoading(false);
    }
  }, [postcode]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  const hasClinics = !loading && !message && clinics.length > 0;

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={COPY.bookingProvidersTitle}
        onBack={() => router.back()}
      />
      <Text style={styles.body}>{COPY.bookingProvidersBody}</Text>

      {loading ? <StaticSkeleton rows={4} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.bookingSlotsRetry}
            onPress={() => void refresh()}
          />
        </>
      ) : null}

      {!loading && !message && clinics.length === 0 ? (
        <>
          <EmptyState
            icon="map-pin"
            heading={COPY.bookingProvidersEmptyHeading}
            explanation={COPY.bookingProvidersEmptyBody}
            illustration={<EmptyBox width={140} height={110} />}
          />
          <PrimaryButton
            title={COPY.bookingModalityHomeKit}
            onPress={() =>
              router.push(bookingPrepHref({ kind: "home_kit", postcode }))
            }
          />
        </>
      ) : null}

      {hasClinics
        ? clinics.map((clinic) => {
            const bookable = clinic.open_slot_count > 0 && clinic.next_slot_at;
            return (
              <Pressable
                key={clinic.id}
                style={styles.card}
                accessibilityRole="button"
                accessibilityLabel={`${clinic.name}. ${
                  bookable
                    ? `Next free ${formatSlotDay(
                        (clinic.next_slot_at ?? "").slice(0, 10),
                      )}`
                    : COPY.bookingProviderNoSlots
                }`}
                disabled={!bookable}
                onPress={() =>
                  router.push(bookingSlotsHref(clinic.id, clinic.name))
                }
              >
                <View style={styles.cardTop}>
                  <Text style={styles.name}>{clinic.name}</Text>
                  <StatusChip
                    kind={bookable ? "normal" : "draft"}
                    label={
                      bookable
                        ? `${clinic.open_slot_count} free`
                        : COPY.bookingProviderNoSlots
                    }
                  />
                </View>

                {clinic.address ? (
                  <Text style={styles.meta}>
                    {[clinic.address, clinic.city, clinic.postcode]
                      .filter(Boolean)
                      .join(", ")}
                  </Text>
                ) : null}

                {clinic.next_slot_at ? (
                  <Text style={styles.next}>
                    {COPY.bookingProviderNextSlot}:{" "}
                    {formatSlotDay(clinic.next_slot_at.slice(0, 10))} at{" "}
                    {formatSlotTime(clinic.next_slot_at)}
                  </Text>
                ) : null}

                <Text style={styles.price}>
                  {formatPrice(clinic.from_price_cents)}
                </Text>

                {clinic.offers_home_collection ? (
                  <Text style={styles.meta}>
                    {COPY.bookingProviderHomeCollection}
                  </Text>
                ) : null}

                {bookable ? (
                  <Text style={styles.choose}>
                    {COPY.bookingProviderChoose} →
                  </Text>
                ) : null}
              </Pressable>
            );
          })
        : null}
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
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    marginBottom: spacing.mdSm,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: spacing.micro,
  },
  name: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: colors.charcoal,
  },
  meta: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
  next: {
    marginTop: spacing.micro,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.primaryBlue,
  },
  price: {
    marginTop: spacing.micro,
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.charcoal,
  },
  choose: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.primaryBlue,
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
    marginTop: spacing.mdSm,
  },
});
