import { Component, type ErrorInfo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";
import { colors, spacing } from "@/lib/design-tokens";
import { classifyError } from "@/lib/friendly-errors";
import { typography } from "@/lib/typography";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  hint: string | null;
};

type FallbackProps = {
  onRetry: () => void;
  hint?: string | null;
};

/**
 * Friendly crash screen — never a blank white page.
 * React only allows class components to catch render errors, so this one
 * file is a class on purpose. Everywhere else we use function components.
 */
function ErrorFallback({ onRetry, hint }: FallbackProps) {
  return (
    <View style={styles.root}>
      <Surface style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">
          Something went wrong
        </Text>
        <Text style={styles.body}>
          {hint ??
            "Tap to retry. Your answers are saved — this is just a display hiccup."}
        </Text>
        {/* The one ink button on this screen. */}
        <PrimaryButton
          title="Tap to retry"
          accessibilityLabel="Retry"
          onPress={onRetry}
        />
      </Surface>
    </View>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, hint: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, hint: classifyError(error).message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Breadcrumb only — never dump keys or tokens.
    console.warn(
      "PRESCOPE error boundary caught:",
      error.name,
      info.componentStack ? "see component stack" : "",
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, hint: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback onRetry={this.handleRetry} hint={this.state.hint} />
      );
    }
    return this.props.children;
  }
}

/** Used by Expo Router if a route itself throws. */
export function ExpoRouterErrorBoundary({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) {
  return <ErrorFallback onRetry={retry} hint={classifyError(error).message} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.paper,
    paddingHorizontal: spacing.md,
  },
  card: {
    width: "100%",
    padding: spacing.md,
  },
  title: {
    ...typography.title,
    textAlign: "center",
    color: colors.ink,
  },
  body: {
    marginTop: spacing.sm,
    ...typography.body,
    textAlign: "center",
    color: colors.inkSoft,
  },
});
