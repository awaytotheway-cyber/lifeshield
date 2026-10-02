import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PurchaseStatus } from "@/components/store/ProductCard";
import {
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { COPY } from "@/lib/copy";
import { hrefForConsent } from "@/lib/consent-flow";
import { canPurchase, consentTypeForProduct, type UserContext } from "@/lib/purchase-gates";
import { routes } from "@/lib/routes";
import {
  addToCart,
  formatProductPrice,
  loadProductById,
  type ProductRow,
} from "@/lib/store";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
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
      <Screen scroll>
        <ScreenHeader
          title={COPY.storeTitle}
          onBack={() => router.replace(routes.store)}
          backLabel={COPY.storeBackStore}
        />
        <Card>
          <Text style={styles.error}>{COPY.storeProductMissing}</Text>
          <PrimaryButton
            title={COPY.storeBackStore}
            onPress={() => {
              router.replace(routes.store);
            }}
          />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <ScreenHeader
        title={product?.plain_name ?? COPY.storeTitle}
        onBack={() => router.back()}
        backLabel={COPY.storeBackStore}
      />

      {loading ? <StaticSkeleton rows={2} /> : null}

      {message ? (
        <Card>
          <Text style={styles.error}>{message}</Text>
          <TextButton
            title={COPY.storeRetry}
            onPress={() => {
              void load();
            }}
          />
        </Card>
      ) : null}

      {!loading && product ? (
        <>
          <Card>
            <Text style={styles.price}>{formatProductPrice(product)}</Text>
            <Text style={styles.body}>
              {product.plain_description?.trim() ||
                "Information to discuss with a practitioner — not a diagnosis."}
            </Text>

            {gate ? <PurchaseStatus gate={gate} /> : null}

            {actionMessage ? (
              <Text style={styles.ok}>{actionMessage}</Text>
            ) : null}

            <PrimaryButton
              title={COPY.productAddToCart}
              icon="plus"
              disabled={!canAdd}
              loading={adding}
              onPress={() => {
                void handleAdd();
              }}
            />

            {gate &&
            !gate.allowed &&
            product.requires_consent &&
            consentTypeForProduct(product) ? (
              <SecondaryButton
                title={COPY.storeGoConsent}
                onPress={goConsent}
              />
            ) : null}
          </Card>

          <SectionTitle title={COPY.productClinicalBasis} icon="book-open" />
          <Card>
            <Text style={styles.basisBody}>
              {product.linked_finding?.trim() ||
                product.clinical_name ||
                COPY.productNoBasis}
            </Text>
            <View style={styles.divider} />
            <Text style={styles.clinicalLabel}>Clinical name</Text>
            <Text style={styles.clinicalName}>{product.clinical_name}</Text>
          </Card>
        </>
      ) : null}

      <View style={styles.footer}>
        <SecondaryButton
          title={COPY.storeViewCart}
          icon="shopping-bag"
          onPress={() => {
            router.push(routes.storeCart);
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: {
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  body: {
    marginTop: Space.sm,
    ...typeStyle("body"),
    color: Colors.body,
  },
  basisBody: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  error: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  ok: {
    marginTop: Space.md,
    ...typeStyle("secondary"),
    color: Colors.green,
  },
  divider: {
    marginVertical: Space.md,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
  },
  clinicalLabel: {
    ...typeStyle("label"),
    color: Colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  clinicalName: {
    marginTop: Space.xs,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  footer: {
    marginTop: Gap.beforeFooter,
  },
});
