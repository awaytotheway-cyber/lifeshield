import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { PressScale } from "@/components/ui/PressScale";
import { TextInput } from "@/components/ui/TextInput";
import { COPY } from "@/lib/copy";
import { Colors, Gap, Radius, Size, Space, typeStyle } from "@/lib/theme";
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
    <Card style={styles.card}>
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
                  <PressScale
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityLabel={item.title}
                    haptic="light"
                    onPress={() => setOpenId(open ? null : item.id)}
                    style={styles.itemHeader}
                  >
                    <View style={styles.itemHeaderText}>
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
                      color={Colors.orange}
                    />
                  </PressScale>

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
                          title="Stop trying this"
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
    </Card>
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
          <Chip
            key={value}
            label={label}
            selected={status === value}
            onPress={() => setStatus(value)}
          />
        ))}
      </View>

      <Text style={fbStyles.likelihoodLabel}>
        {COPY.barriersFeedbackContinue}
      </Text>
      <View style={fbStyles.row}>
        {[1, 2, 3, 4, 5].map((n) => (
          <PressScale
            key={n}
            accessibilityRole="button"
            accessibilityLabel={String(n)}
            accessibilityState={{ selected: likelihood === n }}
            haptic="light"
            onPress={() => setLikelihood(n)}
            style={[
              fbStyles.numChip,
              likelihood === n ? fbStyles.numChipSelected : null,
            ]}
          >
            <Text
              style={[
                fbStyles.numChipText,
                likelihood === n ? fbStyles.numChipTextSelected : null,
              ]}
            >
              {n}
            </Text>
          </PressScale>
        ))}
      </View>

      <View style={fbStyles.field}>
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

      <PrimaryButton
        title={COPY.barriersFeedbackSave}
        loading={busy}
        onPress={save}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: Gap.cards,
  },
  title: {
    ...typeStyle("section"),
    color: Colors.ink,
  },
  body: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  group: {
    marginTop: Space.lg,
  },
  groupTitle: {
    ...typeStyle("label"),
    marginBottom: Space.sm,
    color: Colors.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  item: {
    marginBottom: Space.sm,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: Radius.input,
    overflow: "hidden",
  },
  itemHeader: {
    minHeight: Size.tap,
    paddingVertical: Gap.rowY - 4,
    paddingHorizontal: Space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Space.sm,
    backgroundColor: Colors.cloud,
  },
  itemHeaderText: {
    flex: 1,
  },
  itemTitle: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  tryingBadge: {
    ...typeStyle("caption"),
    marginTop: 2,
    color: Colors.orange,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  itemBody: {
    padding: Space.md,
    backgroundColor: Colors.white,
  },
  strategy: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  subLabel: {
    ...typeStyle("caption"),
    marginTop: Space.md,
    color: Colors.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  subText: {
    ...typeStyle("secondary"),
    marginTop: Space.xs,
    color: Colors.body,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.md,
    color: Colors.red,
  },
});

const fbStyles = StyleSheet.create({
  wrap: {
    marginTop: Space.md,
    padding: Space.md,
    borderRadius: Radius.input,
    backgroundColor: Colors.greenTint,
  },
  title: {
    ...typeStyle("cardTitle"),
    color: Colors.ink,
  },
  body: {
    ...typeStyle("secondary"),
    marginTop: Space.xs,
    color: Colors.body,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Space.sm,
    marginTop: Space.sm,
  },
  numChip: {
    minWidth: Size.tap,
    minHeight: Size.tap,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.chip,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  numChipSelected: {
    backgroundColor: Colors.orange,
    borderColor: Colors.orange,
  },
  numChipText: {
    ...typeStyle("label"),
    color: Colors.body,
  },
  numChipTextSelected: {
    color: Colors.white,
  },
  likelihoodLabel: {
    ...typeStyle("caption"),
    marginTop: Space.md,
    color: Colors.muted,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  field: {
    marginTop: Space.sm,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.sm,
    color: Colors.red,
  },
});
