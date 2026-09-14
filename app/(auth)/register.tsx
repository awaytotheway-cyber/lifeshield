import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text } from "react-native";
import { z } from "zod";

import { PostAuthRedirect } from "@/components/journey/PostAuthRedirect";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Screen } from "@/components/ui/Screen";
import { SetupBanners } from "@/components/ui/SetupBanners";
import { TextField } from "@/components/ui/TextField";
import { COPY } from "@/lib/copy";
import { colors, spacing } from "@/lib/design-tokens";
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
      <Screen contentPadding={spacing.screenX}>
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
    <Screen scroll contentPadding={spacing.screenX}>
      <Text style={styles.brand}>{COPY.appName}</Text>
      <Text style={styles.title}>{COPY.registerTitle}</Text>
      <Text style={styles.sub}>{COPY.registerSubtitle}</Text>

      <SetupBanners />

      <Card>
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
      </Card>

      {errors.root?.message ? (
        <Text style={styles.error}>{errors.root.message}</Text>
      ) : null}

      <PrimaryButton
        title={COPY.registerButton}
        onPress={() => void onSubmit()}
        loading={isSubmitting}
        disabled={!configured || isSubmitting}
      />

      <TextButton
        title={COPY.registerToLogin}
        onPress={() => router.push(routes.login)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  brand: {
    ...typography.display,
    color: colors.deepTeal,
  },
  title: {
    marginTop: 12,
    fontFamily: fontFamily.bodySemi,
    fontSize: 20,
    lineHeight: 26,
    color: colors.charcoal,
  },
  sub: {
    marginTop: 8,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.coral,
  },
  loading: {
    textAlign: "center",
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.slate,
  },
});
