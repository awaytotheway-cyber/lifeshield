import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

type TrustBannerProps = {
  title?: string;
  body?: string;
};

/**
 * Trust/privacy strip — sits near the top of home/onboarding. A solid
 * block of ink, so it reads as a stamp rather than another card.
 */
export function TrustBanner({
  title = "Your data stays private",
  body = "Answers travel over HTTPS and stay private to your account (Row Level Security). Assigned clinicians only see what you share for review. PRESCOPE is a lifestyle awareness tool — not a diagnosis.",
}: TrustBannerProps) {
  return (
    <View style={styles.wrap} accessibilityRole="summary">
      <View style={styles.iconWrap}>
        <Icon name="shield" size={18} color={Paper.mount} />
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
    gap: Measure.snug,
    padding: Measure.base,
    borderRadius: Edge.hair,
    backgroundColor: Ink.full,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Accent.tag,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontFamily: SpecimenType.serif,
    fontSize: 17,
    lineHeight: 22,
    color: Paper.mount,
  },
  body: {
    marginTop: 4,
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    lineHeight: 22,
    color: Paper.sheetDeep,
  },
});
