import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { getTerm, hasTerm } from "@/lib/plain-language";
import { fontFamily } from "@/lib/typography";

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
    <View style={styles.card}>
      <View style={styles.row1}>
        <Text style={styles.heading}>{heading || medical}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`More about ${heading || medical}`}
          onPress={() => setSheetOpen(true)}
          style={styles.infoHit}
        >
          <Feather name="info" size={16} color={colors.midTeal} />
        </Pressable>
      </View>
      <Text style={styles.explain}>{explanation || "plain explanation coming soon"}</Text>
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
              <Text style={styles.heading}>{heading || medical}</Text>
              <Text style={styles.explain}>{detail}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setSheetOpen(false)}
                style={styles.closeHit}
              >
                <Text style={styles.closeText}>Close</Text>
              </Pressable>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.base,
    backgroundColor: colors.white,
    borderRadius: radius.radioCard,
    padding: spacing.base,
    ...shadows.card,
  },
  row1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  heading: {
    flex: 1,
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    lineHeight: 22,
    color: colors.inkOnLight,
  },
  infoHit: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  explain: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 22,
    color: colors.inkOnLightMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderOnLight,
    marginVertical: 12,
  },
  clinicalLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    color: colors.inkOnLightMuted,
  },
  medical: {
    marginTop: 4,
    fontFamily: fontFamily.medical,
    fontSize: 13,
    color: colors.inkOnLightMuted,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(13,74,92,0.28)",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    ...shadows.modal,
  },
  closeHit: {
    minHeight: 44,
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
