import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors, Radius, Size, Space, typeStyle } from "@/lib/theme";

type IodineHardStopProps = {
  reason?: string;
};

/**
 * Shown when iodine is not recommended. Calm amber, not a crash or scare.
 *
 * The wording below is clinical safety copy — do not reword it.
 */
export function IodineHardStop({
  reason = "Because your thyroid antibodies are positive, iodine supplementation could cause a flare-up. Your plan has been adjusted to keep you safe.",
}: IodineHardStopProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconSquare}>
          <Feather name="alert-triangle" size={20} color={Colors.amber} />
        </View>
        <Text style={styles.title}>
          {"This isn't recommended for you right now"}
        </Text>
      </View>
      <Text style={styles.body}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.amberTint,
    borderWidth: 1,
    borderColor: Colors.amber,
    borderRadius: Radius.card,
    padding: Space.cardPad,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.md - 2,
  },
  iconSquare: {
    width: Size.iconSquare,
    height: Size.iconSquare,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  body: {
    ...typeStyle("body"),
    marginTop: Space.md,
    color: Colors.body,
  },
});
