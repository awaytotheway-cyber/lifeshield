import { StyleSheet, Text, View } from "react-native";

import { IodineHardStop } from "@/components/ui/IodineHardStop";
import { InteractionFlag } from "@/components/ui/InteractionFlag";
import { ProductCard as CatalogCard } from "@/components/ui/ProductCard";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing, status } from "@/lib/design-tokens";
import { formatProductPrice, type ProductRow } from "@/lib/store";
import type { PurchaseGateResult } from "@/lib/purchase-gates";
import { fontFamily } from "@/lib/typography";

/**
 * Sand, borrowed from `worthWatching`. Moss has no amber and no alert red: a
 * caution carries the middle of the three clinical statuses.
 */
const SAND = status.worthWatching;

type PurchaseStatusProps = {
  gate: PurchaseGateResult;
};

/** Safety as information (sand), not an error. */
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
  /** Micro eyebrow, set only on a row the user's own plan matched. */
  tag?: string;
};

export function ProductCard({
  product,
  gate,
  onOpen,
  onAdd,
  adding = false,
  tag,
}: ProductCardProps) {
  return (
    <CatalogCard
      name={product.plain_name}
      priceLabel={formatProductPrice(product)}
      description={
        product.plain_description?.trim() || "Browse details before ordering."
      }
      tag={tag}
      blocked={!gate.allowed && !gate.needsCheck}
      // The gate's own sentence, not the generic line: the reason a purchase
      // is blocked is the safety information, so the row carries it in full.
      blockedReason={gate.blockReason ?? COPY.storeBlockedGeneric}
      needsCheck={Boolean(gate.needsCheck)}
      checkReason={gate.blockReason}
      onAdd={onAdd}
      adding={adding}
      onOpen={onOpen}
    />
  );
}

const styles = StyleSheet.create({
  flagWrap: {
    marginTop: spacing.mdSm,
  },
  infoBadge: {
    marginTop: spacing.mdSm,
    backgroundColor: SAND.fill,
    borderRadius: radius.surface,
    padding: spacing.base,
  },
  infoText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.ink,
  },
});
