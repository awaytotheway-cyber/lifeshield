import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Accent, Edge, Ink, Measure, Paper, Rule, SpecimenType, TRACK } from "@/lib/specimen-tokens";


/* ------------------------------------------------------------------ *
 * SectionRule — a tracked-out label sitting on a hairline.
 * This is the workhorse of the system; it replaces card headers.
 * ------------------------------------------------------------------ */

export function SectionRule({
  label,
  right,
  weight = "hair",
}: {
  label: string;
  right?: ReactNode;
  weight?: "hair" | "heavy";
}) {
  return (
    <View style={styles.sectionRuleWrap}>
      <View style={styles.sectionRuleRow}>
        <Text style={styles.sectionRuleLabel}>{label.toUpperCase()}</Text>
        <View
          style={[
            styles.sectionRuleLine,
            {
              height: weight === "heavy" ? Rule.medium : Rule.hair,
              backgroundColor:
                weight === "heavy" ? Ink.ruleStrong : Ink.rule,
            },
          ]}
        />
        {right ?? null}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * Hairline — a plain rule. Structure without shadow.
 * ------------------------------------------------------------------ */

export function Hairline({
  inset = 0,
  strong = false,
  style,
}: {
  inset?: number;
  strong?: boolean;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          height: strong ? Rule.medium : Rule.hair,
          backgroundColor: strong ? Ink.ruleStrong : Ink.rule,
          marginLeft: inset,
        },
        style,
      ]}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Mount — a mounted sheet. Paper with a hairline border, near-square.
 * A mounted sheet. No shadow, ever.
 * ------------------------------------------------------------------ */

export function Mount({
  children,
  padding = Measure.base,
  tone = "mount",
  style,
}: {
  children: ReactNode;
  padding?: number;
  tone?: "mount" | "sheet" | "tag" | "sage" | "ochre";
  style?: ViewStyle;
}) {
  const fill =
    tone === "mount"
      ? Paper.mount
      : tone === "sheet"
        ? Paper.sheetDeep
        : tone === "tag"
          ? Accent.tagWash
          : tone === "sage"
            ? Accent.sageWash
            : Accent.ochreWash;

  const border =
    tone === "tag"
      ? Accent.tagEdge
      : tone === "sage"
        ? Accent.sageEdge
        : tone === "ochre"
          ? Accent.ochreEdge
          : Ink.rule;

  return (
    <View
      style={[
        {
          backgroundColor: fill,
          borderWidth: Rule.hair,
          borderColor: border,
          borderRadius: Edge.mount,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * FieldLabel / Reading — the specimen-label pair.
 * Label is tracked small-caps; the reading is always mono.
 * ------------------------------------------------------------------ */

export function FieldLabel({ children }: { children: string }) {
  return <Text style={styles.fieldLabel}>{children.toUpperCase()}</Text>;
}

export function Reading({
  value,
  unit,
  size = "reading",
  color = Ink.full,
}: {
  value: string | number;
  unit?: string;
  size?: "readingLarge" | "reading" | "readingSmall";
  color?: string;
}) {
  return (
    <View style={styles.readingRow}>
      <Text
        style={[
          styles.reading,
          {
            fontSize: SpecimenType[size],
            lineHeight: SpecimenType[size] * 1.12,
            color,
            fontFamily:
              size === "readingLarge"
                ? SpecimenType.monoBold
                : SpecimenType.mono,
          },
        ]}
      >
        {String(value)}
      </Text>
      {unit ? <Text style={styles.readingUnit}>{unit}</Text> : null}
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * CatalogueNo — the small reference in a corner. Pure texture, but it
 * is what makes a page feel catalogued rather than generated.
 * ------------------------------------------------------------------ */

export function CatalogueNo({ children }: { children: string }) {
  return <Text style={styles.catalogue}>{children}</Text>;
}

/* ------------------------------------------------------------------ *
 * StatusTag — a tied paper tag, not a pill.
 * ------------------------------------------------------------------ */

export function StatusTag({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "sage" | "ochre" | "tag";
}) {
  const fg =
    tone === "sage"
      ? Accent.sage
      : tone === "ochre"
        ? Accent.ochre
        : tone === "tag"
          ? Accent.tag
          : Ink.soft;
  const bg =
    tone === "sage"
      ? Accent.sageWash
      : tone === "ochre"
        ? Accent.ochreWash
        : tone === "tag"
          ? Accent.tagWash
          : Paper.sheetDeep;

  return (
    <View style={[styles.statusTag, { backgroundColor: bg, borderColor: fg }]}>
      <View style={[styles.statusPunch, { borderColor: fg }]} />
      <Text style={[styles.statusTagText, { color: fg }]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ *
 * PlateTitle / SpecimenName — the serif voice.
 * ------------------------------------------------------------------ */

export function PlateTitle({ children }: { children: string }) {
  return <Text style={styles.plateTitle}>{children}</Text>;
}

export function SpecimenName({ children }: { children: string }) {
  return <Text style={styles.specimenName}>{children}</Text>;
}

export function Body({ children }: { children: ReactNode }) {
  return <Text style={styles.body}>{children}</Text>;
}

export function Annotation({ children }: { children: ReactNode }) {
  return <Text style={styles.annotation}>{children}</Text>;
}

const styles = StyleSheet.create({
  sectionRuleWrap: {
    marginTop: Measure.section,
    marginBottom: Measure.base,
  },
  sectionRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Measure.snug,
  },
  sectionRuleLabel: {
    fontFamily: SpecimenType.sansMedium,
    fontSize: SpecimenType.sectionRule,
    letterSpacing: TRACK.label,
    color: Ink.soft,
  },
  sectionRuleLine: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: SpecimenType.sansMedium,
    fontSize: SpecimenType.annotation,
    letterSpacing: TRACK.label,
    color: Ink.faint,
  },
  readingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 5,
  },
  reading: {
    letterSpacing: -0.2,
  },
  readingUnit: {
    fontFamily: SpecimenType.sans,
    fontSize: SpecimenType.annotation,
    color: Ink.faint,
  },
  catalogue: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.catalogue,
    color: Ink.ghost,
  },
  statusTag: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 7,
    paddingRight: 10,
    paddingVertical: 4,
    borderWidth: Rule.hair,
    borderRadius: Edge.tag,
  },
  statusPunch: {
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: Rule.hair,
  },
  statusTagText: {
    fontFamily: SpecimenType.sansMedium,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.label,
  },
  plateTitle: {
    fontFamily: SpecimenType.serif,
    fontSize: SpecimenType.plateTitle,
    lineHeight: SpecimenType.plateTitle * 1.12,
    letterSpacing: TRACK.title,
    color: Ink.full,
  },
  specimenName: {
    fontFamily: SpecimenType.serif,
    fontSize: SpecimenType.specimenName,
    lineHeight: SpecimenType.specimenName * 1.18,
    letterSpacing: TRACK.title,
    color: Ink.full,
  },
  body: {
    fontFamily: SpecimenType.sans,
    fontSize: SpecimenType.body,
    lineHeight: SpecimenType.body * 1.65,
    color: Ink.soft,
  },
  annotation: {
    fontFamily: SpecimenType.sans,
    fontSize: SpecimenType.annotation,
    lineHeight: SpecimenType.annotation * 1.5,
    color: Ink.faint,
  },
});
