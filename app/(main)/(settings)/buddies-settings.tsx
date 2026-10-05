import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import {
  EMPTY_BUDDY_SETTINGS,
  interestsFromString,
  interestsToString,
  loadBuddySettings,
  saveBuddySettings,
  type BuddySettings,
} from "@/lib/buddy-settings";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

export default function BuddiesSettingsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const [values, setValues] = useState<BuddySettings>(EMPTY_BUDDY_SETTINGS);
  const [interestsRaw, setInterestsRaw] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) return;
    void (async () => {
      const res = await loadBuddySettings(uid);
      setLoading(false);
      if (!res.ok) {
        setMessage(res.message);
        return;
      }
      setValues(res.row);
      setInterestsRaw(interestsToString(res.row.interests));
    })();
  }, [session?.user.id]);

  if (!session) return <Redirect href={routes.login} />;

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    setSaved(false);
    const payload: BuddySettings = {
      ...values,
      interests: interestsFromString(interestsRaw),
    };
    const res = await saveBuddySettings(session.user.id, payload);
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    setValues(payload);
    setSaved(true);
  };

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <ScreenHeader
        title="Buddy settings"
        onBack={() => router.back()}
        backLabel={COPY.buddiesTitle}
      />

      <View style={styles.card}>
        <Text style={styles.consentTitle}>{COPY.buddiesConsentTitle}</Text>
        <Text style={styles.consentBody}>{COPY.buddiesConsentBody}</Text>
      </View>

      {loading ? (
        <StaticSkeleton rows={4} />
      ) : (
        <View style={styles.form}>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{COPY.profileBuddyToggle}</Text>
              <Text style={styles.hint}>{COPY.profileBuddyToggleHint}</Text>
            </View>
            <Switch
              value={values.is_buddy_discoverable}
              onValueChange={(v) =>
                setValues((prev) => ({ ...prev, is_buddy_discoverable: v }))
              }
              trackColor={{ true: colors.primaryBlue, false: colors.border }}
              thumbColor={colors.white}
            />
          </View>

          <View style={styles.field}>
            <TextInput
              label={COPY.profileBuddyDisplayNameLabel}
              placeholder={COPY.profileBuddyDisplayNamePlaceholder}
              value={values.buddy_display_name}
              onChangeText={(t) =>
                setValues((prev) => ({ ...prev, buddy_display_name: t }))
              }
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <TextInput
              label={COPY.profileBuddyCityLabel}
              placeholder={COPY.profileBuddyCityPlaceholder}
              value={values.city}
              onChangeText={(t) =>
                setValues((prev) => ({ ...prev, city: t }))
              }
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <TextInput
              label={COPY.profileBuddyInterestsLabel}
              placeholder={COPY.profileBuddyInterestsPlaceholder}
              value={interestsRaw}
              onChangeText={setInterestsRaw}
              autoCapitalize="none"
              multiline
              numberOfLines={2}
            />
            <Text style={styles.hint}>{COPY.buddyTagsHint}</Text>
          </View>

          {saved ? <Text style={styles.saved}>{COPY.profileBuddySaved}</Text> : null}
          {message ? <Text style={styles.error}>{message}</Text> : null}

          <View style={{ marginTop: spacing.md }}>
            <PrimaryButton
              title={COPY.buddySettingsSave}
              loading={busy}
              onPress={submit}
            />
            <TextButton title={COPY.backToBuddies} onPress={() => router.replace(routes.buddies)} />
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.base,
    padding: spacing.base,
    borderRadius: radius.card,
    backgroundColor: colors.iceBlue,
  },
  consentTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  consentBody: {
    marginTop: spacing.micro,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
  form: { marginTop: spacing.base },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.base,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    ...shadows.card,
    gap: spacing.sm,
  },
  label: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  hint: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.slate,
  },
  field: { marginTop: spacing.base },
  saved: {
    marginTop: spacing.base,
    fontFamily: fontFamily.bodySemi,
    color: colors.riskLowText,
  },
  error: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    color: colors.riskHighText,
  },
});
