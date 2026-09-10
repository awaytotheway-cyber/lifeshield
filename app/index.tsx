import { Redirect } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
import { fontFamily, typography } from "@/lib/typography";
import { useJourney } from "@/lib/use-journey";

const SPLASH_HOLD_MS = 1800;

/**
 * Short branded splash, then send the user to the right place.
 * Locked users go to Pathway B, not Home.
 */
export default function SplashScreen() {
  const { loading, href } = useJourney();
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [opacity, reduceMotion]);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimeDone(true), SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!minTimeDone) {
    return (
      <Animated.View style={[styles.wrap, { opacity }]}>
        <Text style={styles.brand}>{COPY.appName}</Text>
        <Text style={styles.tagline}>{COPY.splashSubtitle}</Text>
      </Animated.View>
    );
  }

  if (loading) {
    return <GateLoading />;
  }

  return <Redirect href={href} />;
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream,
    paddingHorizontal: 20,
  },
  brand: {
    ...typography.display,
    color: colors.deepTeal,
    textAlign: "center",
  },
  tagline: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
    textAlign: "center",
  },
});
