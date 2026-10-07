import { Image } from "expo-image";
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
import { Icon } from "@/components/specimen/Icon";
import { SafeAreaView } from "react-native-safe-area-context";

import { ShieldTrust } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Sheet } from "@/components/specimen/Sheet";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType, tapTarget, TypeStyle } from "@/lib/specimen-tokens";

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
        <Icon name="check" size={20} color={Accent.tag} />
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
        <Image
          source={require("../../assets/images/prescope-logo.png")}
          style={styles.logo}
          contentFit="contain"
          accessibilityLabel="Prescope logo"
        />
      </View>
      <View style={styles.shieldWrap}>
        <ShieldTrust width={120} height={120} />
      </View>
      <Text style={styles.title}>{COPY.consentGateTitle}</Text>

      <Sheet style={styles.summaryCard}>
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
      </Sheet>

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
            <Sheet variant="sheet" style={styles.sheet}>
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
            </Sheet>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    alignItems: "center",
    marginBottom: Measure.tight,
  },
  logo: {
    width: 72,
    height: 72,
  },
  shieldWrap: {
    alignItems: "center",
    marginBottom: Measure.tight,
  },
  title: {
    ...TypeStyle.plateTitle,
    color: Accent.tag,
    textAlign: "center",
    marginBottom: Measure.base,
  },
  summaryCard: {
    maxHeight: "55%",
    overflow: "hidden",
  },
  summaryScroll: {
    maxHeight: 360,
  },
  summaryInner: {
    padding: Measure.base,
    paddingBottom: Measure.loose,
  },
  summaryHeading: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 19,
    lineHeight: 24,
    color: Accent.tag,
    marginBottom: Measure.tight,
  },
  block: {
    marginTop: Measure.base,
  },
  blockTitle: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 17,
    color: Ink.full,
    marginBottom: 4,
  },
  blockBody: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.soft,
  },
  checkCard: {
    marginTop: Measure.tight,
    minHeight: 56,
    borderRadius: Edge.mount,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  checkOff: {
    backgroundColor: Paper.mount,
    borderWidth: 1.5,
    borderColor: Ink.rule,
  },
  checkOn: {
    backgroundColor: Accent.tagWash,
    borderWidth: 2,
    borderColor: Accent.tag,
  },
  checkLabel: {
    flex: 1,
    paddingRight: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 24,
    color: Ink.full,
  },
  checkEmpty: {
    width: 20,
    height: 20,
  },
  error: {
    textAlign: "center",
    fontFamily: SpecimenType.mono,
    fontSize: 15,
    lineHeight: 22,
    color: Accent.tag,
  },
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: Ink.scrim,
  },
  sheet: {
    padding: 20,
  },
  sheetTitle: {
    fontFamily: SpecimenType.monoBold,
    fontSize: 19,
    color: Accent.tag,
  },
  sheetBody: {
    marginTop: 12,
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    lineHeight: 26,
    color: Ink.full,
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
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    color: Accent.tag,
  },
  sheetBack: {
    fontFamily: SpecimenType.mono,
    fontSize: 17,
    color: Accent.tag,
  },
});
