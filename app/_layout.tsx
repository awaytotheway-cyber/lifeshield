// Must be the first import so NativeWind styles load before anything renders.
import "../global.css";

import { Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
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
import { COPY } from "@/lib/copy";
import { SessionProvider } from "@/lib/session";
import { Colors, Font, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

export { ExpoRouterErrorBoundary as ErrorBoundary };

function BrandSplash({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: Colors.background,
      }}
    >
      <ActivityIndicator color={Colors.orange} />
      <Text
        style={[
          typeStyle("body", Colors.body),
          { marginTop: Space.md, fontFamily: Font.regular },
        ]}
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
      <Stack
        screenOptions={{
          headerShown: false,
          // Section 9 motion: slide, ~300ms, ease-out.
          animation: "slide_from_right",
          animationDuration: 300,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
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
  // Fraunces (warm serif) for titles, Inter for everything else — see lib/theme.ts.
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
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
