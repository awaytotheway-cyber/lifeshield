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

import {
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "@/components/ui/Button";
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
  createGeneticOrder,
  humanSampleType,
  loadActiveGeneticTests,
  loadOwnGeneticOrders,
  type GeneticOrderRow,
  type GeneticTestRow,
  type ShippingAddress,
} from "@/lib/genetic-tests-io";
import { loadOwnLocation } from "@/lib/labs-io";
import { fontFamily } from "@/lib/typography";
import { routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth-store";

type LoadState = "idle" | "loading" | "ready" | "error";
type Step = "pick_test" | "shipping" | "confirm" | "booked";

function humanStatus(status: GeneticOrderRow["status"]): string {
  switch (status) {
    case "pending_manual":
      return "Requested — we'll be in touch";
    case "created":
      return "Order created";
    case "kit_dispatched":
      return "Kit dispatched";
    case "sample_received":
      return "Sample received";
    case "processing":
      return "Processing";
    case "resulted":
      return "Results ready";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export default function GeneticTestingScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [state, setState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);

  const [tests, setTests] = useState<GeneticTestRow[]>([]);
  const [orders, setOrders] = useState<GeneticOrderRow[]>([]);

  const [step, setStep] = useState<Step>("pick_test");
  const [selectedTest, setSelectedTest] = useState<GeneticTestRow | null>(null);
  const [address, setAddress] = useState<ShippingAddress>({
    name: "",
    line1: "",
    line2: "",
    city: "",
    region: "",
    postcode: "",
    country: "",
  });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newOrderId, setNewOrderId] = useState<string | null>(null);

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
        loadActiveGeneticTests(),
        loadOwnGeneticOrders(userId),
        loadOwnLocation(userId),
      ]).then(([testsOutcome, ordersOutcome, locationOutcome]) => {
        if (cancelled) return;
        if (!testsOutcome.ok) {
          setErrorMessage(testsOutcome.message);
          setState("error");
          return;
        }
        setTests(testsOutcome.rows);
        setOrders(ordersOutcome.ok ? ordersOutcome.rows : []);
        // Prefill country + postcode from the profile so the shipping form
        // isn't blank when the user has already set them via Phase D.
        if (locationOutcome.ok) {
          setAddress((current) => ({
            ...current,
            postcode: current.postcode || (locationOutcome.location.location_postcode ?? ""),
            country: current.country || (locationOutcome.location.location_country ?? ""),
          }));
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
      ? FEATURE_FLAG_DEFAULTS.genetic_testing_v1
      : isFeatureEnabled(profile, "genetic_testing_v1");

  const testsById = useMemo(() => {
    const map = new Map<string, GeneticTestRow>();
    for (const t of tests) map.set(t.id, t);
    return map;
  }, [tests]);

  if (!session) return <Redirect href={routes.login} />;

  if (!enabled) {
    return (
      <Screen scroll>
        <ScreenHeader title="Genetic testing" onBack={() => router.back()} />
        <EmptyState
          icon="share-2"
          heading="Genetic testing is coming soon"
          explanation="This feature is behind a flag while we finalise a partner. Ask us to switch it on for your account."
        />
      </Screen>
    );
  }

  function resetFlow() {
    setSelectedTest(null);
    setNotes("");
    setNewOrderId(null);
    setStep("pick_test");
  }

  async function onConfirm() {
    if (!userId || !selectedTest) return;
    setSubmitting(true);
    const outcome = await createGeneticOrder({
      userId,
      geneticTestId: selectedTest.id,
      shippingAddress: {
        ...address,
        // Normalise country upper-case on submit; the DB CHECK enforces it.
        country: address.country.trim().toUpperCase(),
      },
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (!outcome.ok) {
      Alert.alert("Couldn't place order", outcome.message);
      return;
    }
    setOrders((current) => [outcome.row, ...current]);
    setNewOrderId(outcome.row.id);
    setStep("booked");
  }

  return (
    <Screen scroll>
      <ScreenHeader title="Genetic testing" onBack={() => router.back()} />

      {state === "loading" ? (
        <View style={{ marginTop: spacing.md }}>
          <StaticSkeleton rows={2} />
        </View>
      ) : null}

      {state === "error" && errorMessage ? (
        <GlassCard intensity="card" style={styles.errorCard}>
          <Text style={styles.errorHeading}>Couldn't load genetic tests</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </GlassCard>
      ) : null}

      {state === "ready" && step === "pick_test" ? (
        <>
          <PickTestSection
            tests={tests}
            onSelect={(test) => {
              setSelectedTest(test);
              setStep("shipping");
            }}
          />
          <OrdersHistory orders={orders} testsById={testsById} />
        </>
      ) : null}

      {state === "ready" && step === "shipping" && selectedTest ? (
        <ShippingSection
          test={selectedTest}
          address={address}
          notes={notes}
          onAddressChange={setAddress}
          onNotesChange={setNotes}
          onBack={() => setStep("pick_test")}
          onContinue={() => setStep("confirm")}
        />
      ) : null}

      {state === "ready" && step === "confirm" && selectedTest ? (
        <ConfirmSection
          test={selectedTest}
          address={address}
          notes={notes}
          submitting={submitting}
          onBack={() => setStep("shipping")}
          onConfirm={onConfirm}
        />
      ) : null}

      {state === "ready" && step === "booked" && selectedTest ? (
        <BookedSection
          test={selectedTest}
          labOrderId={newOrderId}
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
  tests: GeneticTestRow[];
  onSelect: (test: GeneticTestRow) => void;
}) {
  if (tests.length === 0) {
    return (
      <EmptyState
        icon="share-2"
        heading="No panels available"
        explanation="The catalogue is empty. Ask us to add one, or check back once we've published our first panels."
      />
    );
  }
  return (
    <View style={styles.section}>
      <Text style={styles.stepLabel}>Step 1 of 3</Text>
      <Text style={styles.sectionHeading}>Choose a panel</Text>
      {tests.map((test) => (
        <Pressable
          key={test.id}
          onPress={() => onSelect(test)}
          accessibilityRole="button"
        >
          <GlassCard intensity="card" style={styles.card}>
            <Text style={styles.cardTitle}>{test.name}</Text>
            {test.description ? (
              <Text style={styles.subtle}>{test.description}</Text>
            ) : null}
            <Text style={styles.meta}>
              {humanSampleType(test.sample_type)}
              {test.turnaround_days
                ? ` · ${test.turnaround_days}-day turnaround`
                : ""}
            </Text>
            {test.price !== null ? (
              <Text style={styles.subtle}>
                {test.currency} {test.price}
              </Text>
            ) : null}
          </GlassCard>
        </Pressable>
      ))}
    </View>
  );
}

function ShippingSection({
  test,
  address,
  notes,
  onAddressChange,
  onNotesChange,
  onBack,
  onContinue,
}: {
  test: GeneticTestRow;
  address: ShippingAddress;
  notes: string;
  onAddressChange: (next: ShippingAddress) => void;
  onNotesChange: (value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const set = <K extends keyof ShippingAddress>(
    key: K,
    value: ShippingAddress[K],
  ) => onAddressChange({ ...address, [key]: value });

  return (
    <View style={styles.section}>
      <Text style={styles.stepLabel}>Step 2 of 3</Text>
      <Text style={styles.sectionHeading}>Where should we send “{test.name}”?</Text>

      <TextInput
        label="Full name"
        value={address.name}
        onChangeText={(v) => set("name", v)}
        placeholder="Full name for the delivery"
      />
      <TextInput
        label="Address line 1"
        value={address.line1}
        onChangeText={(v) => set("line1", v)}
      />
      <TextInput
        label="Address line 2 (optional)"
        value={address.line2 ?? ""}
        onChangeText={(v) => set("line2", v)}
      />
      <View style={styles.row}>
        <View style={{ flex: 2 }}>
          <TextInput
            label="City"
            value={address.city}
            onChangeText={(v) => set("city", v)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            label="Region (optional)"
            value={address.region ?? ""}
            onChangeText={(v) => set("region", v)}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 2 }}>
          <TextInput
            label="Postcode"
            value={address.postcode}
            onChangeText={(v) => set("postcode", v)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TextInput
            label="Country (ISO)"
            value={address.country}
            onChangeText={(v) => set("country", v)}
            autoCapitalize="characters"
            maxLength={2}
          />
        </View>
      </View>
      <TextInput
        label="Notes (optional)"
        value={notes}
        onChangeText={onNotesChange}
        placeholder="Anything the courier or lab should know."
      />

      <View style={styles.actions}>
        <PrimaryButton title="Continue" onPress={onContinue} />
        <SecondaryButton title="Back" onPress={onBack} />
      </View>
    </View>
  );
}

function ConfirmSection({
  test,
  address,
  notes,
  submitting,
  onBack,
  onConfirm,
}: {
  test: GeneticTestRow;
  address: ShippingAddress;
  notes: string;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.stepLabel}>Step 3 of 3</Text>
      <Text style={styles.sectionHeading}>Confirm order</Text>

      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.subHeading}>Panel</Text>
        <Text style={styles.body}>
          {test.name} · {humanSampleType(test.sample_type)}
        </Text>
        {test.price !== null ? (
          <Text style={styles.subtle}>
            {test.currency} {test.price}
            {test.turnaround_days
              ? ` · ~${test.turnaround_days} day turnaround`
              : ""}
          </Text>
        ) : null}
      </GlassCard>

      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.subHeading}>Ship to</Text>
        <Text style={styles.body}>{address.name}</Text>
        <Text style={styles.body}>{address.line1}</Text>
        {address.line2 ? <Text style={styles.body}>{address.line2}</Text> : null}
        <Text style={styles.body}>
          {[address.city, address.region].filter(Boolean).join(", ")}
        </Text>
        <Text style={styles.body}>
          {address.postcode} · {address.country.toUpperCase()}
        </Text>
      </GlassCard>

      {notes ? (
        <GlassCard intensity="card" style={styles.card}>
          <Text style={styles.subHeading}>Notes</Text>
          <Text style={styles.body}>{notes}</Text>
        </GlassCard>
      ) : null}

      <Text style={styles.helper}>
        Payment isn't collected here yet — we'll be in touch to arrange it and
        confirm the kit shipment.
      </Text>

      <View style={styles.actions}>
        <PrimaryButton
          title="Confirm order"
          loading={submitting}
          onPress={onConfirm}
        />
        <SecondaryButton title="Back" onPress={onBack} />
      </View>
    </View>
  );
}

function BookedSection({
  test,
  labOrderId,
  onBookAnother,
}: {
  test: GeneticTestRow;
  labOrderId: string | null;
  onBookAnother: () => void;
}) {
  return (
    <View style={styles.section}>
      <GlassCard intensity="card" style={styles.card}>
        <Text style={styles.subHeading}>Order raised</Text>
        <Text style={styles.body}>
          Your request for {test.name} is in the queue. We'll contact you to
          confirm payment and shipping.
        </Text>
        {labOrderId ? (
          <Text style={styles.subtle}>Reference: {labOrderId}</Text>
        ) : null}
      </GlassCard>
      <SecondaryButton title="Order another panel" onPress={onBookAnother} />
    </View>
  );
}

function OrdersHistory({
  orders,
  testsById,
}: {
  orders: GeneticOrderRow[];
  testsById: Map<string, GeneticTestRow>;
}) {
  if (orders.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionHeading}>Your orders</Text>
      {orders.map((order) => {
        const test = testsById.get(order.genetic_test_id);
        return (
          <GlassCard key={order.id} intensity="card" style={styles.card}>
            <Text style={styles.cardTitle}>
              {test?.name ?? "Panel"}
            </Text>
            <Text style={styles.meta}>{humanStatus(order.status)}</Text>
            <Text style={styles.subtle}>
              Ordered {new Date(order.ordered_at).toLocaleDateString()}
            </Text>
            {order.tracking ? (
              <Text style={styles.subtle}>Tracking: {order.tracking}</Text>
            ) : null}
          </GlassCard>
        );
      })}
      <TextButton
        title="Refresh"
        onPress={() => {
          // Focus effect re-fetches on next entry; nothing else to do here.
        }}
      />
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
  card: {
    padding: spacing.base,
    borderRadius: radius.card,
    ...shadows.card,
  },
  cardTitle: {
    fontFamily: fontFamily.display,
    fontSize: 17,
    color: colors.deepNavy,
  },
  meta: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
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
  row: { flexDirection: "row", gap: spacing.sm },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  helper: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
    marginTop: spacing.sm,
  },
});
