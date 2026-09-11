import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { isAdminEmail } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { colors, radius, spacing } from "@/lib/design-tokens";
import { ensureProfileRow } from "@/lib/ensure-profile";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

export default function ProfileScreen() {
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const triageStatus = useTriageStore((state) => state.status);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        if (!isSupabaseConfigured) {
          if (!cancelled) {
            setLoadMessage(COPY.missingKeys);
            setFullName(null);
            setLoading(false);
          }
          return;
        }
        const { data, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", session.user.id)
          .maybeSingle();
        if (cancelled) {
          return;
        }
        if (error) {
          throw error;
        }
        if (!data) {
          const ensured = await ensureProfileRow(
            session.user.id,
            typeof session.user.user_metadata?.full_name === "string"
              ? session.user.user_metadata.full_name
              : undefined,
          );
          if (!ensured.ok) {
            setFullName(null);
            setLoadMessage(ensured.message ?? COPY.missingProfile);
            return;
          }
        }
        const name =
          typeof data?.full_name === "string"
            ? data.full_name.trim()
            : typeof session.user.user_metadata?.full_name === "string"
              ? session.user.user_metadata.full_name.trim()
              : "";
        setFullName(name.length > 0 ? name : null);
        setLoadMessage(null);
      } catch (error) {
        if (!cancelled) {
          setFullName(null);
          setLoadMessage(messageFromUnknown(error, COPY.profileLoadFailed));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

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

  return (
    <Screen scroll contentPadding={spacing.screenX}>
      <Text style={styles.title} accessibilityRole="header">
        {COPY.profileTitle}
      </Text>
      <Text style={styles.body}>{COPY.profileBody}</Text>

      {loading ? <StaticSkeleton rows={2} /> : null}

      {loadMessage ? <Text style={styles.error}>{loadMessage}</Text> : null}

      {!loading ? (
        <View style={styles.card}>
          <Text style={styles.label}>{COPY.profileNameLabel}</Text>
          <Text style={styles.value}>{fullName ?? COPY.profileNameEmpty}</Text>
          <Text style={[styles.label, styles.labelGap]}>{COPY.profileEmailLabel}</Text>
          <Text style={styles.value}>
            {email.length > 0 ? email : COPY.profileEmailEmpty}
          </Text>
          {isAdminEmail(email) ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{COPY.profileAdminBadge}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {signOutMessage ? (
        <Text style={styles.error}>{signOutMessage}</Text>
      ) : null}

      <PrimaryButton
        title={COPY.signOut}
        loading={signingOut}
        disabled={signingOut}
        onPress={() => {
          void (async () => {
            setSigningOut(true);
            setSignOutMessage(null);
            try {
              const result = await signOut();
              if (!result.ok) {
                setSignOutMessage(result.message ?? COPY.profileSignOutFailed);
              }
            } catch (error) {
              setSignOutMessage(
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
  title: {
    fontFamily: fontFamily.display,
    fontSize: 26,
    lineHeight: 31,
    letterSpacing: -0.5,
    color: colors.deepTeal,
    textAlign: "center",
  },
  body: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "center",
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
    textAlign: "center",
  },
  card: {
    marginTop: 24,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.slate,
    textAlign: "center",
  },
  labelGap: {
    marginTop: 16,
  },
  value: {
    marginTop: 4,
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: colors.charcoal,
    textAlign: "center",
  },
  badge: {
    marginTop: 16,
    alignSelf: "center",
    backgroundColor: colors.sageLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.sage,
  },
});
