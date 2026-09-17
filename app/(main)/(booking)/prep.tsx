import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextField } from "@/components/ui/TextField";
import {
  formatSlotDay,
  formatSlotTime,
  hasCriticalPrep,
} from "@/lib/booking";
import {
  bookSlot,
  requestHomeKit,
} from "@/lib/booking-data";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { bookingConfirmedHref, routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useBookingTests } from "@/lib/use-booking-tests";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * Step 4 — how to prepare, then confirm.
 *
 * This is the safety-critical screen. Preparation steps are shown BEFORE we
 * take a booking, and a hard rule (fasting, a cycle-day window) has to be
 * ticked off explicitly before the Confirm button does anything.
 */
export default function BookingPrepScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    kind?: string;
    slotId?: string;
    clinicName?: string;
    startsAt?: string;
    postcode?: string;
  }>();
  const kind = params.kind === "home_kit" ? "home_kit" : "clinic";
  const slotId = typeof params.slotId === "string" ? params.slotId : "";
  const clinicName =
    typeof params.clinicName === "string" ? params.clinicName : "";
  const startsAt = typeof params.startsAt === "string" ? params.startsAt : "";

  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const { loading, prepSteps, message } = useBookingTests();

  const [acked, setAcked] = useState<string[]>([]);
  const [addressLine, setAddressLine] = useState("");
  const [postcode, setPostcode] = useState(
    typeof params.postcode === "string" ? params.postcode : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  const mustAck = hasCriticalPrep(prepSteps);
  const isAcked = acked.includes("read");
  const critical = prepSteps.filter((step) => step.severity === "critical");
  const standard = prepSteps.filter((step) => step.severity !== "critical");

  async function onConfirm() {
    if (mustAck && !isAcked) {
      setError(COPY.bookingPrepAckRequired);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (kind === "home_kit") {
        const result = await requestHomeKit({
          userId: session!.user.id,
          addressLine,
          postcode,
          prepSteps,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        router.replace(bookingConfirmedHref(result.bookingId, "home_kit"));
        return;
      }

      const result = await bookSlot({ slotId, prepSteps });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace(bookingConfirmedHref(result.bookingId, "clinic"));
    } catch {
      setError(COPY.bookingFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title={kind === "home_kit" ? COPY.bookingKitTitle : COPY.bookingPrepTitle}
        onBack={() => router.back()}
      />

      {kind === "clinic" && startsAt ? (
        <Card>
          <Text style={styles.whenLabel}>{clinicName}</Text>
          <Text style={styles.when}>
            {formatSlotDay(startsAt.slice(0, 10))} at {formatSlotTime(startsAt)}
          </Text>
        </Card>
      ) : null}

      <Text style={styles.body}>
        {kind === "home_kit" ? COPY.bookingKitBody : COPY.bookingPrepBody}
      </Text>

      {kind === "home_kit" ? (
        <>
          <TextField
            label={COPY.bookingKitAddressLabel}
            hint={COPY.bookingKitAddressHint}
            value={addressLine}
            onChangeText={setAddressLine}
            multiline
          />
          <TextField
            label={COPY.bookingPostcodeLabel}
            value={postcode}
            onChangeText={setPostcode}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </>
      ) : null}

      {loading ? <StaticSkeleton rows={3} /> : null}

      {message ? <Text style={styles.warning}>{message}</Text> : null}

      {!loading && critical.length > 0 ? (
        <View style={styles.criticalBlock}>
          <Text style={styles.criticalHeading}>
            {COPY.bookingPrepCriticalHeading}
          </Text>
          {critical.map((step) => (
            <Text key={step.id} style={styles.criticalText}>
              {step.text}
            </Text>
          ))}
        </View>
      ) : null}

      {!loading && standard.length > 0 ? (
        <Card>
          {standard.map((step) => (
            <Text key={step.id} style={styles.stepText}>
              • {step.text}
            </Text>
          ))}
        </Card>
      ) : null}

      {mustAck ? (
        <View style={styles.ack}>
          <CheckboxGroup
            label=""
            options={[{ value: "read", label: COPY.bookingPrepAckLabel }]}
            values={acked}
            onChange={setAcked}
            exclusiveValue="__none__"
          />
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        title={
          kind === "home_kit" ? COPY.bookingKitConfirm : COPY.bookingPrepConfirm
        }
        onPress={() => void onConfirm()}
        loading={submitting}
        disabled={submitting || loading}
      />
      <TextButton title={COPY.bookingCancelKeep} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  whenLabel: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  when: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 18,
    color: colors.charcoal,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    marginVertical: spacing.mdSm,
  },
  criticalBlock: {
    backgroundColor: colors.amberLight,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.amber,
    padding: spacing.base,
    marginBottom: spacing.mdSm,
  },
  criticalHeading: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  criticalText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
    marginBottom: spacing.micro,
  },
  stepText: {
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
    marginBottom: spacing.sm,
  },
  ack: {
    marginTop: spacing.sm,
  },
  error: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.coral,
    marginBottom: spacing.sm,
  },
});
