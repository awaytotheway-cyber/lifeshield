import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import { colors, radius, shadows, spacing } from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";
import {
  BARRIER_TYPE_ORDER,
  barrierTypeLabel,
  deleteUserBarrier,
  isFeedbackDue,
  loadBarriersForCategory,
  loadUserBarriersFor,
  mergeBarriers,
  submitBarrierFeedback,
  tryBarrier,
  type BarrierCategory,
  type BarrierType,
  type BarrierWithStrategy,
  type UserBarrierSourceType,
  type UserBarrierStatus,
} from "@/lib/barriers";

type Props = {
  userId: string;
  category: BarrierCategory | null;
  sourceType: UserBarrierSourceType;
  sourceId: string | null;
};

/**
 * Barriers list grouped by type. Each item expands to reveal its strategy,
 * tip, evidence note and a "Try it" button. A week after "Try it" a small
 * feedback card appears inline.
 *
 * Silently renders nothing if the backend migration hasn't run.
 */
export function BarriersAccordion({ userId, category, sourceType, sourceId }: Props) {
  const [rows, setRows] = useState<BarrierWithStrategy[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  const load = useCallback(async () => {
    const [library, tried] = await Promise.all([
      loadBarriersForCategory(category),
      loadUserBarriersFor(userId, sourceType, sourceId),
    ]);
    if (!library.ok) {
      if (library.message === COPY.barriersNeedSql) setHidden(true);
      setError(library.message);
      setRows([]);
      return;
    }
    if (!tried.ok) {
      // Still show the library — feedback loop just won't work.
      setError(tried.message);
      setRows(mergeBarriers(library.rows, []));
      return;
    }
    setError(null);
    setRows(mergeBarriers(library.rows, tried.rows));
  }, [userId, category, sourceType, sourceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map<BarrierType, BarrierWithStrategy[]>();
    for (const t of BARRIER_TYPE_ORDER) map.set(t, []);
    for (const r of rows ?? []) map.get(r.barrier_type)?.push(r);
    return map;
  }, [rows]);

  if (hidden) return null;
  if (rows === null) return null;

  const startTry = async (barrierId: string) => {
    setBusyId(barrierId);
    const res = await tryBarrier({ userId, barrierId, sourceType, sourceId });
    setBusyId(null);
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load();
  };

  const stopTrying = async (userBarrierId: string) => {
    setBusyId(userBarrierId);
    const res = await deleteUserBarrier(userBarrierId);
    setBusyId(null);
    if (!res.ok) setError(res.message);
    await load();
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{COPY.barriersSectionTitle}</Text>
      <Text style={styles.body}>{COPY.barriersSectionBody}</Text>

      {BARRIER_TYPE_ORDER.map((type) => {
        const items = grouped.get(type) ?? [];
        if (items.length === 0) return null;
        return (
          <View key={type} style={styles.group}>
            <Text style={styles.groupTitle}>{barrierTypeLabel(type)}</Text>
            {items.map((item) => {
              const open = openId === item.id;
              const trying = item.user_state?.status === "trying";
              const dueFeedback = item.user_state
                ? isFeedbackDue(item.user_state)
                : false;
              return (
                <View key={item.id} style={styles.item}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setOpenId(open ? null : item.id)}
                    style={styles.itemHeader}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      {trying ? (
                        <Text style={styles.tryingBadge}>
                          {COPY.barriersTryingLabel}
                        </Text>
                      ) : null}
                    </View>
                    <Feather
                      name={open ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={colors.primaryBlue}
                    />
                  </Pressable>

                  {open ? (
                    <View style={styles.itemBody}>
                      <Text style={styles.strategy}>{item.strategy}</Text>
                      {item.tip ? (
                        <>
                          <Text style={styles.subLabel}>{COPY.barriersTip}</Text>
                          <Text style={styles.subText}>{item.tip}</Text>
                        </>
                      ) : null}
                      {item.evidence_note ? (
                        <>
                          <Text style={styles.subLabel}>
                            {COPY.barriersEvidence}
                          </Text>
                          <Text style={styles.subText}>{item.evidence_note}</Text>
                        </>
                      ) : null}

                      {!trying ? (
                        <PrimaryButton
                          title={COPY.barriersTry}
                          loading={busyId === item.id}
                          onPress={() => startTry(item.id)}
                        />
                      ) : (
                        <TextButton
                          title={COPY.barriersStopTrying}
                          onPress={() =>
                            item.user_state
                              ? stopTrying(item.user_state.id)
                              : undefined
                          }
                          loading={busyId === (item.user_state?.id ?? "")}
                        />
                      )}

                      {trying && dueFeedback && item.user_state ? (
                        <FeedbackPrompt
                          userBarrierId={item.user_state.id}
                          onSaved={() => void load()}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function FeedbackPrompt({
  userBarrierId,
  onSaved,
}: {
  userBarrierId: string;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<UserBarrierStatus | null>(null);
  const [likelihood, setLikelihood] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    if (!status) {
      setMessage("Pick an option first.");
      return;
    }
    setBusy(true);
    const res = await submitBarrierFeedback(userBarrierId, {
      status,
      continue_likelihood: likelihood,
      feedback_note: note,
    });
    setBusy(false);
    if (!res.ok) {
      setMessage(res.message);
      return;
    }
    onSaved();
  };

  return (
    <View style={fbStyles.wrap}>
      <Text style={fbStyles.title}>{COPY.barriersFeedbackPromptTitle}</Text>
      <Text style={fbStyles.body}>{COPY.barriersFeedbackPromptBody}</Text>

      <View style={fbStyles.row}>
        {(
          [
            ["helpful", COPY.barriersFeedbackHelpful],
            ["not_helpful", COPY.barriersFeedbackNotHelpful],
            ["abandoned", COPY.barriersFeedbackAbandoned],
          ] as [UserBarrierStatus, string][]
        ).map(([value, label]) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: status === value }}
            onPress={() => setStatus(value)}
            style={[
              fbStyles.chip,
              status === value && fbStyles.chipSelected,
            ]}
          >
            <Text
              style={[
                fbStyles.chipText,
                status === value && fbStyles.chipTextSelected,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={fbStyles.likelihoodLabel}>
        {COPY.barriersFeedbackContinue}
      </Text>
      <View style={fbStyles.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityState={{ selected: likelihood === n }}
            onPress={() => setLikelihood(n)}
            style={[
              fbStyles.numChip,
              likelihood === n && fbStyles.chipSelected,
            ]}
          >
            <Text
              style={[
                fbStyles.chipText,
                likelihood === n && fbStyles.chipTextSelected,
              ]}
            >
              {n}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ marginTop: spacing.sm }}>
        <TextInput
          label={COPY.barriersFeedbackNoteLabel}
          placeholder={COPY.barriersFeedbackNotePlaceholder}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={2}
        />
      </View>

      {message ? <Text style={fbStyles.error}>{message}</Text> : null}

      <View style={{ marginTop: spacing.sm }}>
        <PrimaryButton
          title={COPY.barriersFeedbackSave}
          loading={busy}
          onPress={save}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: spacing.base,
    ...shadows.card,
  },
  title: {
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    lineHeight: 24,
    color: colors.charcoal,
  },
  body: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.slate,
  },
  group: {
    marginTop: spacing.base,
  },
  groupTitle: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.slate,
    marginBottom: spacing.sm,
  },
  item: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.alert,
    overflow: "hidden",
  },
  itemHeader: {
    paddingVertical: 12,
    paddingHorizontal: spacing.base,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.iceBlue,
  },
  itemTitle: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  tryingBadge: {
    marginTop: 2,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 11,
    letterSpacing: 0.2,
    color: colors.primaryBlue,
  },
  itemBody: {
    padding: spacing.base,
    backgroundColor: colors.white,
    gap: spacing.sm,
  },
  strategy: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.charcoal,
  },
  subLabel: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.slate,
    letterSpacing: 0.2,
  },
  subText: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
  error: {
    marginTop: spacing.base,
    fontFamily: fontFamily.body,
    color: colors.riskHighText,
  },
});

const fbStyles = StyleSheet.create({
  wrap: {
    marginTop: spacing.base,
    padding: spacing.base,
    borderRadius: radius.alert,
    backgroundColor: colors.riskLowLight,
    gap: spacing.sm,
  },
  title: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.charcoal,
  },
  body: {
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.slate,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.chip,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numChip: {
    minWidth: 40,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: radius.chip,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primaryBlue,
    borderColor: colors.primaryBlue,
  },
  chipText: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 13,
    color: colors.charcoal,
  },
  chipTextSelected: {
    color: colors.white,
  },
  likelihoodLabel: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.slate,
    letterSpacing: 0.2,
  },
  error: {
    marginTop: spacing.sm,
    fontFamily: fontFamily.body,
    color: colors.riskHighText,
  },
});
