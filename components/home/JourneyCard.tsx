import { StyleSheet, Text, View } from "react-native";
import { SpecimenIcon } from "@/components/specimen/SpecimenIcon";

import { Sheet } from "@/components/specimen/Sheet";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusChip } from "@/components/ui/StatusChip";
import { Accent, Edge, Ink, Measure, Paper, SpecimenType } from "@/lib/specimen-tokens";

export type JourneyNodeState = "complete" | "current" | "upcoming";

export type JourneyNode = {
  id: string;
  label: string;
  state: JourneyNodeState;
};

type JourneyCardProps = {
  title?: string;
  statusLabel?: string;
  nodes: JourneyNode[];
  currentDescription: string;
  onViewPress?: () => void;
};

/**
 * The main journey card on Home. Custom-drawn 5-node horizontal
 * progress line — no third-party stepper. Complete nodes are filled
 * sage with a check; the current node gets a double-ring; upcoming
 * nodes are hollow.
 */
export function JourneyCard({
  title = "Your journey",
  statusLabel = "On track",
  nodes,
  currentDescription,
  onViewPress,
}: JourneyCardProps) {
  return (
    <Sheet radius={Edge.mount}>
      <View style={styles.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
        </View>
        <StatusChip variant="orange" label={statusLabel} />
      </View>

      <View style={styles.row}>
        {nodes.map((node, idx) => (
          <View key={node.id} style={styles.nodeCol}>
            {idx > 0 ? (
              <View
                style={[
                  styles.connector,
                  nodes[idx - 1].state === "complete" ? styles.connectorDone : null,
                ]}
              />
            ) : (
              <View style={styles.connectorStub} />
            )}
            <Node state={node.state} />
            <Text
              style={[
                styles.nodeLabel,
                node.state === "current" ? styles.nodeLabelCurrent : null,
                node.state === "upcoming" ? styles.nodeLabelIdle : null,
              ]}
              numberOfLines={2}
            >
              {node.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.footRow}>
        <Text style={styles.desc}>{currentDescription}</Text>
        {onViewPress ? (
          <Text accessibilityRole="button" style={styles.view} onPress={onViewPress}>
            View →
          </Text>
        ) : null}
      </View>
    </Sheet>
  );
}

function Node({ state }: { state: JourneyNodeState }) {
  if (state === "complete") {
    return (
      <View style={styles.nodeWrap}>
        <View
          style={[
            styles.nodeDot,
            { width: 20, height: 20, borderRadius: 10, backgroundColor: Accent.sage },
          ]}
        >
          <SpecimenIcon name="check" size={11} color={Paper.sheet} />
        </View>
      </View>
    );
  }
  if (state === "current") {
    return (
      <View style={styles.nodeWrap}>
        <View style={styles.nodeRing}>
          <View style={styles.nodeCurrent} />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.nodeWrap}>
      <View style={styles.nodeIdle} />
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Measure.base,
  },
  title: {
    fontFamily: SpecimenType.semibold,
    fontSize: SpecimenType.sectionTitle,
    letterSpacing: -0.3,
    color: Ink.full,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 4,
  },
  nodeCol: {
    flex: 1,
    alignItems: "center",
  },
  nodeWrap: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeDot: {
    alignItems: "center",
    justifyContent: "center",
  },
  nodeRing: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Accent.tagWash,
    alignItems: "center",
    justifyContent: "center",
  },
  nodeCurrent: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Accent.tag,
    backgroundColor: Paper.mount,
  },
  nodeIdle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Ink.rule,
  },
  connector: {
    position: "absolute",
    top: 14,
    left: "-50%",
    width: "100%",
    height: 2,
    backgroundColor: Ink.rule,
  },
  connectorDone: {
    backgroundColor: Accent.tag,
  },
  connectorStub: {
    position: "absolute",
    top: 14,
    left: 0,
    width: 0,
    height: 2,
  },
  nodeLabel: {
    marginTop: 8,
    fontFamily: SpecimenType.medium,
    fontSize: SpecimenType.micro,
    color: Ink.full,
    textAlign: "center",
  },
  nodeLabelCurrent: {
    color: Accent.tag,
    fontFamily: SpecimenType.semibold,
  },
  nodeLabelIdle: {
    color: Ink.faint,
  },
  divider: {
    marginTop: Measure.base,
    marginBottom: Measure.snug,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Ink.rule,
  },
  footRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Measure.tight,
  },
  desc: {
    flex: 1,
    fontFamily: SpecimenType.regular,
    fontSize: 16,
    lineHeight: 24,
    color: Ink.soft,
  },
  view: {
    fontFamily: SpecimenType.semibold,
    fontSize: 16,
    color: Accent.tag,
    paddingLeft: 10,
  },
});

/* intentionally unused helper to avoid tree-shaking the SectionHeader import away */
void SectionHeader;
