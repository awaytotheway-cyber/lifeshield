import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { PurchaseStatus } from "@/components/store/ProductCard";
import {
  IconButton,
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { Surface } from "@/components/ui/Surface";
import { TwoTone } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import { hrefForConsent } from "@/lib/consent-flow";
import {
  colors,
  heroGradient,
  radius,
  spacing,
  status,
} from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { canPurchase, consentTypeForProduct, type UserContext } from "@/lib/purchase-gates";
import { routes } from "@/lib/routes";
import {
  addToCart,
  formatProductPrice,
  loadProductById,
  type ProductRow,
} from "@/lib/store";
import {
  contraindicationWarnings,
  isSubscribable,
  parseSubscriptionOptions,
  parseSupportingStudies,
  type ContraindicationWarning,
  type StudyCitation,
  type SubscriptionOptions,
} from "@/lib/supplements";
import {
  loadOwnMedications,
  loadProductSupplementMeta,
  toMedicationLites,
} from "@/lib/supplements-io";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { loadUserContext } from "@/lib/user-context";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * Sand, borrowed from `worthWatching`. A medication interaction is a caution,
 * not a crash: Moss has no alert red, here least of all.
 */
const SAND = status.worthWatching;

/** 155deg on the unit box — the same band home, onboarding and auth use. */
const GRADIENT_START = { x: 0.29, y: 0.05 };
const GRADIENT_END = { x: 0.71, y: 0.95 };

/** The product name, at the board's 36 on the display scale. */
const NAME_SIZE = 36;

/**
 * The total, at the board's 28 with tracking at -3% of the size. It is a price
 * rather than a headline, so it is plain `Text` and not `TwoTone`.
 */
const TOTAL = {
  fontFamily: fontFamily.display,
  fontSize: 28,
  lineHeight: 28,
  // 28 x -0.03
  letterSpacing: -0.8,
} as const;

/**
 * Product detail — checkpoint 1 of 3 for canPurchase() (add-to-cart).
 */
export default function ProductDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const productId = typeof id === "string" ? id : "";
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductRow | null>(null);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [triggerFindings, setTriggerFindings] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<FeatureFlagProfile | null>(null);
  const [warnings, setWarnings] = useState<ContraindicationWarning[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionOptions>({
    intervals: [],
    discount_percent: null,
  });
  const [studies, setStudies] = useState<StudyCitation[]>([]);

  const load = useCallback(async () => {
    if (!session?.user.id || !productId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [catalog, contextResult] = await Promise.all([
        loadProductById(productId),
        loadUserContext(session.user.id),
      ]);
      if (!catalog.ok) {
        setMessage(catalog.message);
        setProduct(null);
      } else {
        setMessage(null);
        setProduct(catalog.products[0] ?? null);
      }
      if (!contextResult.ok) {
        setUserContext(null);
        setTriggerFindings([]);
        if (catalog.ok) {
          setMessage(contextResult.message);
        }
      } else {
        setUserContext(contextResult.context);
        setTriggerFindings(contextResult.triggerFindings);
      }
    } catch {
      setMessage(COPY.storeLoadFailed);
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, productId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Phase E: read the profile's feature flags so the Phase E sections stay
  // hidden by default. A failed lookup keeps the flag at its compile-time
  // default (off).
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || !isSupabaseConfigured) return;
    let cancelled = false;
    void supabase
      .from("profiles")
      .select("feature_flags")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile((data ?? { feature_flags: {} }) as FeatureFlagProfile);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  const supplementsEnabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.supplements_v2
      : isFeatureEnabled(profile, "supplements_v2");

  // When Phase E is on, fetch the product's supplement metadata + the
  // user's medications in parallel. Do this only for supplement-typed
  // products — the test-tier catalogue rows never carry supplement metadata.
  useEffect(() => {
    if (
      !supplementsEnabled ||
      !session?.user.id ||
      !product ||
      product.product_type !== "supplement"
    ) {
      setWarnings([]);
      setSubscription({ intervals: [], discount_percent: null });
      setStudies([]);
      return;
    }
    let cancelled = false;
    void Promise.all([
      loadProductSupplementMeta(product.id),
      loadOwnMedications(session.user.id),
    ]).then(([meta, medsOutcome]) => {
      if (cancelled) return;
      const codes = meta?.contraindication_codes ?? [];
      const meds = medsOutcome.ok
        ? toMedicationLites(medsOutcome.rows)
        : [];
      setWarnings(contraindicationWarnings(codes, meds));
      setSubscription(parseSubscriptionOptions(meta?.subscription_options));
      setStudies(parseSupportingStudies(meta?.supporting_studies));
    });
    return () => {
      cancelled = true;
    };
  }, [supplementsEnabled, session?.user.id, product]);

  const gate =
    product && userContext ? canPurchase(product, userContext) : null;
  const canAdd = gate?.allowed && !gate?.needsCheck;

  /**
   * The board's badge on the hero. It is only drawn when this product really
   * is linked to a finding on the user's own plan — an assessment claim the
   * data cannot back is worse than no badge.
   */
  const matchesPlan = Boolean(
    product?.linked_finding && triggerFindings.includes(product.linked_finding),
  );

  const handleAdd = async () => {
    if (!session?.user.id || !product || !gate || !canAdd) {
      return;
    }
    setActionMessage(null);
    setAdding(true);
    try {
      const result = await addToCart(session.user.id, product.id);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setActionMessage(COPY.storeAdded);
    } catch {
      setActionMessage(COPY.storeAddFailed);
    } finally {
      setAdding(false);
    }
  };

  const goConsent = () => {
    if (!product) {
      return;
    }
    const consentType = consentTypeForProduct(product);
    if (consentType) {
      router.push(hrefForConsent(consentType));
    }
  };

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  if (!productId) {
    return (
      <Screen>
        <Text style={styles.errorCentred}>{COPY.storeProductMissing}</Text>
        <PrimaryButton
          title={COPY.storeBackStore}
          onPress={() => {
            router.replace(routes.store);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentPadding={0}>
      {/*
        The one gradient on this screen. Nothing but the way back and the
        plan badge sits on it — no body copy, no price, no control.
      */}
      <LinearGradient
        colors={heroGradient.colors}
        locations={heroGradient.locations}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.hero}
      >
        <View style={styles.heroRow}>
          <IconButton
            icon="arrow-left"
            accessibilityLabel={COPY.storeBackStore}
            onPress={() => {
              router.back();
            }}
            style={styles.heroBack}
          />
          {matchesPlan ? (
            <View style={styles.matchChip}>
              <Text style={styles.matchChipText}>Matches your assessment</Text>
            </View>
          ) : null}
        </View>
      </LinearGradient>

      {/* The white sheet rides 24 up over the band. Fill, not shadow, lifts it. */}
      <View style={styles.sheet}>
        {loading ? <StaticSkeleton rows={4} /> : null}

        {message ? (
          <>
            <Text style={styles.error}>{message}</Text>
            <TextButton
              title={COPY.storeRetry}
              onPress={() => {
                void load();
              }}
            />
          </>
        ) : null}

        {!loading && product ? (
          <>
            <View accessibilityRole="header">
              <TwoTone
                size={NAME_SIZE}
                parts={[{ text: product.plain_name, tone: "bold" }]}
              />
            </View>

            <Text style={styles.body}>
              {product.plain_description?.trim() ||
                "Information to discuss with a practitioner — not a diagnosis."}
            </Text>

            {/* The exact clinical name, kept on the detail screen where the
                design language says it belongs — never on a list row. */}
            {product.clinical_name.trim() ? (
              <View style={styles.clinicalBlock}>
                <Text style={styles.eyebrow}>Clinical name</Text>
                <Text style={styles.clinicalName}>{product.clinical_name}</Text>
              </View>
            ) : null}

            <View style={styles.why}>
              <Text style={styles.whyEyebrow}>{COPY.productClinicalBasis}</Text>
              <Text style={styles.whyBody}>
                {product.linked_finding?.trim() ||
                  product.clinical_name ||
                  COPY.productNoBasis}
              </Text>
            </View>

            {/*
              The interaction warnings, in full and never collapsed. This is
              the surface that tells someone a supplement meets a medicine
              they are already on, so it is open on arrival.
            */}
            {supplementsEnabled && warnings.length > 0 ? (
              <View style={styles.caution}>
                <Text style={styles.cautionTitle}>
                  Practitioner check recommended
                </Text>
                {warnings.map((warning) => (
                  <Text key={warning.code} style={styles.cautionLine}>
                    • Interacts with{" "}
                    <Text style={styles.cautionStrong}>{warning.code}</Text> —
                    you&apos;re on {warning.medication_names.join(", ")}.
                  </Text>
                ))}
                <Text style={styles.cautionLine}>
                  Talk to your practitioner before starting this.
                </Text>
              </View>
            ) : null}

            {supplementsEnabled && isSubscribable(subscription) ? (
              <Surface style={styles.block}>
                <Text style={styles.eyebrow}>Subscribe &amp; save</Text>
                <Text style={styles.blockBody}>
                  Available intervals: {subscription.intervals.join(", ")}
                  {subscription.discount_percent !== null
                    ? ` · ${subscription.discount_percent}% off`
                    : ""}
                </Text>
                <Text style={styles.blockNote}>
                  Subscription checkout is coming soon — add to cart as a
                  one-off for now.
                </Text>
              </Surface>
            ) : null}

            {supplementsEnabled && studies.length > 0 ? (
              <Surface style={styles.block}>
                <Text style={styles.eyebrow}>Supporting studies</Text>
                {studies.map((study, index) => (
                  <Pressable
                    key={index}
                    accessibilityRole="link"
                    accessibilityLabel={study.title}
                    style={styles.studyRow}
                    onPress={() => {
                      void Linking.openURL(study.url).catch(() => {
                        // Silent — the store still works if the URL can't open.
                      });
                    }}
                  >
                    <Text style={styles.studyTitle}>{study.title}</Text>
                    {study.source || study.year ? (
                      <Text style={styles.studyMeta}>
                        {[study.source, study.year].filter(Boolean).join(" · ")}
                      </Text>
                    ) : null}
                  </Pressable>
                ))}
              </Surface>
            ) : null}

            {gate ? <PurchaseStatus gate={gate} /> : null}

            {actionMessage ? (
              <Text style={styles.ok}>{actionMessage}</Text>
            ) : null}

            <View style={styles.payRow}>
              <View style={styles.totalBlock}>
                <Text style={styles.eyebrow}>Total</Text>
                <Text style={styles.total}>{formatProductPrice(product)}</Text>
              </View>
              {/* The one black button on this screen. */}
              <PrimaryButton
                title={COPY.productAddToCart}
                disabled={!canAdd}
                loading={adding}
                style={styles.payButton}
                onPress={() => {
                  void handleAdd();
                }}
              />
            </View>

            {gate &&
            !gate.allowed &&
            product.requires_consent &&
            consentTypeForProduct(product) ? (
              <SecondaryButton
                title={COPY.storeGoConsent}
                onPress={goConsent}
              />
            ) : null}
          </>
        ) : null}

        <TextButton
          title={COPY.storeViewCart}
          onPress={() => {
            router.push(routes.storeCart);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 232,
    // Cancels the Screen's own 16pt scroll lead so the band meets the safe
    // area instead of leaving a strip of paper above it.
    marginTop: -16,
    paddingTop: 12,
    paddingHorizontal: spacing.screenX,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBack: {
    marginLeft: -12,
  },
  matchChip: {
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  matchChipText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 12,
    lineHeight: 16,
    color: status.withinRange.text,
  },
  sheet: {
    marginTop: -24,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
    paddingHorizontal: spacing.screenX,
    paddingTop: 28,
    paddingBottom: 28,
  },
  body: {
    marginTop: spacing.base,
    ...typography.body,
    lineHeight: 24,
    color: colors.inkSoft,
  },
  clinicalBlock: {
    marginTop: spacing.base,
  },
  clinicalName: {
    marginTop: spacing.micro,
    fontFamily: fontFamily.medical,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  why: {
    marginTop: spacing.md,
    backgroundColor: colors.mossTint,
    borderRadius: radius.surface,
    padding: 18,
  },
  whyEyebrow: {
    ...typography.micro,
    color: status.withinRange.text,
  },
  whyBody: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  caution: {
    marginTop: spacing.base,
    backgroundColor: SAND.fill,
    borderRadius: radius.surface,
    padding: 18,
  },
  cautionTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    lineHeight: 22,
    color: SAND.text,
  },
  cautionLine: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.ink,
  },
  cautionStrong: {
    fontFamily: fontFamily.bodySemi,
  },
  // White on paper does the separating everywhere else; inside this white
  // sheet it is the other way round, so a block takes the paper fill.
  block: {
    marginTop: spacing.base,
    backgroundColor: colors.paper,
  },
  blockBody: {
    marginTop: spacing.sm,
    ...typography.body,
    color: colors.ink,
  },
  blockNote: {
    marginTop: spacing.micro,
    ...typography.label,
    color: colors.inkSoft,
  },
  studyRow: {
    marginTop: spacing.mdSm,
  },
  studyTitle: {
    ...typography.body,
    color: colors.ink,
    textDecorationLine: "underline",
  },
  studyMeta: {
    marginTop: 2,
    ...typography.label,
    color: colors.inkMuted,
  },
  payRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  totalBlock: {
    flexShrink: 0,
  },
  total: {
    marginTop: 2,
    ...TOTAL,
    color: colors.ink,
  },
  payButton: {
    flex: 1,
    width: "auto",
    marginTop: 0,
  },
  ok: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: colors.mossDeep,
  },
  error: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: CLAY,
  },
  errorCentred: {
    ...typography.body,
    textAlign: "center",
    color: CLAY,
  },
});
