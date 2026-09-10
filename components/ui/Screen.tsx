import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  /** Horizontal padding. Default 24. Triage uses 20 to match the design file. */
  contentPadding?: number;
};

export function Screen({
  children,
  scroll = false,
  contentPadding = 24,
}: ScreenProps) {
  const inner = scroll ? (
    <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
      <View style={{ paddingHorizontal: contentPadding, paddingVertical: 32 }}>
        {children}
      </View>
    </ScrollView>
  ) : (
    <View
      className="flex-1 justify-center"
      style={{ paddingHorizontal: contentPadding, paddingVertical: 32 }}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-cream">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {inner}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
