import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { InteractionFlag } from "@/components/ui/InteractionFlag";
import { Surface } from "@/components/ui/Surface";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";

type UiProductCardProps = {
  name: string;
  priceLabel: string;
  description: string;
  /**
   * Micro eyebrow. Only ever set on a row the user's own plan matched — a
   * "For you" tag on an unmatched row would be a claim the data cannot make.
   */
  tag?: string;
  /**
   * Catalogue rows carry no photography today, so the thumbnail is drawn only
   * when there is an actual image. An empty tinted square in its place reads
   * as a photo that failed to load.
   */
  imageUri?: string;
  blocked?: boolean;
  /**
   * The gate's own sentence. Shown verbatim: a purchase gate's explanation is
   * the safety surface, so it is never shortened to a generic line.
   */
  blockedReason?: string;
  needsCheck?: boolean;
  checkReason?: string;
  onAdd?: () => void;
  adding?: boolean;
  onOpen?: () => void;
};

/** The price, on the display scale at 20: tracking is -3% of the size. */
const PRICE = {
  fontFamily: fontFamily.display,
  fontSize: 20,
  lineHeight: 20,
  // 20 x -0.03
  letterSpacing: -0.6,
} as const;

/**
 * One catalogue row, as a Moss card: white fill, `radius.surface`, and no
 * border, shadow or elevation of its own.
 *
 * "Add" is the outline control, not the black one — the screen's single ink
 * button belongs to the featured product, and a list of black buttons would
 * make every row shout at the same volume.
 */
export function ProductCard({
  name,
  priceLabel,
  description,
  tag,
  imageUri,
  blocked,
  blockedReason,
  needsCheck,
  checkReason,
  onAdd,
  adding,
  onOpen,
}: UiProductCardProps) {
  const showAdd = !blocked && !needsCheck;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onOpen}
      disabled={!onOpen}
    >
      <Surface>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : null}
        {tag ? <Text style={styles.tag}>{tag}</Text> : null}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.desc}>{description}</Text>

        {needsCheck ? (
          <View style={styles.flag}>
            <InteractionFlag reason={checkReason} compact={!checkReason} />
          </View>
        ) : null}

        {blocked && blockedReason ? (
          <Text style={styles.blocked}>{blockedReason}</Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.price}>{priceLabel}</Text>
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
                styles.add,
                pressed && !adding ? styles.addPressed : null,
              ]}
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
  // `radius.control` on the thumbnail: the system has three radii, and 20 on
  // an 80pt square would read as a lozenge rather than a photo.
  image: {
    width: "100%",
    height: 140,
    borderRadius: radius.control,
    marginBottom: spacing.mdSm,
    backgroundColor: colors.mossTint,
  },
  tag: {
    ...typography.micro,
    color: colors.mossDeep,
    marginBottom: 6,
  },
  name: {
    ...typography.title,
    color: colors.ink,
  },
  desc: {
    marginTop: spacing.micro,
    ...typography.label,
    color: colors.inkSoft,
  },
  flag: {
    marginTop: spacing.mdSm,
  },
  blocked: {
    marginTop: spacing.mdSm,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  footer: {
    marginTop: spacing.base,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.mdSm,
  },
  price: {
    ...PRICE,
    color: colors.ink,
  },
  // The outline control: 44 in both dimensions, 4pt corner, 1px ink.
  add: {
    minHeight: tapTarget,
    minWidth: tapTarget,
    paddingHorizontal: spacing.base,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  // A press fills the outline with the paper ground; it carries no colour of
  // its own to darken.
  addPressed: {
    backgroundColor: colors.paper,
  },
  addText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.ink,
  },
});
