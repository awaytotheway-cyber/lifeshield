import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { COPY } from "@/lib/copy";
import { colors, tapTarget } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

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
        <Feather name="info" size={16} color={colors.midTeal} />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => undefined}>
            <GlassSurface intensity="sheet" style={styles.sheet}>
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
            </GlassSurface>
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
    marginBottom: 8,
  },
  label: {
    flex: 1,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.slate,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(13,74,92,0.28)",
  },
  sheet: {
    padding: 20,
  },
  title: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: colors.deepTeal,
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
  },
  closeHit: {
    minHeight: tapTarget,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.midTeal,
  },
});
