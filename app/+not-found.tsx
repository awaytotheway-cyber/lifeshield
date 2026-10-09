import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { colors, spacing } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { typography } from "@/lib/typography";

export default function NotFoundScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: "Not found" }} />
      <Screen centered>
        <View style={styles.content}>
          <View style={styles.iconWell}>
            <Feather name="compass" size={44} color={colors.primaryBlue} />
          </View>

          <Text style={styles.title}>Page not found</Text>
          <Text style={styles.body}>
            This page doesn&apos;t exist yet. It may have moved, or the link
            may be out of date.
          </Text>

          <View style={styles.actions}>
            <PrimaryButton
              title="Go home"
              icon="home"
              onPress={() => router.replace(routes.home)}
            />
            {router.canGoBack() ? (
              <TextButton title="Go back" onPress={() => router.back()} />
            ) : null}
          </View>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
  },
  iconWell: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.deepNavy,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    color: colors.slate,
    textAlign: "center",
    marginTop: spacing.mdSm,
    maxWidth: 320,
  },
  actions: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
});
