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
import { SafeAreaView } from "react-native-safe-area-context";

import { ShieldTrust } from "@/components/illustrations";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ChoiceCard } from "@/components/ui/ChoiceCard";
import { Screen } from "@/components/ui/Screen";
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { legalPageUrl } from "@/lib/legal";
import { routes } from "@/lib/routes";
import {
  Colors,
  Gap,
  Radius,
  Shadow,
  Size,
  Space,
  typeStyle,
} from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

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
        <View style={styles.footer}>
          {message ? <Text style={styles.error}>{message}</Text> : null}
          <PrimaryButton
            title={COPY.consentGateContinue}
            onPress={() => void onContinue()}
            loading={saving}
            disabled={!bothChecked || saving}
            style={styles.primary}
          />
          <TextButton
            title={COPY.consentGateDecline}
            onPress={() => setDeclineOpen(true)}
            disabled={saving}
          />
        </View>
      }
    >
      <View style={styles.shieldWrap}>
        <ShieldTrust width={96} height={96} />
      </View>
      <Text style={styles.brand}>{COPY.appName}</Text>
      <Text style={styles.title} accessibilityRole="header">
        {COPY.consentGateTitle}
      </Text>

      <Card style={styles.summaryCard} padded={false}>
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
          <TextButton
            title={COPY.consentGateReadPrivacy}
            onPress={() => void openLegal("privacy")}
          />
          <TextButton
            title={COPY.consentGateReadTerms}
            onPress={() => void openLegal("terms")}
          />
        </ScrollView>
      </Card>

      <View style={styles.checks}>
        <ChoiceCard
          label={COPY.consentGateCheckPolicy}
          selected={policyOk}
          multi
          onPress={() => {
            setPolicyOk((value) => !value);
            setMessage(null);
          }}
        />
        <ChoiceCard
          label={COPY.consentGateCheckHealth}
          selected={healthOk}
          multi
          onPress={() => {
            setHealthOk((value) => !value);
            setMessage(null);
          }}
        />
      </View>

      <Modal
        visible={declineOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDeclineOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setDeclineOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <SafeAreaView edges={["bottom"]}>
              <View style={styles.sheetHandle} />
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
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shieldWrap: {
    alignItems: "center",
    marginTop: Space.sm,
  },
  brand: {
    ...typeStyle("label"),
    color: Colors.orange,
    letterSpacing: 1.6,
    textAlign: "center",
    marginTop: Space.lg,
  },
  title: {
    ...typeStyle("title"),
    color: Colors.ink,
    textAlign: "center",
    marginTop: Space.sm,
  },
  summaryCard: {
    marginTop: Gap.afterTitle,
    overflow: "hidden",
  },
  summaryScroll: {
    maxHeight: 340,
  },
  summaryInner: {
    padding: Space.cardPad,
  },
  summaryHeading: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
    marginBottom: Space.sm,
  },
  block: {
    marginTop: Space.lg,
  },
  blockTitle: {
    ...typeStyle("label"),
    color: Colors.ink,
    marginBottom: Space.xs,
  },
  blockBody: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  checks: {
    marginTop: Gap.sections,
    gap: Space.sm,
  },
  footer: {
    paddingTop: Space.xs,
    paddingBottom: Space.xs,
  },
  primary: {
    marginTop: 0,
  },
  error: {
    ...typeStyle("secondary"),
    textAlign: "center",
    marginBottom: Space.sm,
    color: Colors.red,
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
    paddingTop: Space.sm,
    ...Shadow.lift,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.line,
    marginBottom: Space.md,
  },
  sheetTitle: {
    ...typeStyle("section"),
    color: Colors.ink,
  },
  sheetBody: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  sheetRow: {
    marginTop: Space.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Space.sm,
  },
  sheetHit: {
    minHeight: Size.tap,
    justifyContent: "center",
    paddingHorizontal: Space.xs,
  },
  sheetClose: {
    ...typeStyle("body"),
    color: Colors.red,
  },
  sheetBack: {
    ...typeStyle("body"),
    color: Colors.orange,
  },
});
