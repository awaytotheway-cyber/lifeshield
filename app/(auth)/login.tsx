import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { PostAuthRedirect } from "@/components/journey/PostAuthRedirect";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { TextField } from "@/components/ui/TextField";
import { COPY } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);
  const configured = useAuthStore((state) => state.configured);
  const signIn = useAuthStore((state) => state.signIn);
  const requestPasswordReset = useAuthStore((state) => state.requestPasswordReset);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (loading) {
    return (
      <Screen>
        <Text style={styles.loading}>{COPY.authLoading}</Text>
      </Screen>
    );
  }

  if (session) {
    return <PostAuthRedirect />;
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      setResetNotice(null);
      const result = await signIn(values.email, values.password);
      if (!result.ok) {
        setError("root", { message: result.message });
      }
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "We couldn't log you in. Check your connection and try again.",
      });
    }
  });

  const onForgotPassword = async () => {
    const email = getValues("email").trim();
    if (!email) {
      setError("email", { message: COPY.forgotPasswordNeedEmail });
      return;
    }
    setResetBusy(true);
    clearErrors("root");
    setResetNotice(null);
    try {
      const result = await requestPasswordReset(email);
      if (!result.ok) {
        setError("root", { message: result.message });
        return;
      }
      setResetNotice(result.message ?? COPY.forgotPasswordSent);
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "We couldn't send a reset email. Try again.",
      });
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <Screen scroll>
      <View style={styles.head}>
        <Text style={styles.brand}>{COPY.appName}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {COPY.loginTitle}
        </Text>
        <Text style={styles.sub}>{COPY.loginSubtitle}</Text>
      </View>

      <SetupBanners />

      <Card style={styles.form}>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Email"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Password"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              error={errors.password?.message}
            />
          )}
        />

        <TextButton
          title={COPY.forgotPassword}
          onPress={() => void onForgotPassword()}
          loading={resetBusy}
          disabled={resetBusy || isSubmitting}
          style={styles.forgot}
          accessibilityLabel={COPY.forgotPassword}
        />
      </Card>

      {resetNotice ? <Text style={styles.notice}>{resetNotice}</Text> : null}
      {errors.root?.message ? (
        <Text style={styles.error}>{errors.root.message}</Text>
      ) : null}

      <View style={styles.actions}>
        <PrimaryButton
          title={COPY.loginButton}
          onPress={() => void onSubmit()}
          loading={isSubmitting}
          disabled={!configured || isSubmitting}
          style={styles.primary}
        />
        <TextButton
          title={COPY.loginToRegister}
          onPress={() => router.push(routes.register)}
        />
      </View>

      <Text style={styles.tagline}>{COPY.tagline}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    marginTop: Space.xl,
  },
  brand: {
    ...typeStyle("label"),
    color: Colors.orange,
    letterSpacing: 1.6,
  },
  title: {
    ...typeStyle("hero"),
    marginTop: Space.sm,
    color: Colors.ink,
  },
  sub: {
    ...typeStyle("body"),
    marginTop: Space.sm,
    color: Colors.body,
  },
  form: {
    marginTop: Gap.afterTitle,
    // TextField brings its own 24px top margin, so trim the card's top pad.
    paddingTop: Space.xs,
  },
  forgot: {
    marginTop: Space.md,
    alignSelf: "flex-start",
  },
  actions: {
    marginTop: Gap.sections,
  },
  primary: {
    marginTop: 0,
  },
  error: {
    ...typeStyle("secondary"),
    marginTop: Gap.cards,
    color: Colors.red,
  },
  notice: {
    ...typeStyle("secondary"),
    marginTop: Gap.cards,
    color: Colors.green,
  },
  tagline: {
    ...typeStyle("caption"),
    marginTop: Gap.sections,
    color: Colors.muted,
    textAlign: "center",
  },
  loading: {
    ...typeStyle("body"),
    textAlign: "center",
    color: Colors.muted,
  },
});
