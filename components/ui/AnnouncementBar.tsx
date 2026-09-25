import { StyleSheet, View } from "react-native";

import { MonoLabel } from "@/components/ui/MonoLabel";
import { colors, spacing } from "@/lib/design-tokens";

type AnnouncementBarProps = {
  message: string;
};

/**
 * Full-bleed tabloid-orange strip with centered black uppercase mono
 * micro-copy. The single dose of orange at the very top of a surface —
 * always the first thing the eye lands on. Use sparingly (one per
 * screen at most), and never for status/error content (that's a chip).
 */
export function AnnouncementBar({ message }: AnnouncementBarProps) {
  return (
    <View style={styles.bar}>
      <MonoLabel size={12} color={colors.inkBlack}>
        {message}
      </MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.tabloidOrange,
    minHeight: 32,
    paddingHorizontal: spacing.base,
    alignItems: "center",
    justifyContent: "center",
  },
});
