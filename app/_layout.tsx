// Must be the first import so NativeWind styles load before anything renders.
import "../global.css";

import { DMMono_400Regular } from "@expo-google-fonts/dm-mono";
import { DMSerifDisplay_400Regular } from "@expo-google-fonts/dm-serif-display";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
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
import { colors } from "@/lib/design-tokens";
import { SessionProvider } from "@/lib/session";
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

export { ExpoRouterErrorBoundary as ErrorBoundary };

function CreamSplash({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.cream,
      }}
    >
      <ActivityIndicator color={colors.deepTeal} />
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
    return <CreamSplash message="Loading LifeShield…" />;
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
    DMSerifDisplay_400Regular,
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
          <CreamSplash message="Loading LifeShield…" />
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
