import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Surface } from "@/components/ui/Surface";
import { InteractionFlag } from "@/components/ui/InteractionFlag";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

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
    >
      <Surface
        padded={false}
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
      </Surface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.base,
  },
  cardRow: {
    flexDirection: "row",
    gap: 12,
  },
  cardGrid: {
    flex: 1,
    margin: 4,
  },
  // `radius.control` on the thumbnail: the system has three radii, and 20
  // on an 80pt square would read as a lozenge rather than a photo.
  image: {
    width: 80,
    height: 80,
    borderRadius: radius.control,
    backgroundColor: colors.mossTint,
  },
  imageGrid: {
    width: "100%",
    height: 80,
    borderRadius: radius.control,
    backgroundColor: colors.mossTint,
    marginBottom: 8,
  },
  gridBody: {
    flex: 1,
  },
  right: {
    flex: 1,
  },
  name: {
    ...typography.title,
    color: colors.ink,
  },
  price: {
    marginTop: 4,
    ...typography.body,
    color: colors.ink,
  },
  desc: {
    marginTop: 4,
    ...typography.label,
    color: colors.inkSoft,
  },
  blocked: {
    marginTop: 8,
    ...typography.label,
    color: colors.inkSoft,
  },
  // Was 32pt tall, which is under the floor. Nothing interactive goes below
  // 44 in either dimension.
  add: {
    marginTop: 8,
    alignSelf: "flex-end",
    minHeight: tapTarget,
    minWidth: tapTarget,
    paddingHorizontal: 16,
    borderRadius: radius.control,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  addText: {
    ...typography.label,
    color: colors.white,
  },
});
