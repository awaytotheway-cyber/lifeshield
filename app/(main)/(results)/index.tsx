import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { IconButton, PrimaryButton, TextButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ResultCard } from "@/components/ui/ResultCard";
import { Screen } from "@/components/ui/Screen";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { Surface } from "@/components/ui/Surface";
import { TwoTone, type TwoTonePart } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import {
  colors,
  spacing,
  status,
  tapTarget,
  type StatusKind,
} from "@/lib/design-tokens";
import { getTerm } from "@/lib/plain-language";
import { routes } from "@/lib/routes";
import { fontFamily, typography } from "@/lib/typography";
import { refreshTier1Orders, refreshTier4Orders } from "@/lib/plan";
import { useAuthStore } from "@/stores/auth-store";
import {
  useQuestionnaireStore,
  type TestOrderRow,
} from "@/stores/questionnaire-store";
import { useTriageStore } from "@/stores/triage-store";

/**
 * The one headline on the screen. Display copy lives beside the screen that
 * prints it; `COPY.resultsTitle` stays the name of the screen for anything
 * that needs one in prose.
 */
const HEADLINE: TwoTonePart[] = [
  { text: "Worth ", tone: "bold" },
  { text: "a", tone: "grey" },
  { text: " conversation", tone: "bold" },
];

/**
 * 44, not `displayXL`'s 46. The board sets this screen's headline a point
 * smaller than the reports screen's so "Worth a conversation" keeps to three
 * lines at 390pt.
 */
const HEADLINE_SIZE = 44;

/** Where the list came from, as the micro eyebrow beside the way back. */
const EYEBROW = "From your assessment";

/**
 * The caveat under the list, verbatim. It is the sentence that says what the
 * whole screen is and is not, so it is not shortened or merged into the lede.
 */
const CHECKLIST_NOTE =
  "These are awareness suggestions from a fixed checklist — not a diagnosis, and not a test order.";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/** The "All" tab. `null` is no filter rather than a sample word. */
const ALL = null;

/**
 * Counted in words, the way the board says it: "Three things came up."
 * A numeral there would read as a measurement of something.
 */
const COUNT_WORDS = [
  "No",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

function ledeFor(count: number): string {
  const counted = count < COUNT_WORDS.length ? COUNT_WORDS[count] : String(count);
  const things = count === 1 ? "thing" : "things";
  return `${counted} ${things} came up. Take this list to a practitioner — Prescope does not book or interpret tests.`;
}

/**
 * The plain word for the sample each suggestion is taken with, which is what
 * the filter tabs are made of.
 *
 * Only tests whose own dictionary entry names the sample are listed. BRCA,
 * the heavy-metal panel and the CYP450 assessment can each be run on more
 * than one sample, so they are left out and show under "All" alone rather
 * than being filed under a sample they may not use. Nothing on this
 * checklist is an imaging study, so there is no "Imaging" word to offer.
 */
const SAMPLE_WORD: Record<string, string> = {
  ctc: "Blood",
  routineBloods: "Blood",
  thyroid: "Blood",
  fastingInsulin: "Blood",
  b12FolateFerritin: "Blood",
  snp: "Saliva",
  salivaryCortisol: "Saliva",
  dutch: "Urine",
  urinaryIodine: "Urine",
  stool: "Stool",
};

/** Tab order, so the row does not reshuffle as rows arrive. */
const SAMPLE_ORDER = ["Blood", "Saliva", "Urine", "Stool"];

/**
 * A suggestion's own status.
 *
 * Tier 3 is the baseline panel every Pathway A user is given, so it is worth
 * watching. A tier 1, 2 or 4 row is on the list because something in this
 * person's own answers put it there, which is worth discussing. No
 * suggestion is ever "within range" — none of these is a result.
 */
function statusForTier(tier: number): StatusKind {
  return tier === 3 ? "worthWatching" : "worthDiscussing";
}

function labelForTier(tier: number): string {
  return tier === 3 ? COPY.resultsGroupWatching : COPY.resultsChipDiscuss;
}

export default function ResultsScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const triageStatus = useTriageStore((state) => state.status);
  const loadTestOrders = useQuestionnaireStore((state) => state.loadTestOrders);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<TestOrderRow[]>([]);
  const [sample, setSample] = useState<string | null>(ALL);

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    setLoading(true);
    try {
      // Tier 4 is directed by Tier 3 results, which arrive after the
      // questionnaire: re-run the rules so newly indicated tests appear here.
      await refreshTier4Orders(session.user.id);
      await refreshTier1Orders(session.user.id);
      const result = await loadTestOrders(session.user.id);
      if (!result.ok) {
        setMessage(result.message ?? COPY.resultsLoadFailed);
        setOrders([]);
      } else {
        setOrders(result.orders);
        setMessage(null);
      }
    } catch {
      setMessage(COPY.resultsLoadFailed);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, loadTestOrders]);

  useEffect(() => {
    if (!session?.user.id) {
      return;
    }
    void refresh();
  }, [session?.user.id, refresh]);

  /**
   * One tab per sample word actually on the list. A tab that can never match
   * a row is worse than no tab, so the row is built from the data rather than
   * from the full vocabulary above.
   */
  const samples = useMemo(() => {
    const present = new Set(
      orders
        .map((order) => SAMPLE_WORD[order.test_name])
        .filter((word): word is string => Boolean(word)),
    );
    return SAMPLE_ORDER.filter((word) => present.has(word));
  }, [orders]);

  /** Filtering only hides rows; the store's tier-then-date order is kept. */
  const visible = useMemo(() => {
    if (!sample) {
      return orders;
    }
    return orders.filter((order) => SAMPLE_WORD[order.test_name] === sample);
  }, [orders, sample]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const hasList = !loading && !message && orders.length > 0;

  return (
    <Screen scroll contentPadding={spacing.screenX} centered={false}>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel={COPY.resultsBackHome}
          onPress={() => router.replace(routes.home)}
          // Pulled out to the gutter so the glyph, not its 44pt hit area,
          // lines up with the headline under it.
          style={styles.back}
        />
        <Text style={styles.eyebrow}>{EYEBROW}</Text>
      </View>

      <View accessibilityRole="header" style={styles.headline}>
        <TwoTone size={HEADLINE_SIZE} parts={HEADLINE} />
      </View>

      {hasList ? (
        <Text style={styles.lede}>{ledeFor(orders.length)}</Text>
      ) : null}

      {hasList && samples.length > 0 ? (
        /*
          Tabs are plain words — no pill, no underline, no box. Weight and
          colour carry the state; each word keeps a 44pt target of its own.
        */
        <View style={styles.tabs} accessibilityRole="tablist">
          <FilterTab
            label={`All ${orders.length}`}
            active={sample === ALL}
            onPress={() => setSample(ALL)}
          />
          {samples.map((word) => (
            <FilterTab
              key={word}
              label={word}
              active={sample === word}
              onPress={() => setSample(word)}
            />
          ))}
        </View>
      ) : null}

      {loading ? <StaticSkeleton rows={4} /> : null}

      {message ? (
        <>
          <Text style={styles.error}>{message}</Text>
          <TextButton title={COPY.resultsRetry} onPress={() => void refresh()} />
        </>
      ) : null}

      {!loading && !message && orders.length === 0 ? (
        <>
          <EmptyState
            heading={COPY.resultsEmptyHeading}
            explanation={COPY.resultsEmpty}
          />
          <PrimaryButton
            title={COPY.resultsOpenQuestionnaire}
            onPress={() => {
              router.replace(routes.questionnaire);
            }}
          />
        </>
      ) : null}

      {hasList ? (
        <>
          {/* One card, rows inside it — not a card per suggestion. */}
          <Surface
            padded={false}
            style={[
              styles.rows,
              samples.length > 0 ? styles.rowsUnderTabs : null,
            ]}
          >
            {visible.map((order, index) => {
              const term = getTerm(order.test_name);
              return (
                <ResultCard
                  key={order.id}
                  plainName={term.plainName}
                  meaning={
                    order.trigger_reason?.trim() || COPY.resultsStatusSuggested
                  }
                  status={statusForTier(order.test_tier)}
                  statusLabel={labelForTier(order.test_tier)}
                  divider={index < visible.length - 1}
                />
              );
            })}
          </Surface>

          <View style={styles.noteRow}>
            <Feather
              name="info"
              size={18}
              color={colors.inkMuted}
              style={styles.noteIcon}
            />
            <Text style={styles.note}>{CHECKLIST_NOTE}</Text>
          </View>

          {/*
            The board stops at the caveat above. This line stays because it
            is the only place the screen says Prescope does not *run* a test,
            which the caveat and the lede between them do not cover.
          */}
          <Text style={styles.noteBlock}>{COPY.resultsActionDiscuss}</Text>

          <PrimaryButton
            title={COPY.resultsOpenLabResults}
            onPress={() => {
              router.push(routes.labResults);
            }}
          />
          <TextButton
            title={COPY.homeOpenPlan}
            onPress={() => {
              router.push(routes.plan);
            }}
          />
          <TextButton
            title={COPY.homeOpenStore}
            onPress={() => {
              router.push(routes.store);
            }}
          />
        </>
      ) : null}
    </Screen>
  );
}

/** One plain word. The box around it is a target, not a shape. */
function FilterTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.tab}
    >
      <Text style={[styles.tabText, active ? styles.tabActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  back: {
    marginLeft: -12,
  },
  headline: {
    marginTop: 8,
  },
  eyebrow: {
    ...typography.micro,
    color: colors.inkMuted,
  },
  lede: {
    marginTop: 12,
    ...typography.body,
    color: colors.inkSoft,
  },
  tabs: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  tab: {
    minHeight: tapTarget,
    justifyContent: "center",
  },
  // An inactive tab is a 15px label, so it reads `inkMuted` (5.36:1) rather
  // than `inkFaint` (3.47:1) — inkFaint only clears its contrast at 24px and
  // up, where it is a headline colour.
  tabText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    color: colors.inkMuted,
  },
  tabActive: {
    fontFamily: fontFamily.bodySemi,
    color: colors.ink,
  },
  rows: {
    marginTop: 14,
    paddingHorizontal: 20,
    overflow: "hidden",
  },
  // The tab row carries 12pt of slack under its words to make a 44pt target,
  // so the card closes up by that much rather than sitting 14 below the slack.
  rowsUnderTabs: {
    marginTop: 2,
  },
  noteRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingHorizontal: 2,
  },
  noteIcon: {
    marginTop: 1,
  },
  note: {
    flex: 1,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  noteBlock: {
    marginTop: 16,
    paddingHorizontal: 2,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  error: {
    marginTop: 12,
    ...typography.label,
    color: CLAY,
  },
});
