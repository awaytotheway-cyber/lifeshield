import { Redirect, Stack } from "expo-router";

import { GateLoading, PostAuthRedirect } from "@/components/journey/PostAuthRedirect";
import { useAuthStore } from "@/stores/auth-store";

export default function AuthLayout() {
  const loading = useAuthStore((state) => state.loading);
  const session = useAuthStore((state) => state.session);

  if (loading) {
    return <GateLoading />;
  }

  if (session) {
    return <PostAuthRedirect />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
