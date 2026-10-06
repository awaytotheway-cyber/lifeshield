import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";

import { colors, radius } from "@/lib/design-tokens";
import { SECTION_IMAGES, type SectionImageKey } from "@/lib/section-images";

/**
 * Short topical banner at the top of a questionnaire section.
 *
 * Fixed height so it adds warmth without pushing the first question off
 * screen, and the blurhash means the space is never an empty grey hole while
 * the photo loads. Decorative: the section title right below says what the
 * screen is, so the image is hidden from screen readers rather than read out.
 */
export function SectionHeaderImage({ topic }: { topic: SectionImageKey }) {
  const image = SECTION_IMAGES[topic];

  return (
    <View
      style={styles.frame}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Image
        source={{ uri: image.uri }}
        placeholder={{ blurhash: image.blurhash }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={300}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 120,
    borderRadius: radius.card,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: colors.border,
  },
});
