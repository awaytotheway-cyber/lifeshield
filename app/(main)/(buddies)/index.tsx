import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { SafetyStrip } from "@/components/buddies/SafetyStrip";
import { IconButton, SecondaryButton } from "@/components/ui/Button";
import { InitialDisc } from "@/components/ui/InitialDisc";
import { Screen } from "@/components/ui/Screen";
import { SwitchRow } from "@/components/ui/SwitchRow";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { Surface } from "@/components/ui/Surface";
import { Toast } from "@/components/ui/Toast";
import { TwoTone, type TwoTonePart } from "@/components/ui/TwoTone";
import {
  acceptConnection,
  connectionRole,
  connectionStatusFor,
  describeBuddy,
  discoverBuddies,
  displayNameFrom,
  loadBuddyProfiles,
  loadMyConnections,
  requestConnection,
  type BuddyMatch,
  type BuddyProfile,
  type Connection,
} from "@/lib/buddies";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
import {
  FEATURE_FLAG_DEFAULTS,
  isFeatureEnabled,
  type FeatureFlagProfile,
} from "@/lib/feature-flags";
import { COPY } from "@/lib/copy";
import { messageFromUnknown } from "@/lib/friendly-errors";
import {
  discoverableFromProfile,
  loadExtendedProfile,
  saveBuddyDiscoverable,
} from "@/lib/profile-extended";
import { buddyChatHref, routes } from "@/lib/routes";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

/** The board's headline, at the board's 44. */
const HEADLINE: TwoTonePart[] = [
  { text: "Nobody ", tone: "bold" },
  { text: "does this", tone: "grey" },
  { text: " alone", tone: "bold" },
];
const HEADLINE_SIZE = 44;

const LEDE =
  "Find someone at a similar point. First names only — nothing from your assessment is ever shared.";

/** Verbatim. See components/buddies/SafetyStrip.tsx. */
const SAFETY =
  "Buddies see only your first name, city and goals. You can block or leave a chat at any time.";

/**
 * The search RPC matches a name or a city with two characters or more. One
 * character is an enumeration, not a search, so it is not sent — the
 * reconciled function refuses it server-side anyway and this says why.
 */
const MIN_SEARCH = 2;

/** Typing pause before a search is sent. */
const DEBOUNCE_MS = 300;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** My own three fields: the flag gate, plus what the filter chips are built from. */
type MyProfile = FeatureFlagProfile & {
  city: string | null;
  interests: string[];
};

/**
 * With no Supabase configured there is no profile to read, so the flag falls
 * to its shipped default (now true) and there are no chips. Derived rather than
 * written into state, so the effect below never sets state synchronously.
 */
const OFFLINE_PROFILE: MyProfile = {
  feature_flags: {},
  city: null,
  interests: [],
};

type LoadState = "idle" | "loading" | "ready" | "error";

/** A chip filters the rows already fetched. `null` is no filter. */
type Chip = { key: string; label: string };

type Row =
  | {
      kind: "incoming" | "outgoing" | "active";
      key: string;
      buddyId: string;
      name: string;
      subtitle: string;
      connection: Connection;
    }
  | {
      kind: "match";
      key: string;
      buddyId: string;
      name: string;
      subtitle: string;
    };

/** "Your buddy since August" — from the connection's own date, or "". */
function buddySince(iso: string): string {
  const at = Date.parse(iso ?? "");
  if (!Number.isFinite(at)) return "";
  const date = new Date(at);
  const month = MONTHS[date.getMonth()];
  if (!month) return "";
  return `Your buddy since ${month}`;
}

/** Interests are stored lowercase; a chip reads better with its first letter up. */
function chipLabel(interest: string): string {
  return interest.charAt(0).toUpperCase() + interest.slice(1);
}

/**
 * Find a buddy.
 *
 * Three kinds of row share one card: a request waiting for me (Accept), a
 * buddy I already have (Open), and someone I could ask (Say hello). Which
 * control a row gets is decided by `connectionStatusFor` from lib/buddies.ts,
 * not by a local reading of the status column — the directional model makes
 * "they asked me" and "I asked them" different rows, and getting that
 * backwards would let someone accept their own request.
 *
 * Searching narrows to discovery only. The RPC already excludes people I am
 * connected to, so a search cannot return them, and leaving my own buddies
 * sitting unfiltered above the results would read as matches.
 */
export default function BuddiesScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.user.id ?? null;

  const [fetchedProfile, setFetchedProfile] = useState<MyProfile | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [profiles, setProfiles] = useState<BuddyProfile[]>([]);
  const [matches, setMatches] = useState<BuddyMatch[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [chip, setChip] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requested, setRequested] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((n) => n + 1);
  }, []);

  useFocusEffect(reload);

  // Being found is each person's own choice and starts off. It is the same
  // setting as More → Let others find me, kept here so it is right beside the
  // search it affects.
  const [discoverable, setDiscoverable] = useState(false);
  const [savingDiscoverable, setSavingDiscoverable] = useState(false);
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let cancelled = false;
    void (async () => {
      const result = await loadExtendedProfile(userId);
      if (!cancelled) {
        // A failed load leaves the switch off, the safe reading.
        setDiscoverable(discoverableFromProfile(result.profile));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const onToggleDiscoverable = (next: boolean) => {
    if (!userId) return;
    const previous = discoverable;
    setDiscoverable(next);
    setSavingDiscoverable(true);
    void (async () => {
      try {
        const result = await saveBuddyDiscoverable(userId, next);
        if (!result.ok) {
          setDiscoverable(previous);
          setToast(result.message ?? COPY.settingsDiscoverableSaveFailed);
        } else {
          setToast(next ? "Others can find you now" : "You are hidden from search");
        }
      } catch (error) {
        setDiscoverable(previous);
        setToast(messageFromUnknown(error, COPY.settingsDiscoverableSaveFailed));
      } finally {
        setSavingDiscoverable(false);
      }
    })();
  };

  // The flag lives on `profiles.feature_flags`, which no other read on this
  // screen fetches, so city and interests ride along in the same select.
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("feature_flags, city, interests")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      const row = (data ?? {}) as Partial<MyProfile>;
      setFetchedProfile({
        feature_flags: row.feature_flags ?? {},
        city: typeof row.city === "string" ? row.city : null,
        interests: Array.isArray(row.interests) ? row.interests : [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  const profile = isSupabaseConfigured ? fetchedProfile : OFFLINE_PROFILE;

  // While the profile read is in flight the compile-time default stands, so a
  // gated surface is never rendered on an unread flag. For social_v1 that
  // default is true.
  const enabled =
    profile === null
      ? FEATURE_FLAG_DEFAULTS.social_v1
      : isFeatureEnabled(profile, "social_v1");

  /** My connections, and then the names behind their ids. */
  useEffect(() => {
    if (!userId || !enabled) return;
    let cancelled = false;
    void (async () => {
      const outcome = await loadMyConnections();
      if (cancelled) return;
      if (!outcome.ok) {
        setErrorMessage(outcome.message);
        return;
      }
      setConnections(outcome.rows);

      const otherIds = outcome.rows
        .filter((row) => connectionStatusFor(row, userId) !== "none")
        .map((row) =>
          connectionRole(row, userId) === "requester"
            ? row.addressee_id
            : row.requester_id,
        );
      const names = await loadBuddyProfiles(otherIds);
      if (cancelled) return;
      setProfiles(names.rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, enabled, reloadKey]);

  /**
   * Discovery, debounced while typing.
   *
   * A one-character query is not sent at all, and the rows from the longer
   * query before it are dropped from the view rather than from state — see
   * `tooShort` below. Nothing is cleared here, so this effect never writes
   * state synchronously.
   */
  useEffect(() => {
    if (!userId || !enabled) return;
    const trimmed = search.trim();
    if (trimmed.length > 0 && trimmed.length < MIN_SEARCH) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      // The skeleton appears when the request actually goes out, not on the
      // first keystroke of a word still being typed.
      setState("loading");
      void discoverBuddies(trimmed).then((outcome) => {
        if (cancelled) return;
        if (outcome.ok) {
          setMatches(outcome.rows);
          setErrorMessage(null);
          setState("ready");
        } else {
          setMatches([]);
          setErrorMessage(outcome.message);
          setState("error");
        }
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [userId, enabled, search, reloadKey]);

  const chips = useMemo<Chip[]>(() => {
    const list: Chip[] = [];
    const city = (profile?.city ?? "").trim();
    // "Near me" can only mean "the city on my own profile". With no city of
    // my own there is nothing to compare against, so the chip is not drawn.
    if (city.length > 0) {
      list.push({ key: `city:${city.toLowerCase()}`, label: "Near me" });
    }
    for (const interest of profile?.interests ?? []) {
      const word = (interest ?? "").trim();
      if (word.length === 0) continue;
      list.push({ key: `interest:${word.toLowerCase()}`, label: chipLabel(word) });
      if (list.length >= 5) break;
    }
    return list;
  }, [profile]);

  const rows = useMemo<Row[]>(() => {
    if (!userId) return [];
    const byId = new Map(profiles.map((row) => [row.user_id, row]));
    const query = search.trim();
    const searching = query.length > 0;
    // Results from the longer query the user has just deleted back to one
    // character must not sit under a "type at least two letters" line.
    const stale = searching && query.length < MIN_SEARCH;

    const mine: Row[] = [];
    if (!searching) {
      const order = { incoming_request: 0, active: 1, outgoing_request: 2 };
      const views = connections
        .map((connection) => ({
          connection,
          view: connectionStatusFor(connection, userId),
        }))
        // 'declined' and 'inactive' read as "none" and are not rows: there is
        // no control a declined request could carry.
        .filter(
          (entry): entry is { connection: Connection; view: keyof typeof order } =>
            entry.view !== "none",
        )
        .sort((a, b) => order[a.view] - order[b.view]);

      for (const { connection, view } of views) {
        const buddyId =
          connectionRole(connection, userId) === "requester"
            ? connection.addressee_id
            : connection.requester_id;
        const found = byId.get(buddyId);
        const name = found?.display_name ?? displayNameFrom(null, null);
        const described = found ? describeBuddy(found) : "";
        const subtitle =
          view === "active"
            ? buddySince(connection.created_at) || described
            : view === "incoming_request"
              ? described || "Sent you a buddy request"
              : described || "Waiting for them to accept";
        mine.push({
          kind:
            view === "incoming_request"
              ? "incoming"
              : view === "outgoing_request"
                ? "outgoing"
                : "active",
          key: connection.id,
          buddyId,
          name,
          subtitle,
          connection,
        });
      }
    }

    const found: Row[] = (stale ? [] : matches)
      .filter((row) => {
        if (chip === null) return true;
        if (chip.startsWith("city:")) {
          return (row.city ?? "").trim().toLowerCase() === chip.slice(5);
        }
        const want = chip.slice("interest:".length);
        return (row.interests ?? []).some(
          (interest) => (interest ?? "").trim().toLowerCase() === want,
        );
      })
      .map((row) => ({
        kind: "match" as const,
        key: `match:${row.user_id}`,
        buddyId: row.user_id,
        name: row.display_name,
        subtitle: describeBuddy(row),
      }));

    return [...mine, ...found];
  }, [userId, connections, profiles, matches, chip, search]);

  const onSayHello = (buddyId: string) => {
    // No unique constraint on (requester_id, addressee_id), so a double tap
    // would insert a second pending request. The row is disabled for the
    // round trip and stays disabled once it has succeeded.
    if (busyId !== null) return;
    setBusyId(buddyId);
    void requestConnection(buddyId).then((outcome) => {
      setBusyId(null);
      if (outcome.ok) {
        setRequested((previous) => [...previous, buddyId]);
        setToast("Request sent");
      } else {
        setErrorMessage(outcome.message);
      }
    });
  };

  const onAccept = (connectionId: string) => {
    if (busyId !== null) return;
    setBusyId(connectionId);
    void acceptConnection(connectionId).then((outcome) => {
      setBusyId(null);
      if (outcome.ok) {
        setToast("You're buddies now");
        reload();
      } else {
        setErrorMessage(outcome.message);
      }
    });
  };

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  const backRow = (
    <View style={styles.topRow}>
      <IconButton
        icon="arrow-left"
        accessibilityLabel="Back to home"
        onPress={() => router.replace(routes.home)}
        style={styles.back}
      />
    </View>
  );

  if (!enabled) {
    return (
      <Screen scroll contentPadding={spacing.screenX} centered={false}>
        {backRow}
        <View accessibilityRole="header" style={styles.headline}>
          <TwoTone size={HEADLINE_SIZE} parts={HEADLINE} />
        </View>
        <Text style={styles.gated}>
          Buddies is switched off for your account while we test it with a
          small group. Nobody can find you and nothing is shared until it is
          switched on.
        </Text>
      </Screen>
    );
  }

  const trimmed = search.trim();
  const searching = trimmed.length > 0;
  const tooShort = searching && trimmed.length < MIN_SEARCH;
  const loading = !tooShort && state === "loading" && rows.length === 0;

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      {backRow}

      <View accessibilityRole="header" style={styles.headline}>
        <TwoTone size={HEADLINE_SIZE} parts={HEADLINE} />
      </View>
      <Text style={styles.lede}>{LEDE}</Text>

      <Surface padded={false} style={styles.discoverBlock}>
        <SwitchRow
          title={COPY.settingsDiscoverable}
          subtitle={COPY.settingsDiscoverableHint}
          value={discoverable}
          disabled={savingDiscoverable}
          onChange={onToggleDiscoverable}
          divided={false}
        />
      </Surface>

      <View style={styles.searchField}>
        <Feather
          name="search"
          size={18}
          color={colors.inkMuted}
          style={styles.searchIcon}
        />
        <RNTextInput
          accessibilityLabel="Search buddies"
          placeholder="Search by name or city"
          placeholderTextColor={colors.inkMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.searchInput}
        />
      </View>

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((entry) => {
            const on = chip === entry.key;
            return (
              <Pressable
                key={entry.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Filter by ${entry.label}`}
                onPress={() => setChip(on ? null : entry.key)}
                style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
              >
                <Text style={on ? styles.chipTextOn : styles.chipTextOff}>
                  {entry.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {loading ? (
        <View style={styles.block}>
          <StaticSkeleton rows={3} />
        </View>
      ) : null}

      {rows.length > 0 ? (
        <Surface padded={false} style={styles.card}>
          {rows.map((row, index) => {
            const last = index === rows.length - 1;
            const open =
              row.kind === "active"
                ? () =>
                    router.push(
                      buddyChatHref(row.connection.id, row.buddyId, row.name),
                    )
                : undefined;

            const body = (
              <>
                <InitialDisc name={row.name} />
                <View style={styles.rowText}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {row.name}
                  </Text>
                  {row.subtitle.length > 0 ? (
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {row.subtitle}
                    </Text>
                  ) : null}
                </View>
                {row.kind === "active" ? (
                  <Text style={styles.openLink}>Open</Text>
                ) : null}
                {row.kind === "incoming" ? (
                  <SecondaryButton
                    title="Accept"
                    disabled={busyId !== null}
                    loading={busyId === row.connection.id}
                    onPress={() => onAccept(row.connection.id)}
                    style={styles.rowButton}
                  />
                ) : null}
                {row.kind === "outgoing" ? (
                  <Text style={styles.rowPending}>Requested</Text>
                ) : null}
                {row.kind === "match" ? (
                  requested.includes(row.buddyId) ? (
                    <Text style={styles.rowPending}>Requested</Text>
                  ) : (
                    <SecondaryButton
                      title="Say hello"
                      disabled={busyId !== null}
                      loading={busyId === row.buddyId}
                      onPress={() => onSayHello(row.buddyId)}
                      style={styles.rowButton}
                    />
                  )
                ) : null}
              </>
            );

            return open ? (
              <Pressable
                key={row.key}
                accessibilityRole="button"
                accessibilityLabel={`Open your chat with ${row.name}`}
                onPress={open}
                style={[styles.row, last ? null : styles.divider]}
              >
                {body}
              </Pressable>
            ) : (
              <View
                key={row.key}
                style={[styles.row, last ? null : styles.divider]}
              >
                {body}
              </View>
            );
          })}
        </Surface>
      ) : null}

      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}

      {tooShort ? (
        <Text style={styles.empty}>
          Type at least two letters of a name or a city.
        </Text>
      ) : null}

      {!tooShort && state === "ready" && rows.length === 0 ? (
        <Text style={styles.empty}>
          {searching
            ? "Nobody matched that. Try a first name, or the city they live in."
            : "Nobody is discoverable yet. People appear here once they turn on “Let others find me” in Settings."}
        </Text>
      ) : null}

      <View style={styles.block}>
        <SafetyStrip text={SAFETY} />
      </View>

      <Toast message={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  // Pulled into the gutter so the glyph, not its 44pt hit area, lines up with
  // the headline under it.
  back: {
    marginLeft: -12,
  },
  headline: {
    marginTop: 8,
  },
  lede: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
  searchField: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: radius.control,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    padding: 0,
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.ink,
  },
  chips: {
    marginTop: 14,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    minHeight: tapTarget,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  chipOn: {
    backgroundColor: colors.ink,
  },
  chipOff: {
    backgroundColor: colors.white,
  },
  chipTextOn: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.white,
  },
  chipTextOff: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: colors.inkSoft,
  },
  card: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 86,
  },
  // The one divider in the system, and only between rows — never under the
  // last one, which would read as a border on the card.
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.hairline,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 13,
  },
  rowName: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  rowMeta: {
    marginTop: 2,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  // The outline button is 56pt and full-width by default; inside an 86pt row
  // it is the board's 44pt pill-less control instead.
  rowButton: {
    marginTop: 0,
    width: "auto",
    minHeight: tapTarget,
    paddingHorizontal: 16,
  },
  openLink: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 14,
    color: colors.ink,
    textDecorationLine: "underline",
  },
  rowPending: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.inkMuted,
  },
  block: {
    marginTop: 16,
  },
  discoverBlock: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  empty: {
    marginTop: 16,
    ...typography.body,
    color: colors.inkSoft,
  },
  error: {
    marginTop: 16,
    ...typography.body,
    color: colors.inkSoft,
  },
  gated: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
});
