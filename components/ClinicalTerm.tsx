import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { Card } from "@/components/ui/Card";
import { PressScale } from "@/components/ui/PressScale";
import { getTerm, hasTerm } from "@/lib/plain-language";
import { Colors, Radius, Shadow, Size, Space, typeStyle } from "@/lib/theme";

type ClinicalTermProps = {
  termKey?: string;
  plainName?: string;
  plainExplanation?: string;
  medicalName?: string;
  /** Extra wording shown in the info sheet. Optional. */
  moreDetail?: string;
};

/**
 * Everyday name first, then a plain sentence, then the exact clinical name.
 */
export function ClinicalTerm({
  termKey,
  plainName,
  plainExplanation,
  medicalName,
  moreDetail,
}: ClinicalTermProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const lookedUp = termKey ? getTerm(termKey) : null;
  const fromDictionary = Boolean(termKey && hasTerm(termKey));

  const medical = (
    medicalName ??
    lookedUp?.medicalName ??
    termKey ??
    "Clinical term"
  ).trim();

  const heading = (
    plainName ??
    (fromDictionary ? lookedUp?.plainName : undefined) ??
    medical
  ).trim();

  const explanation = (
    plainExplanation ??
    (fromDictionary ? lookedUp?.plainExplanation : undefined) ??
    "plain explanation coming soon"
  ).trim();

  const detail = moreDetail?.trim() || explanation;

  return (
    // The card carries its own top margin because it is usually dropped
    // straight after a block of copy on screens we do not control.
    <Card style={styles.card}>
      <View style={styles.headingRow}>
        <Text style={styles.heading}>{heading || medical}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`More about ${heading || medical}`}
          onPress={() => setSheetOpen(true)}
          style={styles.infoHit}
        >
          <Feather name="info" size={18} color={Colors.orange} />
        </Pressable>
      </View>
      <Text style={styles.explain}>
        {explanation || "plain explanation coming soon"}
      </Text>
      <View style={styles.divider} />
      <Text style={styles.clinicalLabel}>Clinical name:</Text>
      <Text style={styles.medical}>{medical}</Text>

      <Modal
        visible={sheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <SafeAreaView edges={["bottom"]}>
              <Text style={styles.sheetHeading}>{heading || medical}</Text>
              <Text style={styles.explain}>{detail}</Text>
              <PressScale
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setSheetOpen(false)}
                haptic="light"
                style={styles.closeHit}
              >
                <Text style={styles.closeText}>Close</Text>
              </PressScale>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Space.md,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
  },
  heading: {
    flex: 1,
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  infoHit: {
    minWidth: Size.tap,
    minHeight: Size.tap,
    // Pulls the 44px tap target back level with the title without eating padding.
    marginRight: -Space.sm,
    marginVertical: -Space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  explain: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginVertical: Space.md,
  },
  clinicalLabel: {
    ...typeStyle("caption"),
    color: Colors.muted,
  },
  medical: {
    ...typeStyle("label"),
    marginTop: Space.xs,
    color: Colors.body,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(31,27,24,0.35)",
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Space.cardPad,
    paddingTop: Space.xl,
    paddingBottom: Space.lg,
    ...Shadow.lift,
  },
  sheetHeading: {
    ...typeStyle("title"),
    color: Colors.ink,
  },
  closeHit: {
    minHeight: Size.tap,
    marginTop: Space.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    ...typeStyle("body"),
    color: Colors.orange,
  },
});
