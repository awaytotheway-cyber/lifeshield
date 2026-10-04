import { Redirect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Masthead } from "@/components/specimen/Masthead";
import { Plate } from "@/components/specimen/Plate";
import {
  Annotation,
  Body,
  CatalogueNo,
  FieldLabel,
  Hairline,
  Mount,
  Reading,
  SectionRule,
  SpecimenName,
  StatusTag,
} from "@/components/specimen/Primitives";
import {
  SpecimenIcon,
  type SpecimenIconName,
} from "@/components/specimen/SpecimenIcon";
import {
  Accent,
  Ink,
  Measure,
  Paper,
  Rule,
  SpecimenType,
  TRACK,
} from "@/lib/specimen-tokens";
import { routes } from "@/lib/routes";
import { useAuthStore } from "@/stores/auth-store";

/**
 * SPECIMEN — reference implementation of the design language on Home.
 *
 * Lives alongside the existing home.tsx rather than replacing it, so the
 * direction can be reviewed on a device against the current build before
 * anything is torn out.
 */
export default function SpecimenHomeScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  const name =
    (session.user.email ?? "").split("@")[0]?.replace(/^./, (c) =>
      c.toUpperCase(),
    ) || "Subject";

  const accession = `PS-${String(
    Math.abs(hash(session.user.id)) % 100000,
  ).padStart(5, "0")}`;

  return (
    <View style={styles.page}>
      <Masthead
        eyebrow="Personal herbarium"
        title="Your record"
        reference={`ACC. ${accession}`}
        right={<StatusTag label="In progress" tone="ochre" />}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── The register: three readings on one ruled row ───────── */}
        <View style={styles.register}>
          <RegisterCell label="Assessment" value="7" unit="/ 10" />
          <View style={styles.registerDivider} />
          <RegisterCell label="Consents" value="3" unit="/ 3" tone={Accent.sage} />
          <View style={styles.registerDivider} />
          <RegisterCell label="Readings" value="12" unit="filed" />
        </View>
        <Hairline strong />

        {/* ── Collector line — small, human, typeset ──────────────── */}
        <View style={styles.collectorRow}>
          <View>
            <FieldLabel>Collected by</FieldLabel>
            <Text style={styles.collector}>{name}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <FieldLabel>Filed</FieldLabel>
            <Reading value={today()} size="readingSmall" color={Ink.soft} />
          </View>
        </View>

        {/* ── Current determination ───────────────────────────────── */}
        <SectionRule label="Current determination" weight="heavy" />
        <Mount padding={Measure.base}>
          <View style={styles.detRow}>
            <SpecimenIcon name="seedling" size={30} color={Accent.sage} />
            <View style={{ flex: 1 }}>
              <SpecimenName>Baseline assessment</SpecimenName>
              <Body>
                Three sections remain. Each one sharpens what we can
                responsibly suggest — nothing here is a diagnosis.
              </Body>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: "70%" }]} />
          </View>
          <View style={styles.progressMeta}>
            <Annotation>Sections 1–7 complete</Annotation>
            <CatalogueNo>70%</CatalogueNo>
          </View>

          <Hairline style={{ marginVertical: Measure.base }} />

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(routes.questionnaire)}
            style={({ pressed }) => [
              styles.inkButton,
              pressed ? { opacity: 0.82 } : null,
            ]}
          >
            <Text style={styles.inkButtonText}>CONTINUE ASSESSMENT</Text>
            <SpecimenIcon name="chevronRight" size={15} color={Paper.sheet} />
          </Pressable>
        </Mount>

        {/* ── The archival plate ──────────────────────────────────── */}
        <SectionRule label="Plate" />
        <Plate plate="herbariumFerns" figure="Pl. 01" height={200} />

        {/* ── Index of the record ─────────────────────────────────── */}
        <SectionRule label="Index" weight="heavy" />
        <View style={styles.index}>
          <IndexRow
            icon="vial"
            n="01"
            title="Readings"
            meta="12 filed · 2 flagged"
            onPress={() => router.push(routes.labResults)}
          />
          <IndexRow
            icon="slip"
            n="02"
            title="Plan"
            meta="4 determinations"
            onPress={() => router.push(routes.plan)}
          />
          <IndexRow
            icon="seedling"
            n="03"
            title="Goals"
            meta="2 active this week"
            onPress={() => router.push(routes.goals)}
          />
          <IndexRow
            icon="mortar"
            n="04"
            title="Recipes"
            meta="10 in the library"
            onPress={() => router.push(routes.recipes)}
          />
          <IndexRow
            icon="pair"
            n="05"
            title="Buddies"
            meta="Opt-in · not discoverable"
            onPress={() => router.push(routes.buddies)}
            last
          />
        </View>

        <View style={styles.colophon}>
          <Hairline />
          <Text style={styles.colophonText}>
            PRESCOPE · A LIFESTYLE AWARENESS TOOL. NOT A DIAGNOSTIC OR
            MEDICAL APP.
          </Text>
          <CatalogueNo>{`SET IN DM SERIF DISPLAY, INTER & JETBRAINS MONO`}</CatalogueNo>
        </View>
      </ScrollView>
    </View>
  );
}

/* ---------------------------------------------------------------- */

function RegisterCell({
  label,
  value,
  unit,
  tone = Ink.full,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: string;
}) {
  return (
    <View style={styles.registerCell}>
      <FieldLabel>{label}</FieldLabel>
      <View style={{ marginTop: 5 }}>
        <Reading value={value} unit={unit} size="readingLarge" color={tone} />
      </View>
    </View>
  );
}

function IndexRow({
  icon,
  n,
  title,
  meta,
  onPress,
  last = false,
}: {
  icon: SpecimenIconName;
  n: string;
  title: string;
  meta: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.indexRow,
        !last ? styles.indexRowRule : null,
        pressed ? { backgroundColor: Paper.sheetDeep } : null,
      ]}
    >
      <Text style={styles.indexNo}>{n}</Text>
      <SpecimenIcon name={icon} size={22} color={Ink.full} />
      <View style={{ flex: 1 }}>
        <Text style={styles.indexTitle}>{title}</Text>
        <Annotation>{meta}</Annotation>
      </View>
      <SpecimenIcon name="chevronRight" size={16} color={Ink.ghost} />
    </Pressable>
  );
}

function today(): string {
  const d = new Date();
  const m = d.toLocaleString("en", { month: "short" }).toUpperCase();
  return `${String(d.getDate()).padStart(2, "0")} ${m} ${d.getFullYear()}`;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return h;
}

/* ---------------------------------------------------------------- */

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Paper.sheet,
  },
  scroll: {
    paddingHorizontal: Measure.gutter,
    paddingBottom: Measure.plate,
  },

  register: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: Measure.base,
  },
  registerCell: {
    flex: 1,
  },
  registerDivider: {
    width: Rule.hair,
    alignSelf: "stretch",
    backgroundColor: Ink.rule,
    marginHorizontal: Measure.snug,
  },

  collectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: Measure.snug,
  },
  collector: {
    marginTop: 3,
    fontFamily: SpecimenType.serif,
    fontSize: 19,
    color: Ink.full,
  },

  detRow: {
    flexDirection: "row",
    gap: Measure.snug,
    alignItems: "flex-start",
  },

  progressTrack: {
    marginTop: Measure.base,
    height: 6,
    backgroundColor: Paper.sheetDeep,
    borderWidth: Rule.hair,
    borderColor: Ink.rule,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Accent.sage,
  },
  progressMeta: {
    marginTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  inkButton: {
    height: 52,
    backgroundColor: Ink.full,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  inkButtonText: {
    fontFamily: SpecimenType.sansMedium,
    fontSize: SpecimenType.label,
    letterSpacing: TRACK.label,
    color: Paper.sheet,
  },

  index: {
    borderTopWidth: Rule.hair,
    borderBottomWidth: Rule.hair,
    borderColor: Ink.rule,
  },
  indexRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Measure.snug,
    paddingVertical: Measure.base,
  },
  indexRowRule: {
    borderBottomWidth: Rule.hair,
    borderBottomColor: Ink.rule,
  },
  indexNo: {
    fontFamily: SpecimenType.mono,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.catalogue,
    color: Ink.ghost,
    width: 18,
  },
  indexTitle: {
    fontFamily: SpecimenType.serif,
    fontSize: 19,
    color: Ink.full,
  },

  colophon: {
    marginTop: Measure.plate,
    gap: Measure.tight,
  },
  colophonText: {
    marginTop: Measure.snug,
    fontFamily: SpecimenType.sansMedium,
    fontSize: SpecimenType.catalogue,
    letterSpacing: TRACK.label,
    lineHeight: 16,
    color: Ink.faint,
  },
});
