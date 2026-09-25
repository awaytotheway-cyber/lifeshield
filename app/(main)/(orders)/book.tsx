import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { PrimaryButton, SecondaryButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GlassCard } from "@/components/ui/GlassCard";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextInput } from "@/components/ui/TextInput";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import {
  locationIsSet,
  matchReasonLabel,
  rankLabsForUser,
  type RankedLab,
  type UserLocation,
} from "@/lib/lab-search";
import {
  bookLabOrder,
  loadActiveLabs,
  loadOwnLocation,
  loadRecommendedTestOrders,
  saveOwnLocation,
  type TestOrderSummary,
} from "@/lib/labs-io";
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";
type Step = "pick_test" | "pick_lab" | "confirm" | "booked";

export default function BookTestScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);

  const [tests, setTests] = useState<TestOrderSummary[]>([]);
  const [ranked, setRanked] = useState<RankedLab[]>([]);
  const [location, setLocation] = useState<UserLocation>({
    postcode: null,
    country: null,
  });

  const [step, setStep] = useState<Step>("pick_test");
  const [selectedTest, setSelectedTest] = useState<TestOrderSummary | null>(null);
  const [selectedLab, setSelectedLab] = useState<RankedLab | null>(null);
  const [slotAt, setSlotAt] = useState("");

  const [postcodeInput, setPostcodeInput] = useState("");
  const [countryInput, setCountryInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState(false);
  const [bookedLabOrderId, setBookedLabOrderId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      let cancelled = false;
      setState("loading");
      setErrorMessage(null);

      if (isSupabaseConfigured) {
        void supabase
          .from("profiles")
          .select("feature_flags")
          .eq("id", userId)
          .maybeSingle()
          .then(({ data }) => {
            if (cancelled) return;
            setProfile((data ?? { feature_flags: {} }) as FeatureFlagProfile);
          });
      } else {
        setProfile({ feature_flags: {} });
      }

      void Promise.all([
        loadRecommendedTestOrders(userId),
        loadActiveLabs(),
        loadOwnLocation(userId),
      ]).then(([testsOutcome, labsOutcome, locationOutcome]) => {
        if (cancelled) return;
        if (!testsOutcome.ok) {
          setErrorMessage(testsOutcome.message);
          setState("error");
          return;
        }
        setTests(testsOutcome.rows);
        const loc: UserLocation = locationOutcome.ok
          ? {
              postcode: locationOutcome.location.location_postcode,
              country: locationOutcome.location.location_country,
            }
          : { postcode: null, country: null };
        setLocation(loc);
        setPostcodeInput(loc.postcode ?? "");
        setCountryInput(loc.country ?? "");
        if (labsOutcome.ok) {
          setRanked(rankLabsForUser(labsOutcome.rows, loc));
        } else {
          // Labs table missing is not fatal — the screen still shows the
          // test list and the location editor. The "no labs" empty state
          // fires when the user reaches step pick_lab.
          setRanked([]);
        }
        setState("ready");
      });
      return () => {
        cancelled = true;
      };
    }, [userId]),
  );

  const enabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.test_booking_v1
      : isFeatureEnabled(profile, "test_booking_v1");

  const rankedForSelection = useMemo(() => ranked, [ranked]);

  if (!session) return <Redirect href={routes.login} />;

  if (!enabled) {
    return (
      <Screen scroll>
        <ScreenHeader title="Book a test" onBack={() => router.back()} />
        <EmptyState
          icon="clipboard"
          heading="Test booking is coming soon"
          explanation="This feature is behind a flag while we test it with a small group. Ask us to switch it on for your account."
        />
      </Screen>
    );
  }

  async function saveLocation() {
    if (!userId) return;
    setSaving(true);
    const nextLocation: UserLocation = {
      postcode: postcodeInput.trim() || null,
      country: countryInput.trim().toUpperCase() || null,
    };
    const outcome = await saveOwnLocation(userId, {
      location_postcode: nextLocation.postcode,
      location_country: nextLocation.country,
    });
    setSaving(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't save location", outcome.message);
      return;
    }
    setLocation(nextLocation);
    // Rebuild rank with the labs we already have loaded.
    void loadActiveLabs().then((labsOutcome) => {
      if (labsOutcome.ok) {
        setRanked(rankLabsForUser(labsOutcome.rows, nextLocation));
      }
    });
  }

  async function confirmBooking() {
    if (!userId || !selectedTest || !selectedLab || booking) return;
    setBooking(true);
    const outcome = await bookLabOrder({
      userId,
      testOrderId: selectedTest.id,
      labId: selectedLab.lab.id,
      bookingSlotAt: slotAt.trim() ? new Date(slotAt).toISOString() : null,
    });
    setBooking(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't book this test", outcome.message);
      return;
    }
    setBookedLabOrderId(outcome.labOrderId);
    setStep("booked");
  }

  function resetFlow() {
    setSelectedTest(null);
    setSelectedLab(null);
    setSlotAt("");
    setBookedLabOrderId(null);
    setStep("pick_test");
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Book a test" onBack={() => router.back()} />

      {state === "loading" ? (
        <View style={{ marginTop: spacing.md }}>
          <StaticSkeleton rows={2} />
        </View>
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't start booking</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </GlassCard>
      ) : null}

      {state === "ready" && step === "pick_test" ? (
        <PickTestSection
          tests={tests}
          onSelect={(test) => {
            setSelectedTest(test);
            setStep("pick_lab");
          }}
        />
      ) : null}

      {state === "ready" && step === "pick_lab" && selectedTest ? (
        <PickLabSection
          test={selectedTest}
          ranked={rankedForSelection}
          location={location}
          postcode={postcodeInput}
          country={countryInput}
          saving={saving}
          onPostcodeChange={setPostcodeInput}
          onCountryChange={setCountryInput}
          onSaveLocation={saveLocation}
          onBack={() => {
            setSelectedTest(null);
            setStep("pick_test");
          }}
          onSelect={(lab) => {
            setSelectedLab(lab);
            setStep("confirm");
          }}
        />
      ) : null}

      {state === "ready" && step === "confirm" && selectedTest && selectedLab ? (
        <ConfirmSection
          test={selectedTest}
          lab={selectedLab}
          slotAt={slotAt}
          onSlotChange={setSlotAt}
          booking={booking}
          onBack={() => setStep("pick_lab")}
          onConfirm={confirmBooking}
        />
      ) : null}

      {state === "ready" && step === "booked" && selectedLab ? (
        <BookedSection
          lab={selectedLab}
          labOrderId={bookedLabOrderId}
          onOpenOrders={() => router.replace(routes.orders)}
          onBookAnother={resetFlow}
        />
      ) : null}
    </Screen>
  );
}

function PickTestSection({
  tests,
  onSelect,
}: {
  tests: TestOrderSummary[];
  onSelect: (test: TestOrderSummary) => void;
}) {
  if (tests.length === 0) {
    return (
      <EmptyState
        icon="clipboard"
        heading="No tests to book"
        explanation="Your plan doesn't have any recommended tests waiting. Once new tests are recommended they'll appear here."
      />
    );
  }
  return (
    <View style={styles.section}>
      <Text style={styles.stepLabel}>Step 1 of 3</Text>
      <Text style={styles.sectionHeading}>Which test?</Text>
      {tests.map((test) => (
        <Pressable
          key={test.id}
          onPress={() => onSelect(test)}
          accessibilityRole="button"
          style={styles.pickerRow}
        >
          <GlassCard intensity="card" style={styles.card}>
            <Text style={styles.cardTitle}>{test.test_name}</Text>
            <Text style={styles.meta}>Tier {test.test_tier}</Text>
            {test.trigger_reason ? (
              <Text style={styles.subtle}>{test.trigger_reason}</Text>
            ) : null}
          </GlassCard>
        </Pressable>
      ))}
    </View>
  );
}

function PickLabSection({
  test,
  ranked,
  location,
  postcode,
  country,
  saving,
  onPostcodeChange,
  onCountryChange,
  onSaveLocation,
  onBack,
  onSelect,
}: {
  test: TestOrderSummary;
  ranked: RankedLab[];
  location: UserLocation;
  postcode: string;
  country: string;
  saving: boolean;
  onPostcodeChange: (value: string) => void;
  onCountryChange: (value: string) => void;
  onSaveLocation: () => void;
  onBack: () => void;
  onSelect: (lab: RankedLab) => void;
}) {
  const locationOk = locationIsSet(location);
  return (
    <View style={styles.section}>
      <Text style={styles.stepLabel}>Step 2 of 3</Text>
      <Text style={styles.sectionHeading}>Pick a lab for “{test.test_name}”</Text>

      <GlassCard intensity="card" style={styles.locationCard}>
        <Text style={styles.subHeading}>Where are you?</Text>
        <Text style={styles.subtle}>
          Country + postcode help us rank nearby labs first. You can leave the
          postcode blank if you only want country-wide results.
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <TextInput
              label="Country (ISO)"
              placeholder="IN, GB, US…"
              value={country}
              onChangeText={onCountryChange}
              autoCapitalize="characters"
              maxLength={2}
            />
          </View>
          <View style={{ flex: 2 }}>
            <TextInput
              label="Postcode"
              placeholder="400001 / SW1A 1AA"
              value={postcode}
              onChangeText={onPostcodeChange}
            />
          </View>
        </View>
        <SecondaryButton
          title="Save location"
          loading={saving}
          onPress={onSaveLocation}
        />
      </GlassCard>

      {!locationOk ? (
        <Text style={styles.helper}>
          Set your country to filter labs. Until then, everything is shown by
          name.
        </Text>
      ) : null}

      {ranked.length === 0 ? (
        <EmptyState
          icon="map-pin"
          heading="No labs available"
          explanation="No labs in the library match your location yet. Ask us to add one."
        />
      ) : (
        ranked.map((entry) => (
          <Pressable
            key={entry.lab.id}
            onPress={() => onSelect(entry)}
            accessibilityRole="button"
            style={styles.pickerRow}
          >
            <GlassCard intensity="card" style={styles.card}>
              <View style={styles.headerRow}>
                <Text style={styles.cardTitle}>{entry.lab.name}</Text>
                {entry.score >= 4 ? (
                  <Feather
                    name="star"
                    size={16}
                    color={colors.primaryBlue}
                  />
                ) : null}
              </View>
              <Text style={styles.meta}>{matchReasonLabel(entry.match_reason)}</Text>
              {entry.lab.postcode || entry.lab.country ? (
                <Text style={styles.subtle}>
                  {[entry.lab.postcode, entry.lab.country]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
              {entry.lab.price !== null ? (
                <Text style={styles.subtle}>
                  from {entry.lab.currency} {entry.lab.price}
                </Text>
              ) : null}
            </GlassCard>
          </Pressable>
        ))
      )}

      <SecondaryButton title="Back to tests" onPress={onBack} />
    </View>
  );
}

function ConfirmSection({
  test,
  lab,
  slotAt,
  onSlotChange,
  booking,
  onBack,
  onConfirm,
}: {
  test: TestOrderSummary;
  lab: RankedLab;
  slotAt: string;
  onSlotChange: (value: string) => void;
  booking: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.stepLabel}>Step 3 of 3</Text>
      <Text style={styles.sectionHeading}>Confirm booking</Text>

      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.subHeading}>Test</Text>
        <Text style={styles.body}>
          {test.test_name} · tier {test.test_tier}
        </Text>
      </GlassCard>

      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.subHeading}>Lab</Text>
        <Text style={styles.body}>{lab.lab.name}</Text>
        {lab.lab.postcode || lab.lab.country ? (
          <Text style={styles.subtle}>
            {[lab.lab.postcode, lab.lab.country].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
        {lab.lab.price !== null ? (
          <Text style={styles.subtle}>
            from {lab.lab.currency} {lab.lab.price}
          </Text>
        ) : null}
      </GlassCard>

      <TextInput
        label="Preferred slot (optional)"
        placeholder="YYYY-MM-DDTHH:MM"
        value={slotAt}
        onChangeText={onSlotChange}
        hint="Leave blank if you'd like the lab to reach out with times."
      />

      <PrimaryButton
        title="Confirm booking"
        loading={booking}
        onPress={onConfirm}
      />
      <SecondaryButton title="Back" onPress={onBack} />
    </View>
  );
}

function BookedSection({
  lab,
  labOrderId,
  onOpenOrders,
  onBookAnother,
}: {
  lab: RankedLab;
  labOrderId: string | null;
  onOpenOrders: () => void;
  onBookAnother: () => void;
}) {
  return (
    <View style={styles.section}>
      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.subHeading}>Booked</Text>
        <Text style={styles.body}>
          {lab.lab.name} has been sent your request. We'll confirm the slot
          out-of-band and update your orders list.
        </Text>
        {labOrderId ? (
          <Text style={styles.subtle}>Reference: {labOrderId}</Text>
        ) : null}
      </GlassCard>
      <PrimaryButton title="See my orders" onPress={onOpenOrders} />
      <SecondaryButton title="Book another test" onPress={onBookAnother} />
    </View>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    marginTop: spacing.md,
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  errorHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 16,
    color: colors.riskHigh,
    marginBottom: spacing.micro,
  },
  errorBody: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.slate,
  },
  section: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  stepLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    color: colors.primaryBlue,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeading: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    color: colors.deepNavy,
    marginBottom: spacing.sm,
  },
  subHeading: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.slate,
    marginBottom: spacing.micro,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerRow: {},
  card: {
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    color: colors.deepNavy,
    flex: 1,
  },
  meta: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.primaryBlue,
    marginTop: spacing.micro,
  },
  subtle: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginTop: spacing.micro,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 14,
    color: colors.charcoal,
  },
  locationCard: {
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  helper: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
});
