import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";

import { GlassSurface } from "@/components/ui/GlassSurface";
import { classifyError } from "@/lib/friendly-errors";

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
    <View className="flex-1 items-center justify-center bg-cream px-6">
      <GlassSurface intensity="card" style={{ padding: 24, width: "100%" }}>
        <Text className="text-center text-xl text-charcoal">
          Something went wrong
        </Text>
        <Text className="mt-2 text-center text-charcoal">
          {hint ??
            "Tap to retry. Your answers are saved — this is just a display hiccup."}
        </Text>
        <Pressable
          onPress={onRetry}
          className="mt-6 min-h-[44px] items-center justify-center rounded-2xl bg-teal px-6 py-3"
          accessibilityRole="button"
          accessibilityLabel="Retry"
        >
          <Text className="text-white">Tap to retry</Text>
        </Pressable>
      </GlassSurface>
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
