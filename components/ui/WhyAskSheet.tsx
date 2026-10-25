import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COPY } from "@/lib/copy";
import { colors, radius, tapTarget } from "@/lib/design-tokens";
import { typography } from "@/lib/typography";

type WhyAskButtonProps = {
  explanation: string;
  accessibilityLabel?: string;
};

/** Feather info icon that opens a one-paragraph “why we ask” sheet. */
export function WhyAskButton({
  explanation,
  accessibilityLabel = COPY.whyWeAsk,
}: WhyAskButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={COPY.whyWeAskHint}
        onPress={() => setOpen(true)}
        style={styles.infoHit}
      >
        <Feather name="info" size={16} color={colors.mossDeep} />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => undefined}>
            {/*
              A plain white sheet, not a frosted one: Moss has no blur, so the
              sheet is told from the dimmed screen behind it by its fill and
              its rounded top corners alone.
            */}
            <View style={styles.sheet}>
              <SafeAreaView edges={["bottom"]}>
                <Text style={styles.title}>{COPY.whyWeAsk}</Text>
                <Text style={styles.body}>{explanation}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={COPY.whyWeAskClose}
                  onPress={() => setOpen(false)}
                  style={styles.closeHit}
                >
                  <Text style={styles.closeText}>{COPY.whyWeAskClose}</Text>
                </Pressable>
              </SafeAreaView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

type LabelRowProps = {
  label: string;
  whyAsk?: string;
};

/**
 * The field label every control shares: 13px `inkSoft` above the control,
 * with the optional “why we ask” icon on the same line.
 */
export function LabelRow({ label, whyAsk }: LabelRowProps) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {whyAsk ? <WhyAskButton explanation={whyAsk} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  infoHit: {
    minWidth: tapTarget,
    minHeight: tapTarget,
    alignItems: "center",
    justifyContent: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  label: {
    flex: 1,
    ...typography.label,
    color: colors.inkSoft,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    // Ink at 28% — the dim is the ground colour, not a tinted wash.
    backgroundColor: "rgba(12,12,10,0.28)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
    padding: 20,
  },
  title: {
    ...typography.title,
    color: colors.ink,
  },
  body: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
  closeHit: {
    minHeight: tapTarget,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    ...typography.body,
    color: colors.ink,
    textDecorationLine: "underline",
  },
});
