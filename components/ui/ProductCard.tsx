import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { InteractionFlag } from "@/components/ui/InteractionFlag";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

type UiProductCardProps = {
  name: string;
  priceLabel: string;
  description: string;
  imageUri?: string;
  blocked?: boolean;
  needsCheck?: boolean;
  checkReason?: string;
  onAdd?: () => void;
  adding?: boolean;
  layout?: "row" | "grid";
  onOpen?: () => void;
};

/**
 * Store card from the design system. The live store screen still uses
 * components/store/ProductCard.tsx until that screen is restyled later.
 */
export function ProductCard({
  name,
  priceLabel,
  description,
  imageUri,
  blocked,
  needsCheck,
  checkReason,
  onAdd,
  adding,
  layout = "row",
  onOpen,
}: UiProductCardProps) {
  const showAdd = !blocked && !needsCheck;
  const isGrid = layout === "grid";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onOpen}
      disabled={!onOpen}
      style={[styles.card, isGrid ? styles.cardGrid : styles.cardRow]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={isGrid ? styles.imageGrid : styles.image} />
      ) : (
        <View style={isGrid ? styles.imageGrid : styles.image} />
      )}
      <View style={isGrid ? styles.gridBody : styles.right}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.price}>{priceLabel}</Text>
        <Text style={styles.desc}>{description}</Text>
        {needsCheck ? <InteractionFlag reason={checkReason} compact={!checkReason} /> : null}
        {blocked ? (
          <Text style={styles.blocked}>Not available for you right now</Text>
        ) : null}
        {showAdd ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${name}`}
            onPress={(event) => {
              event.stopPropagation();
              onAdd?.();
            }}
            disabled={adding}
            style={styles.add}
          >
            <Text style={styles.addText}>{adding ? "Adding…" : "Add"}</Text>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.radioCard,
    padding: spacing.base,
    ...shadows.card,
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardGrid: {
    flex: 1,
    margin: 4,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.lightTeal,
  },
  imageGrid: {
    width: "100%",
    height: 80,
    borderRadius: 10,
    backgroundColor: colors.lightTeal,
    marginBottom: 8,
  },
  gridBody: {
    flex: 1,
  },
  right: {
    flex: 1,
  },
  name: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    color: colors.charcoal,
  },
  price: {
    marginTop: 4,
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.deepTeal,
  },
  desc: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  blocked: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.slate,
  },
  add: {
    marginTop: 8,
    alignSelf: "flex-end",
    height: 32,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.deepTeal,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 44,
  },
  addText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
});
