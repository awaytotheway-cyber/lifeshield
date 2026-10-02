import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { COPY } from "@/lib/copy";
import { Colors, Gap, Size, Space, typeStyle } from "@/lib/theme";

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
        <Feather name="info" size={18} color={Colors.orange} />
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
    minWidth: Size.tap,
    minHeight: Size.tap,
    alignItems: "center",
    justifyContent: "center",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    // Section 3: 10px between a label and the field it describes.
    marginBottom: Gap.labelToField,
  },
  /** Question text — 17px semibold, per Section 8 QUESTIONNAIRE. */
  label: {
    flex: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(31,27,24,0.35)",
  },
  sheet: {
    padding: Space.cardPad,
  },
  title: {
    ...typeStyle("section"),
    color: Colors.ink,
  },
  body: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  closeHit: {
    minHeight: Size.tap,
    marginTop: Space.md,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    ...typeStyle("body"),
    color: Colors.orange,
  },
});
