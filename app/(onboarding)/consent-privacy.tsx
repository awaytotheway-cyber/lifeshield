import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShieldTrust } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { GlassSurface } from "@/components/ui/GlassSurface";
import { LogoMark } from "@/components/ui/LogoMark";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

type CheckCardProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

/** Full-width card checkbox — same shape as RadioGroup, never auto-checked. */
function CheckCard({ label, checked, onToggle }: CheckCardProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={[styles.checkCard, checked ? styles.checkOn : styles.checkOff]}
    >
      <Text style={styles.checkLabel}>{label}</Text>
      {checked ? (
        <Feather name="check" size={20} color={colors.midTeal} />
      ) : (
        <View style={styles.checkEmpty} />
      )}
    </Pressable>
  );
}

function PolicyBlock({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.block}>
      <Text style={styles.blockTitle}>{title}</Text>
      <Text style={styles.blockBody}>{body}</Text>
    </View>
  );
}

/**
 * Full-screen Privacy & Terms gate. Nothing else in the app is reachable
 * until both boxes are ticked and a terms_privacy row is saved.
 */
export default function ConsentPrivacyScreen() {
  const router = useRouter();
  const saveTermsConsent = useAuthStore((state) => state.saveTermsConsent);
  const [policyOk, setPolicyOk] = useState(false);
  const [healthOk, setHealthOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const bothChecked = policyOk && healthOk;

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => sub.remove();
  }, []);

  const openLegal = async (section: "privacy" | "terms") => {
    setMessage(null);
    try {
      await WebBrowser.openBrowserAsync(legalPageUrl(section), {
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch (error) {
      setMessage(messageFromUnknown(error, COPY.consentGateLegalError));
    }
  };

  const onContinue = async () => {
    if (!bothChecked) {
      setMessage(COPY.consentGateNeedBoth);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const result = await saveTermsConsent();
      if (!result.ok) {
        setMessage(result.message ?? COPY.setupTables);
        return;
      }
      router.replace(routes.welcome);
    } catch (error) {
      setMessage(messageFromUnknown(error, COPY.setupTables));
    } finally {
      setSaving(false);
    }
  };

  const onCloseApp = () => {
    if (Platform.OS === "android") {
      BackHandler.exitApp();
      return;
    }
    setDeclineOpen(false);
  };

  return (
    <Screen
      scroll
      footer={
        <>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <PrimaryButton
            title={COPY.consentGateContinue}
            onPress={() => void onContinue()}
            loading={saving}
            disabled={!bothChecked || saving}
          />
          <TextButton
            title={COPY.consentGateDecline}
            onPress={() => setDeclineOpen(true)}
            disabled={saving}
          />
        </>
      }
    >
      <View style={styles.logoWrap}>
        <LogoMark size={72} />
      </View>
      <View style={styles.shieldWrap}>
        <ShieldTrust width={120} height={120} />
      </View>
      <Text style={styles.title}>{COPY.consentGateTitle}</Text>

      <GlassSurface intensity="card" style={styles.summaryCard}>
        <ScrollView
          style={styles.summaryScroll}
          contentContainerStyle={styles.summaryInner}
          nestedScrollEnabled
          showsVerticalScrollIndicator
        >
          <Text style={styles.summaryHeading}>{COPY.consentGateCollectsTitle}</Text>
          <Text style={styles.blockBody}>{COPY.consentGateCollectsIntro}</Text>
          <PolicyBlock title={COPY.consentGateAnswersTitle} body={COPY.consentGateAnswersBody} />
          <PolicyBlock title={COPY.consentGateResultsTitle} body={COPY.consentGateResultsBody} />
          <PolicyBlock title={COPY.consentGateGeneticTitle} body={COPY.consentGateGeneticBody} />
          <PolicyBlock title={COPY.consentGatePaymentTitle} body={COPY.consentGatePaymentBody} />
          <PolicyBlock title={COPY.consentGateNeverTitle} body={COPY.consentGateNeverBody} />
          <PolicyBlock title={COPY.consentGateControlTitle} body={COPY.consentGateControlBody} />
          <TextButton
            title={COPY.consentGateReadPrivacy}
            onPress={() => void openLegal("privacy")}
          />
          <TextButton
            title={COPY.consentGateReadTerms}
            onPress={() => void openLegal("terms")}
          />
        </ScrollView>
      </GlassSurface>

      <CheckCard
        label={COPY.consentGateCheckPolicy}
        checked={policyOk}
        onToggle={() => {
          setPolicyOk((value) => !value);
          setMessage(null);
        }}
      />
      <CheckCard
        label={COPY.consentGateCheckHealth}
        checked={healthOk}
        onToggle={() => {
          setHealthOk((value) => !value);
          setMessage(null);
        }}
      />

      <Modal
        visible={declineOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDeclineOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDeclineOpen(false)}>
          <Pressable onPress={() => undefined}>
            <GlassSurface intensity="sheet" style={styles.sheet}>
              <SafeAreaView edges={["bottom"]}>
                <Text style={styles.sheetTitle}>{COPY.consentGateDeclineTitle}</Text>
                <Text style={styles.sheetBody}>{COPY.consentGateDeclineBody}</Text>
                <View style={styles.sheetRow}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={COPY.consentGateCloseApp}
                    onPress={onCloseApp}
                    style={styles.sheetHit}
                  >
                    <Text style={styles.sheetClose}>{COPY.consentGateCloseApp}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={COPY.consentGateGoBack}
                    onPress={() => setDeclineOpen(false)}
                    style={styles.sheetHit}
                  >
                    <Text style={styles.sheetBack}>{COPY.consentGateGoBack}</Text>
                  </Pressable>
                </View>
              </SafeAreaView>
            </GlassSurface>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  shieldWrap: {
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: colors.deepTeal,
    textAlign: "center",
    marginBottom: spacing.base,
  },
  summaryCard: {
    maxHeight: "55%",
    overflow: "hidden",
  },
  summaryScroll: {
    maxHeight: 360,
  },
  summaryInner: {
    padding: spacing.base,
    paddingBottom: spacing.md,
  },
  summaryHeading: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    lineHeight: 22,
    color: colors.deepTeal,
    marginBottom: spacing.sm,
  },
  block: {
    marginTop: spacing.base,
  },
  blockTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
    marginBottom: 4,
  },
  blockBody: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  checkCard: {
    marginTop: spacing.sm,
    minHeight: 56,
    borderRadius: radius.radioCard,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkOff: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  checkOn: {
    backgroundColor: colors.lightTeal,
    borderWidth: 2,
    borderColor: colors.midTeal,
  },
  checkLabel: {
    flex: 1,
    paddingRight: 12,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkOnLight,
  },
  checkEmpty: {
    width: 20,
    height: 20,
  },
  error: {
    textAlign: "center",
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.coral,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(13,74,92,0.28)",
  },
  sheet: {
    padding: 20,
  },
  sheetTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: colors.deepTeal,
  },
  sheetBody: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.charcoal,
  },
  sheetRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sheetHit: {
    minHeight: tapTarget,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  sheetClose: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.coral,
  },
  sheetBack: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.midTeal,
  },
});
