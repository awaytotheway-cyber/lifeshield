import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Colors, Font, Space, typeStyle } from "@/lib/theme";

export type JourneyStepState = "complete" | "current" | "upcoming";

export type JourneyStepItem = {
  id: string;
  title: string;
  state: JourneyStepState;
};

type JourneyProgressCardProps = {
  steps: JourneyStepItem[];
  onContinue?: () => void;
};

/**
 * Vertical journey timeline inside a white card.
 *
 * PLAIN ENGLISH: a rail of dots down the left with one step per row. The step
 * you are on is a bigger orange dot with a tinted ring, finished steps are a
 * calm green, and steps still to come are a quiet warm line colour. There is no
 * looping animation — Section 9 of the brief asks for stillness.
 */
export function JourneyProgressCard({
  steps,
  onContinue,
}: JourneyProgressCardProps) {
  return (
    <Card>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        const current = step.state === "current";

        return (
          <View key={step.id} style={styles.row}>
            <View style={styles.rail}>
              <View
                style={[
                  styles.dot,
                  step.state === "complete" ? styles.dotComplete : null,
                  current ? styles.dotCurrent : null,
                  step.state === "upcoming" ? styles.dotUpcoming : null,
                ]}
              />
              {isLast ? null : <View style={styles.line} />}
            </View>
            <View style={[styles.body, isLast ? styles.bodyLast : null]}>
              <Text
                style={[
                  styles.title,
                  current ? styles.titleCurrent : null,
                  step.state === "upcoming" ? styles.titleUpcoming : null,
                ]}
              >
                {step.title}
              </Text>
              {current && onContinue ? (
                <View style={styles.continue}>
                  <Chip label="Continue" tone="orange" onPress={onContinue} />
                </View>
              ) : null}
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
  },
  rail: {
    width: Space.lg,
    alignItems: "center",
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    // Centres the dot against the first line of the title.
    marginTop: 8,
  },
  dotComplete: {
    backgroundColor: Colors.green,
  },
  dotCurrent: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginTop: 6,
    backgroundColor: Colors.orange,
    borderWidth: 3,
    borderColor: Colors.orangeTintDeep,
  },
  dotUpcoming: {
    backgroundColor: Colors.line,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: Colors.line,
    marginVertical: Space.xs,
  },
  body: {
    flex: 1,
    paddingLeft: Space.sm,
    paddingBottom: Space.lg,
  },
  bodyLast: {
    paddingBottom: 0,
  },
  title: {
    ...typeStyle("body"),
    color: Colors.body,
  },
  titleCurrent: {
    fontFamily: Font.semibold,
    color: Colors.ink,
  },
  titleUpcoming: {
    color: Colors.muted,
  },
  continue: {
    marginTop: Space.sm,
  },
});
