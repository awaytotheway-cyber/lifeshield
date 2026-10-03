import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusChip } from "@/components/ui/StatusChip";
import { Colors, Radii, Spacing, Typography } from "@/lib/design-tokens";

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
 * progress line — no third-party stepper. Complete nodes get the brand
 * gradient + checkmark; current node gets a double-ring; upcoming nodes
 * are hollow dots.
 */
export function JourneyCard({
  title = "Your journey",
  statusLabel = "On track",
  nodes,
  currentDescription,
  onViewPress,
}: JourneyCardProps) {
  return (
    <GlassCard variant="onWhite" radius={Radii.cardLarge}>
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
    </GlassCard>
  );
}

function Node({ state }: { state: JourneyNodeState }) {
  if (state === "complete") {
    return (
      <View style={styles.nodeWrap}>
        <LinearGradient
          colors={[Colors.orangeDark, Colors.orangeBright]}
          style={[styles.nodeDot, { width: 20, height: 20, borderRadius: 10 }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Feather name="check" size={12} color={Colors.pureWhite} />
        </LinearGradient>
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
    marginBottom: Spacing.base,
  },
  title: {
    fontFamily: Typography.semibold,
    fontSize: Typography.sectionTitle,
    letterSpacing: -0.3,
    color: Colors.charcoal,
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
    backgroundColor: "rgba(200,75,17,0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  nodeCurrent: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.orangeDark,
    backgroundColor: Colors.pureWhite,
  },
  nodeIdle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.borderLight,
  },
  connector: {
    position: "absolute",
    top: 14,
    left: "-50%",
    width: "100%",
    height: 2,
    backgroundColor: Colors.borderLight,
  },
  connectorDone: {
    backgroundColor: Colors.orangeDark,
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
    fontFamily: Typography.medium,
    fontSize: Typography.micro,
    color: Colors.charcoal,
    textAlign: "center",
  },
  nodeLabelCurrent: {
    color: Colors.orangeDark,
    fontFamily: Typography.semibold,
  },
  nodeLabelIdle: {
    color: Colors.mutedText,
  },
  divider: {
    marginTop: Spacing.base,
    marginBottom: Spacing.md,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.borderLight,
  },
  footRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  desc: {
    flex: 1,
    fontFamily: Typography.regular,
    fontSize: 14,
    lineHeight: 22,
    color: Colors.bodyText,
  },
  view: {
    fontFamily: Typography.semibold,
    fontSize: 14,
    color: Colors.orangeDark,
    paddingLeft: 10,
  },
});

/* intentionally unused helper to avoid tree-shaking the SectionHeader import away */
void SectionHeader;
