import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { Colors, Radius, Size, Space, typeStyle } from "@/lib/theme";

type TrustBannerProps = {
  title?: string;
  body?: string;
};

/**
 * Quiet privacy reassurance strip — sits near the top of onboarding and in
 * settings.
 *
 * PLAIN ENGLISH: a soft orange-tinted panel with a shield icon that tells
 * people their answers stay private. Tinted rather than solid, so it reads as
 * reassurance instead of a warning.
 */
export function TrustBanner({
  title = "Your data stays private",
  body = "Answers travel over HTTPS and stay private to your account (Row Level Security). Assigned clinicians only see what you share for review. PRESCOPE is a lifestyle awareness tool — not a diagnosis.",
}: TrustBannerProps) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.iconSquare}>
        <Feather name="shield" size={20} color={Colors.orange} />
      </View>
      <View style={styles.textCol}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Space.md - 2,
    padding: Space.cardPad,
    borderRadius: Radius.card,
    backgroundColor: Colors.orangeTint,
  },
  iconSquare: {
    width: Size.iconSquare,
    height: Size.iconSquare,
    borderRadius: 14,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  title: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  body: {
    ...typeStyle("secondary"),
    marginTop: Space.xs,
    color: Colors.body,
  },
});
