import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useReducedMotion } from "react-native-reanimated";

import { GateLoading } from "@/components/journey/PostAuthRedirect";
import { COPY } from "@/lib/copy";
import { Colors, Gradients, Motion, Space, typeStyle } from "@/lib/theme";
import { useJourney } from "@/lib/use-journey";

const SPLASH_HOLD_MS = 1800;

/**
 * Short branded splash, then send the user to the right place.
 * Locked users go to Pathway B, not Home.
 */
export default function SplashScreen() {
  const { loading, href } = useJourney();
  const reduceMotion = useReducedMotion();
  // Lazy initialiser keeps the same Animated.Value across renders.
  const [opacity] = useState(() => new Animated.Value(reduceMotion ? 1 : 0));
  const [minTimeDone, setMinTimeDone] = useState(false);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    Animated.timing(opacity, {
      toValue: 1,
      duration: Motion.screen + 100,
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
      <LinearGradient
        colors={[...Gradients.heroWarm]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.wrap}
      >
        <Animated.View style={[styles.panel, { opacity }]}>
          <View style={styles.rule} />
          <Text style={styles.brand}>{COPY.appName}</Text>
          <Text style={styles.tagline}>{COPY.splashSubtitle}</Text>
        </Animated.View>
      </LinearGradient>
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
    backgroundColor: Colors.background,
    paddingHorizontal: Space.screenH,
  },
  panel: {
    alignItems: "center",
  },
  rule: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.orange,
    marginBottom: Space.xl,
  },
  brand: {
    ...typeStyle("hero"),
    color: Colors.ink,
    textAlign: "center",
  },
  tagline: {
    ...typeStyle("body"),
    marginTop: Space.md,
    color: Colors.body,
    textAlign: "center",
  },
});
