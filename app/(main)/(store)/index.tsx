import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

import { ProductCard } from "@/components/store/ProductCard";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { hrefForConsent } from "@/lib/consent-flow";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
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
import { fontFamily } from "@/lib/typography";
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
    return products.filter((p) => !recommendedIds.has(p.id));
  }, [products, recommended]);

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
    <Screen contentPadding={spacing.screenX} centered={false}>
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
              <Text style={styles.group}>{COPY.storeRecommended}</Text>
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
              <Text style={styles.group}>{COPY.storeFullCatalog}</Text>
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
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "center",
    marginBottom: 8,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
  },
  ok: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.sage,
    textAlign: "center",
  },
  group: {
    marginTop: 16,
    marginBottom: 8,
    fontFamily: fontFamily.bodySemi,
    fontSize: 20,
    color: colors.deepTeal,
  },
  recGap: {
    marginBottom: 12,
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
