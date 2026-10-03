import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { DataValue } from "@/components/ui/DataValue";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractionFlag } from "@/components/ui/InteractionFlag";
import { Colors, Radii, Spacing, Typography } from "@/lib/design-tokens";

type UiProductCardProps = {
  name: string;
  priceLabel: string;
  description: string;
  imageUri?: string;
  /** Shown as a small overlay label on the photo area. */
  category?: string;
  blocked?: boolean;
  needsCheck?: boolean;
  checkReason?: string;
  onAdd?: () => void;
  adding?: boolean;
  layout?: "row" | "grid";
  onOpen?: () => void;
};

/**
 * Store product card — PRESCOPE v2.
 *
 * The circular gradient add button (rather than a rectangular "Add to
 * cart") is deliberate: it reads premium and is a generous touch
 * target, instead of looking like stock e-commerce.
 */
export function ProductCard({
  name,
  priceLabel,
  description,
  imageUri,
  category,
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

  const photo = (
    <View style={isGrid ? styles.photoGrid : styles.photoRow}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFillObject} />
      ) : null}
      {category ? (
        <View style={styles.categoryOverlay}>
          <Text style={styles.categoryText} numberOfLines={1}>
            {category}
          </Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onOpen}
      disabled={!onOpen}
      style={({ pressed }) => (pressed && onOpen ? { opacity: 0.92 } : null)}
    >
      <GlassCard variant="onWhite" radius={Radii.card} padding={12}>
        <View style={isGrid ? undefined : styles.rowLayout}>
          {photo}
          <View style={isGrid ? styles.gridBody : styles.rowBody}>
            <Text style={styles.name} numberOfLines={2}>
              {name}
            </Text>
            <Text style={styles.desc} numberOfLines={isGrid ? 1 : 2}>
              {description}
            </Text>

            {needsCheck ? (
              <InteractionFlag reason={checkReason} compact={!checkReason} />
            ) : null}
            {blocked ? (
              <Text style={styles.blocked}>
                Not available for you right now
              </Text>
            ) : null}

            <View style={styles.bottomRow}>
              <DataValue
                value={priceLabel}
                size="inline"
                color={Colors.orangeDark}
              />
              {showAdd ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${name}`}
                  onPress={(event) => {
                    event.stopPropagation();
                    onAdd?.();
                  }}
                  disabled={adding}
                  style={({ pressed }) => [
                    styles.addCircle,
                    (pressed || adding) && { opacity: 0.8 },
                  ]}
                >
                  <LinearGradient
                    colors={[Colors.orangeDark, Colors.orangeBright]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <Feather
                    name={adding ? "loader" : "plus"}
                    size={20}
                    color={Colors.pureWhite}
                  />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowLayout: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  photoRow: {
    width: 84,
    height: 84,
    borderRadius: Radii.cardSmall,
    backgroundColor: Colors.orangeTint,
    overflow: "hidden",
  },
  photoGrid: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: Radii.cardSmall,
    backgroundColor: Colors.orangeTint,
    overflow: "hidden",
    marginBottom: Spacing.sm,
  },
  categoryOverlay: {
    position: "absolute",
    left: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.32)",
    borderTopRightRadius: 8,
  },
  categoryText: {
    fontFamily: Typography.medium,
    fontSize: Typography.micro,
    color: Colors.pureWhite,
  },
  gridBody: {
    flex: 1,
  },
  rowBody: {
    flex: 1,
  },
  name: {
    fontFamily: Typography.semibold,
    fontSize: Typography.body,
    lineHeight: 20,
    color: Colors.charcoal,
  },
  desc: {
    marginTop: 4,
    fontFamily: Typography.regular,
    fontSize: Typography.label,
    lineHeight: 17,
    color: Colors.mutedText,
  },
  blocked: {
    marginTop: Spacing.sm,
    fontFamily: Typography.regular,
    fontSize: Typography.secondary,
    color: Colors.bodyText,
  },
  bottomRow: {
    marginTop: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
});
