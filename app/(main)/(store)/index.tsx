import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import { TabIcon } from "@/components/navigation/TabIcon";
import { ProductCard, PurchaseStatus } from "@/components/store/ProductCard";
import { IconButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TwoTone } from "@/components/ui/TwoTone";
import { hrefForConsent } from "@/lib/consent-flow";
import { COPY } from "@/lib/copy";
import {
  colors,
  heroGradient,
  radius,
  spacing,
  status,
  tapTarget,
} from "@/lib/design-tokens";
import {
  canPurchase,
  consentTypeForProduct,
  type UserContext,
} from "@/lib/purchase-gates";
import { productHref, routes } from "@/lib/routes";
import {
  addToCart,
  formatProductPrice,
  loadActiveProducts,
  loadCartItemCount,
  recommendedFromPlan,
  type ProductRow,
} from "@/lib/store";
import { loadUserContext } from "@/lib/user-context";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * The one headline on the screen, the word the board sets it in. 50, not
 * `displayXL`'s 46: the board draws this screen's headline four points larger
 * than the token, and one word at 50 still keeps to a single line at 390pt.
 */
const HEADLINE = "Supplements";
const HEADLINE_SIZE = 50;

/** 155deg on the unit box — the same band home, onboarding and auth use. */
const GRADIENT_START = { x: 0.29, y: 0.05 };
const GRADIENT_END = { x: 0.71, y: 0.95 };

/**
 * The featured card's own type, off the board: the name at 26 and the price at
 * 30, both on the display scale with tracking at -3% of the size. They are a
 * product name and a price rather than a headline, so they are plain `Text`
 * and not `TwoTone` — the screen has one headline, above.
 */
const FEATURED_NAME = {
  fontFamily: fontFamily.display,
  fontSize: 26,
  lineHeight: 29,
  // 26 x -0.025
  letterSpacing: -0.7,
} as const;

const FEATURED_PRICE = {
  fontFamily: fontFamily.display,
  fontSize: 30,
  lineHeight: 30,
  // 30 x -0.03
  letterSpacing: -0.9,
} as const;

/** The "All" tab. `null` is no filter rather than a sample word. */
const ALL = null;

type Category = "supplement" | "test";

/**
 * The category tabs, built from `product_type` — the only category the
 * catalogue actually carries.
 *
 * The board offers "Capsules" and "Powders" beside "Tests". No product row
 * records a form factor, so those two tabs could never filter anything; a tab
 * that can never match a row is worse than no tab, so the real two categories
 * take their place.
 */
const CATEGORY_ORDER: Category[] = ["supplement", "test"];
const CATEGORY_WORD: Record<Category, string> = {
  supplement: "Supplements",
  test: "Tests",
};

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
  const [category, setCategory] = useState<Category | null>(ALL);

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

  /** One tab per category actually on the shelf, in a fixed order. */
  const categories = useMemo(() => {
    const present = new Set(products.map((p) => p.product_type));
    return CATEGORY_ORDER.filter((word) => present.has(word));
  }, [products]);

  const visibleRecommended = useMemo(
    () =>
      category
        ? recommended.filter((p) => p.product_type === category)
        : recommended,
    [recommended, category],
  );

  const visibleCatalog = useMemo(
    () => (category ? catalog.filter((p) => p.product_type === category) : catalog),
    [catalog, category],
  );

  /**
   * The moss card. One product, and the only gradient on the screen — which is
   * why the rest of the recommendations stay white cards below it.
   */
  const featured = visibleRecommended[0] ?? null;
  const restRecommended = visibleRecommended.slice(1);

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

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const featuredGate =
    featured && userContext ? canPurchase(featured, userContext) : null;
  const featuredCanAdd = Boolean(
    featuredGate?.allowed && !featuredGate.needsCheck,
  );

  return (
    <Screen contentPadding={spacing.screenX} centered={false}>
      {/* Wordmark between the way back and the cart — the board's header. */}
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel={COPY.storeBackHome}
          onPress={() => router.replace(routes.home)}
          style={styles.back}
        />
        <Text style={styles.wordmark}>{COPY.appName}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            cartCount > 0
              ? COPY.storeViewCartWithCount.replace("{count}", String(cartCount))
              : COPY.storeViewCart
          }
          onPress={() => {
            router.push(routes.storeCart);
          }}
          style={styles.cart}
        >
          <TabIcon name="shop" focused />
          {cartCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View accessibilityRole="header" style={styles.headline}>
        <TwoTone
          size={HEADLINE_SIZE}
          parts={[{ text: HEADLINE, tone: "bold" }]}
        />
      </View>

      {/* The sentence that says what the shop is and is not. Never dropped. */}
      <Text style={styles.lede}>{COPY.storeBody}</Text>

      {categories.length > 0 ? (
        /*
          Tabs are plain words — no pill, no underline, no box. Weight and
          colour carry the state; each word keeps a 44pt target of its own.
        */
        <View style={styles.tabs} accessibilityRole="tablist">
          <CategoryTab
            label="All"
            active={category === ALL}
            onPress={() => setCategory(ALL)}
          />
          {categories.map((word) => (
            <CategoryTab
              key={word}
              label={CATEGORY_WORD[word]}
              active={category === word}
              onPress={() => setCategory(word)}
            />
          ))}
        </View>
      ) : null}

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
          data={visibleCatalog}
          keyExtractor={(item) => item.id}
          // The list owns the height the header row, headline and tabs leave,
          // so a long catalogue scrolls inside the screen rather than running
          // off the bottom of it.
          style={styles.list}
          ListHeaderComponent={
            <View>
              {featured && featuredGate ? (
                <View style={styles.featuredBlock}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={featured.plain_name}
                    onPress={() => {
                      router.push(productHref(featured.id));
                    }}
                  >
                    <LinearGradient
                      colors={heroGradient.colors}
                      locations={heroGradient.locations}
                      start={GRADIENT_START}
                      end={GRADIENT_END}
                      style={styles.featured}
                    >
                      <Text style={styles.featuredTag}>For you</Text>
                      <View style={styles.featuredFill} />
                      <Text style={styles.featuredName}>
                        {featured.plain_name}
                      </Text>
                      {featured.plain_description?.trim() ? (
                        <Text style={styles.featuredDesc}>
                          {featured.plain_description.trim()}
                        </Text>
                      ) : null}
                      <Text style={styles.featuredPrice}>
                        {formatProductPrice(featured)}
                      </Text>
                    </LinearGradient>
                  </Pressable>

                  {/* The gate's explanation, in full, off the moss. */}
                  <PurchaseStatus gate={featuredGate} />

                  {featuredCanAdd ? (
                    /* The one black button on this screen. */
                    <PrimaryButton
                      title={COPY.productAddToCart}
                      loading={addingId === featured.id}
                      onPress={() => {
                        void handleAdd(featured);
                      }}
                    />
                  ) : null}
                </View>
              ) : null}

              {/*
                The heading only appears over something: with a single
                recommendation the moss card above is the whole section, so
                an empty "Based on your results" is not printed under it.
              */}
              {visibleRecommended.length === 0 ? (
                <>
                  <Text style={styles.group}>{COPY.storeRecommended}</Text>
                  <EmptyState
                    heading={COPY.storeRecommended}
                    explanation={COPY.storeRecommendedEmpty}
                  />
                </>
              ) : null}

              {restRecommended.length > 0 ? (
                <>
                  <Text style={styles.group}>{COPY.storeRecommended}</Text>
                  {restRecommended.map((product) => (
                    <View key={product.id} style={styles.rowGap}>
                      <ProductCard
                        product={product}
                        gate={canPurchase(product, userContext)}
                        tag="For you"
                        onOpen={() => {
                          router.push(productHref(product.id));
                        }}
                        onAdd={() => {
                          void handleAdd(product);
                        }}
                        adding={addingId === product.id}
                      />
                    </View>
                  ))}
                </>
              ) : null}

              <Text style={styles.group}>{COPY.storeFullCatalog}</Text>
              {visibleCatalog.length === 0 ? (
                <EmptyState
                  heading={COPY.storeTitle}
                  explanation={COPY.storeEmpty}
                />
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.rowGap}>
              <ProductCard
                product={item}
                gate={canPurchase(item, userContext)}
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
          contentContainerStyle={styles.listContent}
        />
      ) : null}
    </Screen>
  );
}

/** One plain word. The box around it is a target, not a shape. */
function CategoryTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.tab}
    >
      <Text style={[styles.tabText, active ? styles.tabActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    // Pulled into the gutter so the glyph, not its 44pt hit area, lines up
    // with the headline under it.
    marginLeft: -12,
  },
  wordmark: {
    fontFamily: fontFamily.display,
    fontSize: 13,
    // 13 x 0.18 = 2.34
    letterSpacing: 2.3,
    textTransform: "uppercase",
    color: colors.ink,
  },
  cart: {
    width: tapTarget,
    height: tapTarget,
    marginRight: -12,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: spacing.micro,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 10,
    lineHeight: 13,
    color: colors.white,
  },
  headline: {
    marginTop: spacing.sm,
  },
  lede: {
    marginTop: spacing.mdSm,
    ...typography.body,
    color: colors.inkSoft,
  },
  tabs: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  tab: {
    minHeight: tapTarget,
    justifyContent: "center",
  },
  // An inactive tab is a 15px label, so it reads `inkMuted` (5.36:1) rather
  // than `inkFaint` (3.47:1) — inkFaint only clears its contrast at 24px and
  // up, where it is a headline colour.
  tabText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  tabActive: {
    fontFamily: fontFamily.bodySemi,
    color: colors.ink,
  },
  featuredBlock: {
    marginBottom: spacing.sm,
  },
  featured: {
    height: 262,
    borderRadius: radius.surface,
    padding: 18,
  },
  featuredTag: {
    ...typography.micro,
    color: colors.mossTint,
  },
  featuredFill: {
    flex: 1,
  },
  featuredName: {
    ...FEATURED_NAME,
    color: colors.white,
  },
  featuredDesc: {
    marginTop: spacing.micro,
    ...typography.label,
    color: colors.mossTint,
  },
  featuredPrice: {
    marginTop: spacing.mdSm,
    ...FEATURED_PRICE,
    color: colors.white,
  },
  group: {
    marginTop: spacing.md,
    marginBottom: spacing.mdSm,
    ...typography.micro,
    color: colors.inkMuted,
  },
  rowGap: {
    marginBottom: spacing.mdSm,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: spacing.base,
    paddingBottom: spacing.lg,
  },
  error: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: CLAY,
  },
  ok: {
    marginTop: spacing.sm,
    ...typography.label,
    color: colors.mossDeep,
  },
});
