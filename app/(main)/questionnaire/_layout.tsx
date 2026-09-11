import { Stack } from "expo-router";

/** Hub plus questionnaire section forms. */
export default function QuestionnaireLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, gestureEnabled: true }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="demographics" />
      <Stack.Screen name="reproductive" options={{ gestureEnabled: false }} />
      <Stack.Screen name="radiation" />
      <Stack.Screen name="comorbidities" />
      <Stack.Screen
        name="family-history"
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="personal" />
      <Stack.Screen name="lifestyle" />
      <Stack.Screen name="stress" />
      <Stack.Screen name="diet" />
      <Stack.Screen name="prior-screening" />
    </Stack>
  );
}
