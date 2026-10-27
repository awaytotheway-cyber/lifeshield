import { zodResolver } from "@hookform/resolvers/zod";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { z } from "zod";

import { PostAuthRedirect } from "@/components/journey/PostAuthRedirect";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { TextField } from "@/components/ui/TextField";
import { TwoTone } from "@/components/ui/TwoTone";
import { COPY } from "@/lib/copy";
import { colors, heroGradient, radius, status } from "@/lib/design-tokens";
import { routes } from "@/lib/routes";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";

const registerSchema = z
  .object({
    fullName: z.string().min(1, "Enter your name"),
    email: z.email("Enter a valid email"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(8, "Repeat your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterValues = z.infer<typeof registerSchema>;

/** Errors borrow the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/** Matches the login hero: 155deg expressed on the unit box. */
const GRADIENT_START = { x: 0.29, y: 0.05 };
const GRADIENT_END = { x: 0.71, y: 0.95 };

export default function RegisterScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);
  const configured = useAuthStore((state) => state.configured);
  const signUp = useAuthStore((state) => state.signUp);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
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
      const result = await signUp(values.email, values.password, values.fullName);
      if (!result.ok) {
        setError("root", { message: result.message });
        return;
      }
      if (result.needsEmailConfirm || result.message) {
        setError("root", { message: result.message });
      }
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "We couldn't create your account. Check your connection and try again.",
      });
    }
  });

  return (
    <Screen scroll contentPadding={0}>
      {/* The one gradient here — wordmark and promise only, never body copy. */}
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

      <View style={styles.sheet}>
        <TwoTone
          size="xl"
          parts={[
            { text: "Create ", tone: "bold" },
            { text: "your account", tone: "grey" },
          ]}
        />
        <Text style={styles.sub}>{COPY.registerSubtitle}</Text>

        <View style={styles.fields}>
          <Controller
            control={control}
            name="fullName"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Full name"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                autoCapitalize="words"
                textContentType="name"
                autoComplete="name"
                error={errors.fullName?.message}
              />
            )}
          />

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
                textContentType="newPassword"
                autoComplete="new-password"
                error={errors.password?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextField
                label="Confirm password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                textContentType="newPassword"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
              />
            )}
          />
        </View>

        <SetupBanners />

        {errors.root?.message ? (
          <Text style={styles.error}>{errors.root.message}</Text>
        ) : null}

        {/* The single ink button on this screen. */}
        <PrimaryButton
          title={COPY.registerButton}
          onPress={() => void onSubmit()}
          loading={isSubmitting}
          disabled={!configured || isSubmitting}
        />

        {/* Tertiary: a plain underlined link, no outline. */}
        <TextButton
          title={COPY.registerToLogin}
          onPress={() => router.push(routes.login)}
        />

        <Text style={styles.tagline}>{COPY.tagline}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    // Shorter than login's 272: four fields need the room, and the sign-up
    // screen is the quieter half of the pair.
    height: 212,
    // Cancels the Screen's 16pt scroll lead so the band meets the safe area.
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
  loading: {
    ...typography.body,
    textAlign: "center",
    color: colors.inkSoft,
  },
});
