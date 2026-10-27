import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { PostAuthRedirect } from "@/components/journey/PostAuthRedirect";
import {
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { TextField } from "@/components/ui/TextField";
import { TwoTone } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import { colors, heroGradient, radius, status } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

/** Errors borrow the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * 155deg in points on the unit box: the CSS angle's direction vector is
 * (sin155, -cos155) = (0.423, 0.906), so the band runs from one corner-ish
 * point to its mirror through the centre.
 */
const GRADIENT_START = { x: 0.29, y: 0.05 };
const GRADIENT_END = { x: 0.71, y: 0.95 };

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
    <Screen scroll contentPadding={0}>
      {/*
        The one gradient on this screen, and nothing but the wordmark and the
        promise sits on it — no body copy, no field, no control.
      */}
      <LinearGradient
        colors={heroGradient.colors}
        locations={heroGradient.locations}
        start={GRADIENT_START}
        end={GRADIENT_END}
        style={styles.hero}
      >
        <Text style={styles.wordmark}>{COPY.appName}</Text>
        <Text style={styles.promise}>{COPY.heroPromise}</Text>
      </LinearGradient>

      {/* The white sheet rides 24 up over the band. Fill, not shadow, lifts it. */}
      <View style={styles.sheet}>
        <TwoTone
          size="xl"
          parts={[
            { text: "Welcome ", tone: "bold" },
            { text: "back", tone: "grey" },
          ]}
        />
        <Text style={styles.sub}>{COPY.loginSubtitle}</Text>

        <View style={styles.fields}>
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
        </View>

        <TextButton
          title={COPY.forgotPassword}
          onPress={() => void onForgotPassword()}
          loading={resetBusy}
          disabled={resetBusy || isSubmitting}
          style={styles.forgot}
          accessibilityLabel={COPY.forgotPassword}
        />

        <SetupBanners />

        {resetNotice ? <Text style={styles.notice}>{resetNotice}</Text> : null}
        {errors.root?.message ? (
          <Text style={styles.error}>{errors.root.message}</Text>
        ) : null}

        {/* The single ink button on this screen. */}
        <PrimaryButton
          title={COPY.loginButton}
          onPress={() => void onSubmit()}
          loading={isSubmitting}
          disabled={!configured || isSubmitting}
        />

        <View style={styles.divider}>
          <View style={styles.rule} />
          <Text style={styles.or}>or</Text>
          <View style={styles.rule} />
        </View>

        <SecondaryButton
          title={COPY.loginToRegister}
          onPress={() => router.push(routes.register)}
        />

        <Text style={styles.tagline}>{COPY.tagline}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 272,
    // Cancels the Screen's own 16pt scroll lead so the band meets the safe
    // area instead of leaving a strip of paper above it.
    marginTop: -16,
    paddingTop: 12,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  wordmark: {
    fontFamily: fontFamily.display,
    fontSize: 15,
    // 15 x 0.18 = 2.7
    letterSpacing: 2.7,
    textTransform: "uppercase",
    color: colors.white,
  },
  promise: {
    ...typography.body,
    marginBottom: 30,
    maxWidth: 250,
    color: colors.mossTint,
  },
  sheet: {
    marginTop: -24,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.surface,
    borderTopRightRadius: radius.surface,
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 28,
  },
  sub: {
    ...typography.body,
    marginTop: 12,
    color: colors.inkSoft,
  },
  fields: {
    marginTop: 14,
  },
  forgot: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  divider: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.hairline,
  },
  or: {
    ...typography.label,
    // `inkFaint` is a headline colour from 24px up; a 13px word takes
    // `inkMuted`, which clears AA on white.
    color: colors.inkMuted,
  },
  tagline: {
    ...typography.label,
    marginTop: 22,
    textAlign: "center",
    color: colors.inkMuted,
  },
  error: {
    marginTop: 12,
    ...typography.label,
    color: CLAY,
  },
  notice: {
    marginTop: 12,
    ...typography.label,
    color: colors.mossDeep,
  },
  loading: {
    ...typography.body,
    textAlign: "center",
    color: colors.inkSoft,
  },
});
