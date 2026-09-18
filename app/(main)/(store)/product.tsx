import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { ClinicalTerm } from "@/components/ClinicalTerm";
import { PurchaseStatus } from "@/components/store/ProductCard";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
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
      {loading ? <ActivityIndicator color="#FF6000" /> : null}

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

          <View className="mt-4 rounded-xl border border-white/10 bg-white/6 px-4 py-4">
            <Text className="text-sm text-teal">{COPY.productClinicalBasis}</Text>
            <Text className="mt-2 text-charcoal">
              {product.linked_finding?.trim() ||
                product.clinical_name ||
                COPY.productNoBasis}
            </Text>
          </View>

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
