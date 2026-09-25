import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { PurchaseStatus } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { hrefForConsent } from "@/lib/consent-flow";
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
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

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
        if (catalog.ok) {
          setMessage(contextResult.message);
        }
      } else {
        setUserContext(contextResult.context);
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
        <Text className="text-center text-coral">{COPY.storeProductMissing}</Text>
        <Button
          title={COPY.storeBackStore}
          onPress={() => {
            router.replace(routes.store);
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      {loading ? <ActivityIndicator color="#1A535C" /> : null}

      {message ? (
        <>
          <Text className="text-center text-coral">{message}</Text>
          <Button
            title={COPY.storeRetry}
            variant="ghost"
            onPress={() => {
              void load();
            }}
          />
        </>
      ) : null}

      {!loading && product ? (
        <>
          <ClinicalTerm
            plainName={product.plain_name}
            plainExplanation={
              product.plain_description?.trim() ||
              "Information to discuss with a practitioner — not a diagnosis."
            }
            medicalName={product.clinical_name}
          />

          <View className="mt-4 rounded-xl bg-white px-4 py-4">
            <Text className="text-sm text-teal">{COPY.productClinicalBasis}</Text>
            <Text className="mt-2 text-charcoal">
              {product.linked_finding?.trim() ||
                product.clinical_name ||
                COPY.productNoBasis}
            </Text>
          </View>

          {supplementsEnabled && warnings.length > 0 ? (
            <View
              className="mt-4 rounded-xl px-4 py-4"
              style={{ backgroundColor: "#FDECEC" }}
            >
              <Text
                className="text-sm"
                style={{ color: "#C0392B", fontWeight: "600" }}
              >
                Practitioner check recommended
              </Text>
              {warnings.map((warning) => (
                <Text key={warning.code} className="mt-2 text-charcoal">
                  • Interacts with{" "}
                  <Text style={{ fontWeight: "600" }}>{warning.code}</Text> —
                  you're on {warning.medication_names.join(", ")}.
                </Text>
              ))}
              <Text className="mt-2 text-xs text-charcoal">
                Talk to your practitioner before starting this.
              </Text>
            </View>
          ) : null}

          {supplementsEnabled && isSubscribable(subscription) ? (
            <View className="mt-4 rounded-xl bg-white px-4 py-4">
              <Text className="text-sm text-teal">Subscribe &amp; save</Text>
              <Text className="mt-2 text-charcoal">
                Available intervals: {subscription.intervals.join(", ")}
                {subscription.discount_percent !== null
                  ? ` · ${subscription.discount_percent}% off`
                  : ""}
              </Text>
              <Text className="mt-1 text-xs text-charcoal">
                Subscription checkout is coming soon — add to cart as a
                one-off for now.
              </Text>
            </View>
          ) : null}

          {supplementsEnabled && studies.length > 0 ? (
            <View className="mt-4 rounded-xl bg-white px-4 py-4">
              <Text className="text-sm text-teal">Supporting studies</Text>
              {studies.map((study, index) => (
                <Pressable
                  key={index}
                  accessibilityRole="link"
                  className="mt-2"
                  onPress={() => {
                    void Linking.openURL(study.url).catch(() => {
                      // Silent — the store still works if the URL can't open.
                    });
                  }}
                >
                  <Text className="text-charcoal underline">{study.title}</Text>
                  {study.source || study.year ? (
                    <Text className="text-xs text-teal">
                      {[study.source, study.year].filter(Boolean).join(" · ")}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : null}

          <Text className="mt-4 text-center text-2xl text-teal">
            {formatProductPrice(product)}
          </Text>

          {gate ? <PurchaseStatus gate={gate} /> : null}

          {actionMessage ? (
            <Text className="mt-4 text-center text-teal">{actionMessage}</Text>
          ) : null}

          <Button
            title={COPY.productAddToCart}
            disabled={!canAdd}
            loading={adding}
            onPress={() => {
              void handleAdd();
            }}
          />

          {gate && !gate.allowed && product.requires_consent && consentTypeForProduct(product) ? (
            <Button
              title={COPY.storeGoConsent}
              variant="ghost"
              onPress={goConsent}
            />
          ) : null}
        </>
      ) : null}

      <Button
        title={COPY.storeViewCart}
        variant="ghost"
        onPress={() => {
          router.push(routes.storeCart);
        }}
      />
      <Button
        title={COPY.storeBackStore}
        variant="ghost"
        onPress={() => {
          router.back();
        }}
      />
    </Screen>
  );
}
