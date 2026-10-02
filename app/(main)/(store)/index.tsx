import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { ProductCard } from "@/components/store/ProductCard";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
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
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { loadUserContext } from "@/lib/user-context";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

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
    <Screen centered={false}>
      <ScreenHeader
        title={COPY.storeTitle}
        subtitle={COPY.storeBody}
        onBack={() => router.replace(routes.home)}
        backLabel={COPY.storeBackHome}
      />

      {loading ? <StaticSkeleton rows={3} /> : null}

      {message ? (
        <Card>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.storeRetry} onPress={() => refresh()} />
        </Card>
      ) : null}

      {actionMessage ? <Text style={styles.ok}>{actionMessage}</Text> : null}

      {!loading && !message && userContext ? (
        <FlatList
          data={catalog}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View>
              <SectionTitle title={COPY.storeRecommended} first />
              {recommended.length === 0 ? (
                <Card>
                  <Text style={styles.emptyBody}>
                    {COPY.storeRecommendedEmpty}
                  </Text>
                </Card>
              ) : (
                <View style={styles.stack}>
                  {recommended.map((product) => (
                    <ProductCard
                      key={product.id}
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
                  ))}
                </View>
              )}

              <SectionTitle title={COPY.storeFullCatalog} />
              {availableTypes.length > 1 ? (
                <View style={styles.filterRow}>
                  {[
                    { value: "all", label: "All" },
                    ...availableTypes.map((t) => ({
                      value: t,
                      label: t.replace(/_/g, " "),
                    })),
                  ].map((chip) => (
                    <Chip
                      key={chip.value}
                      label={chip.label}
                      selected={typeFilter === chip.value}
                      onPress={() => setTypeFilter(chip.value)}
                    />
                  ))}
                </View>
              ) : null}
              {catalog.length === 0 ? (
                <Card>
                  <Text style={styles.emptyBody}>{COPY.storeEmpty}</Text>
                </Card>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.listGap}>
              <ProductCard
                product={item}
                gate={canPurchase(item, userContext)}
                layout="row"
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
            <View style={styles.footer}>
              <PrimaryButton
                title={cartButtonTitle}
                icon="shopping-bag"
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
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  ok: {
    marginBottom: Space.md,
    ...typeStyle("secondary"),
    color: Colors.green,
  },
  emptyBody: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  stack: {
    gap: Gap.cards,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    marginBottom: Gap.cards + 2,
  },
  listGap: {
    marginBottom: Gap.cards,
  },
  footer: {
    marginTop: Gap.beforeFooter - Gap.cards,
  },
  list: {
    paddingBottom: Gap.screenBottom,
  },
});
