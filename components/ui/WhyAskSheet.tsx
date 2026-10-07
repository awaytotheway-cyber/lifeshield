import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Icon } from "@/components/specimen/Icon";
import { SafeAreaView } from "react-native-safe-area-context";

import { Sheet } from "@/components/specimen/Sheet";
import { COPY } from "@/lib/copy";
import { Accent, Ink, SpecimenType, tapTarget } from "@/lib/specimen-tokens";

type WhyAskButtonProps = {
  explanation: string;
  accessibilityLabel?: string;
};

/** Info mark that opens a one-paragraph “why we ask” sheet. */
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
        <Icon name="info" size={16} color={Accent.tag} />
      </Pressable>
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => undefined}>
            <Sheet variant="sheet" style={styles.sheet}>
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
            </Sheet>
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
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    letterSpacing: 0.2,
    color: Ink.soft,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Ink.scrim,
  },
  sheet: {
    padding: 20,
  },
  title: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 19,
    color: Accent.tag,
  },
  body: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.full,
  },
  closeHit: {
    minHeight: tapTarget,
    marginTop: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    color: Accent.tag,
  },
});
