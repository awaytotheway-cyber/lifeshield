import Constants from "expo-constants";
import { Redirect, useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { IconButton, TextButton } from "@/components/ui/Button";
import { InitialDisc } from "@/components/ui/InitialDisc";
import { Screen } from "@/components/ui/Screen";
import { Surface } from "@/components/ui/Surface";
import { TrustBanner } from "@/components/ui/TrustBanner";
import { TwoTone } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import {
  colors,
  controlHeight,
  radius,
  spacing,
  status,
  tapTarget,
} from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import {
  discoverableFromProfile,
  loadExtendedProfile,
  saveBuddyDiscoverable,
} from "@/lib/profile-extended";
import { routes } from "@/lib/routes";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useConsentStore } from "@/stores/consent-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * A 56pt settings row. Taller than the 44pt floor, and the one height every
 * row on this screen shares whether it navigates or carries a switch.
 */
const ROW_HEIGHT = controlHeight;

/** A micro-caps group label over a `Surface` block of rows. */
function GroupLabel({ text }: { text: string }) {
  return <Text style={styles.groupLabel}>{text}</Text>;
}

type LinkRowProps = {
  title: string;
  /** Right-aligned value before the chevron — a count, a version. */
  value?: string;
  href: Href;
  /** False on the last row of a block: nothing follows it to divide from. */
  divided?: boolean;
};

/**
 * A row that goes somewhere. The chevron is the whole affordance — there is
 * no icon column, because five green glyphs down the left of a settings list
 * say nothing the labels do not.
 */
function LinkRow({ title, value, href, divided = true }: LinkRowProps) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      onPress={() => router.push(href)}
      style={({ pressed }) => [
        styles.row,
        divided ? styles.rowDivided : null,
        pressed ? styles.rowPressed : null,
      ]}
    >
      <Text style={[styles.rowLabel, styles.rowLabelFill]}>{title}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      <Feather name="chevron-right" size={18} color={colors.inkFaint} />
    </Pressable>
  );
}

type SwitchRowProps = {
  title: string;
  /** Sits under the label, inside the row, and grows the row past 56pt. */
  subtitle?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  divided?: boolean;
};

/**
 * A row that is a switch. The whole row is the label — the switch is
 * right-aligned and the hit area is the switch itself, so a mis-tap on a
 * privacy control cannot flip it.
 */
function SwitchRow({
  title,
  subtitle,
  value,
  disabled = false,
  onChange,
  divided = true,
}: SwitchRowProps) {
  return (
    <View style={[styles.row, divided ? styles.rowDivided : null]}>
      <View style={styles.rowTextCol}>
        <Text style={styles.rowLabel}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        // The board's switch accent is ink. Off is the hairline, the one
        // divider colour, so an off switch reads as absent rather than grey.
        trackColor={{ false: colors.hairline, true: colors.ink }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.hairline}
      />
    </View>
  );
}

/** Settings hub — replaces the old instant redirect to profile. */
export default function SettingsIndex() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const triageStatus = useTriageStore((state) => state.status);
  // Already fetched before the tab shell renders (see app/(main)/_layout.tsx),
  // so the Consents row can show its count without a second query.
  const consentsLoaded = useConsentStore((state) => state.loaded);
  const agreed = useConsentStore((state) => state.agreed);

  const [fullName, setFullName] = useState("");
  const [discoverable, setDiscoverable] = useState(false);
  const [savingDiscoverable, setSavingDiscoverable] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const userId = session?.user.id;
  const metaName =
    typeof session?.user.user_metadata?.full_name === "string"
      ? session.user.user_metadata.full_name
      : "";

  const load = useCallback(() => {
    if (!userId) {
      return () => {};
    }
    let cancelled = false;
    void (async () => {
      const result = await loadExtendedProfile(userId);
      if (cancelled) {
        return;
      }
      // A failed load leaves the switch off — `discoverableFromProfile(null)`
      // is false, and so is the state it was initialised with.
      setDiscoverable(discoverableFromProfile(result.profile));
      setFullName(result.profile?.full_name?.trim() ?? "");
      if (!result.ok) {
        setMessage(result.message ?? COPY.profileLoadFailed);
        return;
      }
      setMessage(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useFocusEffect(load);

  if (!session) {
    return <Redirect href={routes.login} />;
  }
  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }
  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const email = session.user.email?.trim() ?? "";
  const displayName = fullName || metaName.trim();
  const consentsGiven = Object.values(agreed).filter(Boolean).length;
  const appVersion =
    Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null;

  /**
   * Writes on toggle. The switch moves first so the control does not feel
   * dead, and moves back if the write fails — the position it ends on is
   * always the position the column holds.
   */
  const onToggleDiscoverable = (next: boolean) => {
    if (!session.user.id) {
      return;
    }
    const previous = discoverable;
    setDiscoverable(next);
    setSavingDiscoverable(true);
    setMessage(null);
    void (async () => {
      try {
        const result = await saveBuddyDiscoverable(session.user.id, next);
        if (!result.ok) {
          setDiscoverable(previous);
          setMessage(result.message ?? COPY.settingsDiscoverableSaveFailed);
        }
      } catch (error) {
        setDiscoverable(previous);
        setMessage(
          messageFromUnknown(error, COPY.settingsDiscoverableSaveFailed),
        );
      } finally {
        setSavingDiscoverable(false);
      }
    })();
  };

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Back to home"
          onPress={() => router.replace(routes.home)}
          style={styles.back}
        />
      </View>

      <View accessibilityRole="header">
        <TwoTone size="xl" parts={[{ text: COPY.settingsTitle, tone: "bold" }]} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={COPY.settingsOpenProfile}
        onPress={() => router.push(routes.profile)}
        style={({ pressed }) => [
          styles.profileRow,
          pressed ? styles.profileRowPressed : null,
        ]}
      >
        <InitialDisc name={displayName} size={52} />
        <View style={styles.profileTextCol}>
          <Text style={styles.profileName} numberOfLines={1}>
            {displayName.length > 0 ? displayName : COPY.settingsOpenProfile}
          </Text>
          <Text style={styles.profileEmail} numberOfLines={1}>
            {email.length > 0 ? email : COPY.profileEmailEmpty}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.inkFaint} />
      </Pressable>

      <GroupLabel text={COPY.settingsGroupYourData} />
      <Surface padded={false} style={styles.block}>
        <LinkRow
          title={COPY.settingsOpenConsents}
          value={
            consentsLoaded
              ? `${consentsGiven} ${COPY.settingsConsentsGivenSuffix}`
              : undefined
          }
          href={routes.settingsConsents}
        />
        <LinkRow
          title={COPY.settingsOpenPrivacy}
          href={routes.settingsPrivacy}
          divided={false}
        />
      </Surface>

      <GroupLabel text={COPY.settingsGroupReminders} />
      <Surface padded={false} style={styles.block}>
        <LinkRow
          title={COPY.settingsOpenNotifications}
          href={routes.settingsNotifications}
          divided={false}
        />
      </Surface>

      <GroupLabel text={COPY.settingsGroupBuddies} />
      <Surface padded={false} style={styles.block}>
        <SwitchRow
          title={COPY.settingsDiscoverable}
          subtitle={COPY.settingsDiscoverableHint}
          value={discoverable}
          disabled={savingDiscoverable}
          onChange={onToggleDiscoverable}
          divided={false}
        />
      </Surface>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <Surface padded={false} style={styles.block}>
        <LinkRow title={COPY.settingsOpenHelp} href={routes.settingsHelp} />
        <LinkRow
          title={COPY.settingsOpenAbout}
          value={appVersion ? `v${appVersion}` : undefined}
          href={routes.settingsAbout}
          divided={false}
        />
      </Surface>

      {/*
        Load-bearing privacy wording (RLS, "not a diagnosis"). This is the
        screen where someone manages their consents and their own data, so it
        stays in full rather than being trimmed as decoration.
      */}
      <View style={styles.banner}>
        <TrustBanner />
      </View>

      {/* A plain underlined link, not a button — there is no ink button here. */}
      <TextButton
        title={COPY.settingsLogOut}
        loading={signingOut}
        disabled={signingOut}
        onPress={() => {
          void (async () => {
            setSigningOut(true);
            setMessage(null);
            try {
              const result = await signOut();
              if (!result.ok) {
                setMessage(result.message ?? COPY.profileSignOutFailed);
              }
            } catch (error) {
              setMessage(
                messageFromUnknown(error, COPY.profileSignOutFailed),
              );
            } finally {
              setSigningOut(false);
            }
          })();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    // Pulled into the gutter so the glyph, not its 44pt hit area, lines up
    // with the headline under it.
    marginLeft: -12,
  },
  profileRow: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: tapTarget,
    paddingVertical: 18,
    paddingHorizontal: 20,
    backgroundColor: colors.white,
    borderRadius: radius.surface,
  },
  profileRowPressed: {
    backgroundColor: colors.mossTint,
  },
  profileTextCol: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontFamily: fontFamily.display,
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: colors.ink,
  },
  profileEmail: {
    marginTop: 2,
    ...typography.label,
    color: colors.inkSoft,
  },
  groupLabel: {
    marginTop: 22,
    marginBottom: 10,
    ...typography.micro,
    // 11px micro labels use `inkMuted`; `inkFaint` is headline-only.
    color: colors.inkMuted,
  },
  block: {
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: ROW_HEIGHT,
    paddingVertical: 10,
  },
  // The one divider in the system: a 1px hairline between rows of a block,
  // never a border around the block itself.
  rowDivided: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowPressed: {
    backgroundColor: colors.mossTint,
  },
  rowTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  /** Only where the label is a direct child of the row, not of a text column. */
  rowLabelFill: {
    flex: 1,
  },
  rowSubtitle: {
    marginTop: 2,
    ...typography.label,
    color: colors.inkSoft,
  },
  rowValue: {
    ...typography.label,
    color: colors.inkSoft,
  },
  banner: {
    marginTop: spacing.md,
  },
  error: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: CLAY,
  },
});
