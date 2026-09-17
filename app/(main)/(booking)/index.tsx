import { Redirect, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CalendarCheck } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextField } from "@/components/ui/TextField";
import {
  isUsablePostcode,
  normalisePostcode,
} from "@/lib/booking";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
import { bookingPrepHref, bookingProvidersHref, routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useBookingTests } from "@/lib/use-booking-tests";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Step 1 — where are you, and how would you like to do this.
 *
 * Postcode is typed, not sniffed. We never ask the operating system for
 * location here: a denied permission must never be able to block a booking.
 */
export default function BookingStartScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const { loading, tests, homeKitAvailable, message } = useBookingTests();

  const [postcode, setPostcode] = useState("");
  const [kind, setKind] = useState<"clinic" | "home_kit">("clinic");
  const [error, setError] = useState<string | null>(null);

  const modalityOptions = useMemo(
    () => [
      {
        value: "clinic",
        label: COPY.bookingModalityClinic,
        description: COPY.bookingModalityClinicDetail,
      },
      {
        value: "home_kit",
        label: COPY.bookingModalityHomeKit,
        description: homeKitAvailable
          ? COPY.bookingModalityHomeKitDetail
          : COPY.bookingModalityHomeKitUnavailable,
      },
    ],
    [homeKitAvailable],
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

  function onContinue() {
    if (!isUsablePostcode(postcode)) {
      setError(COPY.bookingPostcodeInvalid);
      return;
    }
    setError(null);
    const tidy = normalisePostcode(postcode);
    if (kind === "home_kit") {
      router.push(bookingPrepHref({ kind: "home_kit", postcode: tidy }));
      return;
    }
    router.push(bookingProvidersHref(tidy));
  }

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={COPY.bookingStartTitle}
        onBack={() => router.back()}
      />

      <View style={styles.hero}>
        <CalendarCheck width={140} height={110} />
      </View>
      <Text style={styles.body}>{COPY.bookingStartBody}</Text>

      {loading ? <StaticSkeleton rows={2} /> : null}

      {!loading && tests.length > 0 ? (
        <Card>
          <Text style={styles.cardHeading}>{COPY.bookingTestsHeading}</Text>
          {tests.map((test) => (
            <Text key={test.id} style={styles.testLine}>
              • {test.name}
            </Text>
          ))}
        </Card>
      ) : null}

      {message ? <Text style={styles.warning}>{message}</Text> : null}

      <View style={styles.field}>
        <TextField
          label={COPY.bookingPostcodeLabel}
          hint={COPY.bookingPostcodeHint}
          value={postcode}
          onChangeText={(next) => {
            setPostcode(next);
            if (error) {
              setError(null);
            }
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          error={error ?? undefined}
        />
      </View>

      <RadioGroup
        label={COPY.bookingModalityLabel}
        options={modalityOptions}
        value={kind}
        allowClear={false}
        onChange={(next) => {
          if (next === "home_kit" && !homeKitAvailable) {
            return;
          }
          setKind(next === "home_kit" ? "home_kit" : "clinic");
        }}
      />

      <PrimaryButton
        title={
          kind === "home_kit" ? COPY.bookingKitConfirm : COPY.bookingContinue
        }
        onPress={onContinue}
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
  cardHeading: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  testLine: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  warning: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.amber,
    marginTop: spacing.sm,
  },
  field: {
    marginTop: spacing.base,
  },
});
