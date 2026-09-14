/**
 * PRESCOPE entry file.
 *
 * Expo web looks for this file first. We immediately hand off to Expo Router
 * so the real screens in the /app folder are shown (splash, login, onboarding,
 * triage). Without this file, the browser can fall back to Expo's blank
 * "Open up App.tsx..." starter screen.
 *
 * Do not put UI in this file. Change screens under /app instead.
 */
import "expo-router/entry";
