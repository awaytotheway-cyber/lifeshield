import { Redirect, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
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
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
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
    <Screen scroll>
      <ScreenHeader
        title="Buddy settings"
        onBack={() => router.back()}
        backLabel={COPY.buddiesTitle}
      />

      <Card>
        <Text style={styles.consentTitle}>{COPY.buddiesConsentTitle}</Text>
        <Text style={styles.consentBody}>{COPY.buddiesConsentBody}</Text>
      </Card>

      {loading ? (
        <View style={styles.skeleton}>
          <StaticSkeleton rows={3} />
        </View>
      ) : (
        <>
          <SectionTitle title="Discoverability" />
          <Card padded={false} style={styles.rowsCard}>
            <ListRow
              label={COPY.profileBuddyToggle}
              subtitle={COPY.profileBuddyToggleHint}
              divider={false}
              right={
                <Switch
                  accessibilityLabel={COPY.profileBuddyToggle}
                  value={values.is_buddy_discoverable}
                  onValueChange={(next) =>
                    setValues((prev) => ({
                      ...prev,
                      is_buddy_discoverable: next,
                    }))
                  }
                  trackColor={{ true: Colors.orange, false: Colors.line }}
                  thumbColor={Colors.white}
                />
              }
            />
          </Card>

          <SectionTitle title="How you appear" />
          <Card>
            <TextInput
              label={COPY.profileBuddyDisplayNameLabel}
              placeholder={COPY.profileBuddyDisplayNamePlaceholder}
              value={values.buddy_display_name}
              onChangeText={(t) =>
                setValues((prev) => ({ ...prev, buddy_display_name: t }))
              }
              autoCapitalize="words"
            />
            <TextInput
              label={COPY.profileBuddyCityLabel}
              placeholder={COPY.profileBuddyCityPlaceholder}
              value={values.city}
              onChangeText={(t) => setValues((prev) => ({ ...prev, city: t }))}
              autoCapitalize="words"
            />
            <TextInput
              label={COPY.profileBuddyInterestsLabel}
              hint="Up to 12 tags · 32 characters each"
              placeholder={COPY.profileBuddyInterestsPlaceholder}
              value={interestsRaw}
              onChangeText={setInterestsRaw}
              autoCapitalize="none"
              multiline
              numberOfLines={2}
            />
          </Card>

          {saved ? (
            <Text style={styles.saved}>{COPY.profileBuddySaved}</Text>
          ) : null}
          {message ? <Text style={styles.error}>{message}</Text> : null}

          <View style={styles.footer}>
            <PrimaryButton
              title="Save buddy settings"
              loading={busy}
              onPress={submit}
            />
            <TextButton
              title="Back to buddies"
              onPress={() => router.replace(routes.buddies)}
            />
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  consentTitle: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  consentBody: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  skeleton: {
    marginTop: Gap.sections,
  },
  rowsCard: {
    paddingHorizontal: Space.cardPad,
    paddingVertical: Space.xs,
  },
  saved: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.green,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.lg,
    color: Colors.red,
  },
  footer: {
    marginTop: Gap.beforeFooter,
  },
});
