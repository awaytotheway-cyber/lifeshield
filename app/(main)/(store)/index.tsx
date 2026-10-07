import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { ProductCard } from "@/components/store/ProductCard";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { FeaturedBanner } from "@/components/store/FeaturedBanner";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { hrefForConsent } from "@/lib/consent-flow";
import { COPY } from "@/lib/copy";
import {
  canPurchase,
  consentTypeForProduct,
  type UserContext,
} from "@/lib/purchase-gates";
import { productHref, routes } from "@/lib/routes";
import {
  addToCart,
  loadActiveProducts,
  loadCartItemCount,
  recommendedFromPlan,
  type ProductRow,
} from "@/lib/store";
import { loadUserContext } from "@/lib/user-context";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";
import { Accent, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

/**
 * Store — checkpoint 1 of 3 for canPurchase() (add-to-cart).
 * Cart load and checkout re-run the same gates before pay.
 */
export default function StoreScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [userContext, setUserContext] = useState<UserContext | null>(null);
  const [triggerFindings, setTriggerFindings] = useState<string[]>([]);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const refresh = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) {
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [catalog, contextResult, cartCountResult] = await Promise.all([
          loadActiveProducts(),
          loadUserContext(userId),
          loadCartItemCount(userId),
        ]);
        if (cancelled) {
          return;
        }
        if (!catalog.ok) {
          setMessage(catalog.message);
          setProducts([]);
        } else {
          setMessage(null);
          setProducts(catalog.products);
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
        if (cartCountResult.ok) {
          setCartCount(cartCountResult.count);
        } else {
          setCartCount(0);
        }
      } catch {
        if (!cancelled) {
          setMessage(COPY.storeLoadFailed);
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  useFocusEffect(refresh);

  const recommended = useMemo(
    () => recommendedFromPlan(products, triggerFindings).slice(0, 5),
    [products, triggerFindings],
  );

  const catalog = useMemo(() => {
    const recommendedIds = new Set(recommended.map((p) => p.id));
    return products
      .filter((p) => !recommendedIds.has(p.id))
      .filter((p) => typeFilter === "all" || p.product_type === typeFilter);
  }, [products, recommended, typeFilter]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.product_type) set.add(p.product_type);
    return Array.from(set);
  }, [products]);

  const handleAdd = async (product: ProductRow) => {
    if (!session?.user.id || !userContext) {
      return;
    }
    const gate = canPurchase(product, userContext);
    if (!gate.allowed) {
      const consentType = consentTypeForProduct(product);
      if (product.requires_consent && consentType) {
        router.push(hrefForConsent(consentType));
        return;
      }
      router.push(productHref(product.id));
      return;
    }
    if (gate.needsCheck) {
      router.push(productHref(product.id));
      return;
    }
    setActionMessage(null);
    setAddingId(product.id);
    try {
      const result = await addToCart(session.user.id, product.id);
      if (!result.ok) {
        setActionMessage(result.message);
        return;
      }
      setActionMessage(COPY.storeAdded);
      const countResult = await loadCartItemCount(session.user.id);
      if (countResult.ok) {
        setCartCount(countResult.count);
      }
    } catch {
      setActionMessage(COPY.storeAddFailed);
    } finally {
      setAddingId(null);
    }
  };

  const cartButtonTitle =
    cartCount > 0
      ? COPY.storeViewCartWithCount.replace("{count}", String(cartCount))
      : COPY.storeViewCart;

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  return (
    <Screen contentPadding={Measure.gutter} centered={false}>
      <ScreenHeader
        title={COPY.storeTitle}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.storeBackHome}
      />
      <Text style={styles.body}>{COPY.storeBody}</Text>

      {loading ? <StaticSkeleton rows={4} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.storeRetry} onPress={() => refresh()} />
        </>
      ) : null}

      {actionMessage ? <Text style={styles.ok}>{actionMessage}</Text> : null}

      {!loading && !message && userContext ? (
        <FlatList
          data={catalog}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.columns}
          ListHeaderComponent={
            <View>
              <FeaturedBanner
                title="Curated for your plan"
                subtitle="Supplements, tests and everyday swaps chosen from your results."
                ctaLabel="Browse all"
              />
              <View style={styles.bannerGap} />
              <SectionHeader title={COPY.storeRecommended} />
              {recommended.length === 0 ? (
                <EmptyState
                  icon="shopping-bag"
                  heading={COPY.storeRecommended}
                  explanation={COPY.storeRecommendedEmpty}
                />
              ) : (
                recommended.map((product) => (
                  <View key={product.id} style={styles.recGap}>
                    <ProductCard
                      product={product}
                      gate={canPurchase(product, userContext)}
                      layout="row"
                      onOpen={() => {
                        router.push(productHref(product.id));
                      }}
                      onAdd={() => {
                        void handleAdd(product);
                      }}
                      adding={addingId === product.id}
                    />
                  </View>
                ))
              )}
              <View style={styles.catalogHead}>
                <SectionHeader title={COPY.storeFullCatalog} />
              </View>
              {availableTypes.length > 1 ? (
                <View style={styles.filterRow}>
                  {[
                    { value: "all", label: "All" },
                    ...availableTypes.map((t) => ({
                      value: t,
                      label: t.replace(/_/g, " "),
                    })),
                  ].map((chip) => (
                    <Pressable
                      key={chip.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected: typeFilter === chip.value }}
                      onPress={() => setTypeFilter(chip.value)}
                      style={[
                        styles.chip,
                        typeFilter === chip.value && styles.chipOn,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          typeFilter === chip.value && styles.chipTextOn,
                        ]}
                      >
                        {chip.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              {catalog.length === 0 ? (
                <EmptyState
                  icon="shopping-bag"
                  heading={COPY.storeTitle}
                  explanation={COPY.storeEmpty}
                />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.gridCell}>
              <ProductCard
                product={item}
                gate={canPurchase(item, userContext)}
                layout="grid"
                onOpen={() => {
                  router.push(productHref(item.id));
                }}
                onAdd={() => {
                  void handleAdd(item);
                }}
                adding={addingId === item.id}
              />
            </View>
          )}
          ListFooterComponent={
            <View>
              <PrimaryButton
                title={cartButtonTitle}
                onPress={() => {
                  router.push(routes.storeCart);
                }}
              />
            </View>
          }
          contentContainerStyle={styles.list}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.soft,
    textAlign: "center",
    marginBottom: 8,
  },
  error: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Accent.tag,
    textAlign: "center",
  },
  ok: {
    marginTop: 8,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    color: Accent.sage,
    textAlign: "center",
  },
  group: {
    marginTop: 16,
    marginBottom: 8,
    fontFamily: SpecimenType.monoBold,
    fontSize: 20,
    color: Accent.tag,
  },
  recGap: {
    marginBottom: 12,
  },
  bannerGap: {
    height: 24,
  },
  catalogHead: {
    marginTop: 24,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Paper.mount,
    borderWidth: 1,
    borderColor: Ink.rule,
  },
  chipOn: {
    backgroundColor: Accent.tag,
    borderColor: Accent.tag,
  },
  chipText: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 14,
    color: Ink.full,
    textTransform: "capitalize",
  },
  chipTextOn: {
    color: Paper.mount,
  },
  columns: {
    gap: 8,
  },
  gridCell: {
    flex: 1,
  },
  list: {
    paddingBottom: 32,
  },
});
