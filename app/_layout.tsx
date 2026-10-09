// Must be the first import so NativeWind styles load before anything renders.
import "../global.css";

// SwimClub-style clinical-dossier system: Space Grotesk (workhorse),
// JetBrains Mono (uppercase micro-copy), VT323 (LCD/pixel display).
// Manrope/Inter/DM Mono still load so any screen holding an old fontFamily
// literal keeps rendering during the conversion.
import { DMMono_400Regular } from "@expo-google-fonts/dm-mono";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import { JetBrainsMono_400Regular } from "@expo-google-fonts/jetbrains-mono";
import {
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from "@expo-google-fonts/manrope";
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from "@expo-google-fonts/space-grotesk";
import { VT323_400Regular } from "@expo-google-fonts/vt323";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  ErrorBoundary,
  ExpoRouterErrorBoundary,
} from "@/components/ErrorBoundary";
import { NotificationBootstrap } from "@/components/NotificationBootstrap";
import { StripeRoot } from "@/components/StripeRoot";
import { COPY } from "@/lib/copy";
import { colors } from "@/lib/design-tokens";
import { SessionProvider } from "@/lib/session";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

export { ExpoRouterErrorBoundary as ErrorBoundary };

function BrandSplash({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.iceBlue,
      }}
    >
      <ActivityIndicator color={colors.primaryBlue} />
      <Text
        style={{
          marginTop: 16,
          color: colors.charcoal,
          fontFamily: fontFamily.body,
          fontSize: 15,
        }}
      >
        {message}
      </Text>
    </View>
  );
}

function AuthGate() {
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return <BrandSplash message={COPY.loadingApp} />;
  }

  return (
    <>
      <NotificationBootstrap />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(main)" />
        <Stack.Screen
          name="pathway-b"
          options={{
            gestureEnabled: false,
            animation: "none",
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    JetBrainsMono_400Regular,
    VT323_400Regular,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    DMMono_400Regular,
  });

  // If a font file fails, keep going with system fonts rather than a blank screen.
  const fontsReady = fontsLoaded || Boolean(fontError);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        {!fontsReady ? (
          <BrandSplash message={COPY.loadingApp} />
        ) : (
          <StripeRoot>
            <SessionProvider>
              <StatusBar style="dark" />
              <AuthGate />
            </SessionProvider>
          </StripeRoot>
        )}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
