// Must be the first import so NativeWind styles load before anything renders.
import "../global.css";

import {
  SchibstedGrotesk_400Regular,
  SchibstedGrotesk_500Medium,
  SchibstedGrotesk_600SemiBold,
  SchibstedGrotesk_700Bold,
} from "@expo-google-fonts/schibsted-grotesk";
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
import { ContentProvider } from "@/lib/content-context";
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
        backgroundColor: colors.mossTint,
      }}
    >
      <ActivityIndicator color={colors.mossDeep} />
      <Text
        style={{
          marginTop: 16,
          color: colors.ink,
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
        <Stack.Screen
          name="escalation"
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
    // Moss uses one face in four weights; nothing else is loaded.
    SchibstedGrotesk_400Regular,
    SchibstedGrotesk_500Medium,
    SchibstedGrotesk_600SemiBold,
    SchibstedGrotesk_700Bold,
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
              <ContentProvider>
                <StatusBar style="dark" />
                <AuthGate />
              </ContentProvider>
            </SessionProvider>
          </StripeRoot>
        )}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
