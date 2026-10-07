import { StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";
import { Accent, Edge, Ink, Measure, SpecimenType } from "@/lib/specimen-tokens";

type IodineHardStopProps = {
  reason?: string;
};

/**
 * Shown when iodine is not recommended. Calm amber, not a crash or scare.
 */
export function IodineHardStop({
  reason = "Because your thyroid antibodies are positive, iodine supplementation could cause a flare-up. Your plan has been adjusted to keep you safe.",
}: IodineHardStopProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name="alert-triangle" size={20} color={Accent.ochre} />
        <Text style={styles.title}>This isn't recommended for you right now</Text>
      </View>
      <Text style={styles.body}>{reason}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Accent.ochreWash,
    borderWidth: 1,
    borderColor: Accent.ochre,
    borderRadius: Edge.hair,
    padding: Measure.base,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  title: {
    flex: 1,
    fontFamily: SpecimenType.monoBold,
    fontSize: 19,
    color: Ink.full,
  },
  body: {
    marginTop: 8,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.full,
  },
});
