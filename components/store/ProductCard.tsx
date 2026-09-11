import { StyleSheet, Text, View } from "react-native";

import { IodineHardStop } from "@/components/ui/IodineHardStop";
import { InteractionFlag } from "@/components/ui/InteractionFlag";
import { ProductCard as CatalogCard } from "@/components/ui/ProductCard";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { formatProductPrice, type ProductRow } from "@/lib/store";
import type { PurchaseGateResult } from "@/lib/purchase-gates";
import { fontFamily } from "@/lib/typography";

type PurchaseStatusProps = {
  gate: PurchaseGateResult;
};

/** Safety as information (amber), not an error. */
export function PurchaseStatus({ gate }: PurchaseStatusProps) {
  if (gate.allowed) {
    return null;
  }
  if (gate.needsCheck) {
    return (
      <View style={styles.flagWrap}>
        <InteractionFlag reason={gate.blockReason} />
      </View>
    );
  }
  const iodine =
    (gate.blockReason ?? "").toLowerCase().includes("iodine") ||
    (gate.blockReason ?? "").toLowerCase().includes("thyroid");
  if (iodine) {
    return (
      <View style={styles.flagWrap}>
        <IodineHardStop reason={gate.blockReason} />
      </View>
    );
  }
  return (
    <View style={styles.infoBadge}>
      <Text style={styles.infoText}>
        {gate.blockReason ?? COPY.storeBlockedGeneric}
      </Text>
    </View>
  );
}

type ProductCardProps = {
  product: ProductRow;
  gate: PurchaseGateResult;
  onOpen: () => void;
  onAdd: () => void;
  adding?: boolean;
  layout?: "row" | "grid";
};

export function ProductCard({
  product,
  gate,
  onOpen,
  onAdd,
  adding = false,
  layout = "row",
}: ProductCardProps) {
  return (
    <CatalogCard
      name={product.plain_name}
      priceLabel={formatProductPrice(product)}
      description={
        product.plain_description?.trim() || "Browse details before ordering."
      }
      blocked={!gate.allowed && !gate.needsCheck}
      needsCheck={Boolean(gate.needsCheck)}
      checkReason={gate.blockReason}
      onAdd={onAdd}
      adding={adding}
      layout={layout}
      onOpen={onOpen}
    />
  );
}

const styles = StyleSheet.create({
  flagWrap: {
    marginTop: spacing.sm,
  },
  infoBadge: {
    marginTop: spacing.sm,
    backgroundColor: colors.amberLight,
    borderRadius: radius.alert,
    padding: spacing.mdSm,
  },
  infoText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.charcoal,
  },
});
