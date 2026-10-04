import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SpecimenIcon } from "@/components/specimen/SpecimenIcon";

import { DataValue } from "@/components/ui/DataValue";
import { GlassCard } from "@/components/ui/GlassCard";
import { InteractionFlag } from "@/components/ui/InteractionFlag";
import { Accent, Edge, Ink, Measure, Paper, Rule, SpecimenType, TRACK } from "@/lib/specimen-tokens";

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
      <GlassCard variant="onWhite" radius={Edge.mount} padding={12}>
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
                color={Accent.tag}
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
                  <SpecimenIcon name="plus" size={18} color={Paper.sheet} />
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
    gap: Measure.snug,
  },
  photoRow: {
    width: 84,
    height: 84,
    borderRadius: Edge.mountSmall,
    backgroundColor: Accent.tagWash,
    overflow: "hidden",
  },
  photoGrid: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: Edge.mountSmall,
    backgroundColor: Accent.tagWash,
    overflow: "hidden",
    marginBottom: Measure.tight,
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
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    color: Paper.mount,
  },
  gridBody: {
    flex: 1,
  },
  rowBody: {
    flex: 1,
  },
  name: {
    fontFamily: SpecimenType.monoBold,
    fontSize: SpecimenType.body,
    lineHeight: 20,
    color: Ink.full,
  },
  desc: {
    marginTop: 4,
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.label,
    lineHeight: 17,
    color: Ink.faint,
  },
  blocked: {
    marginTop: Measure.tight,
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.annotation,
    color: Ink.soft,
  },
  bottomRow: {
    marginTop: Measure.snug,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Measure.tight,
  },
  addCircle: {
    width: 44,
    height: 44,
    borderRadius: Edge.none,
    backgroundColor: Ink.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
