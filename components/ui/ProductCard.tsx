import { Image, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PressScale } from "@/components/ui/PressScale";
import { Colors, Gap, Motion, Radius, Size, Space, typeStyle } from "@/lib/theme";

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
 * Store card for the orange redesign — a white Card with 24px padding, the
 * price in big orange numbers, and one clear "Add" pill.
 *
 * PLAIN ENGLISH: this is the box each shop item sits in. `layout="row"` is the
 * roomy full-width version the shop uses; `layout="grid"` is a narrower
 * stacked version for side-by-side columns.
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

  const thumbnail = imageUri ? (
    <Image
      source={{ uri: imageUri }}
      style={isGrid ? styles.imageGrid : styles.image}
      accessibilityIgnoresInvertColors
    />
  ) : (
    <View style={isGrid ? styles.imageGrid : styles.image}>
      <Feather name="package" size={isGrid ? 24 : 22} color={Colors.orange} />
    </View>
  );

  const details = (
    <View style={isGrid ? styles.stack : styles.row}>
      {thumbnail}
      <View style={styles.text}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.desc} numberOfLines={isGrid ? 3 : 2}>
          {description}
        </Text>
      </View>
    </View>
  );

  return (
    <Card style={isGrid ? styles.cardGrid : undefined}>
      {/* The details block and the Add pill are siblings, never nested, so
          there is only ever one tap target inside another. */}
      {onOpen ? (
        <PressScale
          accessibilityRole="button"
          accessibilityLabel={name}
          onPress={onOpen}
          scale={Motion.pressCard}
          haptic="light"
        >
          {details}
        </PressScale>
      ) : (
        details
      )}

      {needsCheck ? (
        <View style={styles.statusWrap}>
          <Chip label="Needs practitioner check" tone="amber" />
          {checkReason ? <Text style={styles.reason}>{checkReason}</Text> : null}
        </View>
      ) : null}

      {blocked ? (
        <View style={styles.statusWrap}>
          <Chip label="Not available for you right now" tone="neutral" />
        </View>
      ) : null}

      <View style={[styles.footer, isGrid ? styles.footerGrid : null]}>
        <Text style={styles.price}>{priceLabel}</Text>
        {showAdd ? (
          <PressScale
            accessibilityRole="button"
            accessibilityLabel={`Add ${name}`}
            onPress={() => {
              onAdd?.();
            }}
            disabled={adding}
            haptic="light"
            scale={Motion.pressButton}
            style={({ pressed }) => [
              styles.add,
              isGrid ? styles.addGrid : null,
              pressed ? styles.addPressed : null,
              adding ? styles.addBusy : null,
            ]}
          >
            <Text style={styles.addText}>{adding ? "Adding…" : "Add"}</Text>
          </PressScale>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  cardGrid: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.md,
  },
  stack: {
    gap: Space.sm,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: Radius.input,
    backgroundColor: Colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  imageGrid: {
    width: "100%",
    height: 72,
    borderRadius: Radius.input,
    backgroundColor: Colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    flex: 1,
  },
  name: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  desc: {
    ...typeStyle("secondary"),
    marginTop: Space.xs,
    color: Colors.muted,
  },
  statusWrap: {
    marginTop: Space.md,
    gap: Space.sm,
  },
  reason: {
    ...typeStyle("secondary"),
    color: Colors.body,
  },
  footer: {
    marginTop: Gap.cards + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  footerGrid: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: Space.sm,
  },
  price: {
    ...typeStyle("dataBig"),
    color: Colors.orange,
  },
  add: {
    minHeight: Size.tap,
    minWidth: 96,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.chip,
    backgroundColor: Colors.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  addGrid: {
    width: "100%",
  },
  addPressed: {
    backgroundColor: Colors.orangeDeep,
  },
  addBusy: {
    opacity: 0.7,
  },
  addText: {
    ...typeStyle("cardTitle"),
    color: Colors.white,
  },
});
