import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { PressScale } from "@/components/ui/PressScale";
import {
  colors,
  hairline,
  primaryButtonHeight,
  spacing,
  tapTarget,
} from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "text"
  | "danger"
  | "icon"
  | "ghost";

type ButtonProps = Omit<PressableProps, "style"> & {
  title?: string;
  loading?: boolean;
  variant?: ButtonVariant;
  /** Feather icon name for IconButton (and optional leading icon). */
  icon?: keyof typeof Feather.glyphMap;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /**
   * When true, the button paints white outline + white text so it can sit
   * on the capsule-black hero or an orange stat panel. Defaults to false
   * (black outline + black text on paper white).
   */
  onDark?: boolean;
};

/**
 * SwimClub button — always outlined, never filled with color. The system
 * uses black-on-white by default and white-on-dark inside the hero band.
 * "Primary" and "secondary" both render the same outlined shape; the
 * difference is only weight (primary = full-height ~44px, secondary =
 * same height, kept as an alias for callsite semantics).
 *
 * The "danger" variant paints the border and label in tabloid orange —
 * the ONE chromatic accent — used only for destructive confirms.
 */
export function Button({
  title = "",
  loading = false,
  variant = "primary",
  disabled,
  icon,
  accessibilityLabel,
  style,
  onDark = false,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  const resolvedVariant = variant === "ghost" ? "text" : variant;
  const label = accessibilityLabel ?? title;

  if (resolvedVariant === "icon") {
    return (
      <PressScale
        {...rest}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={isDisabled}
        style={[styles.iconBtn, isDisabled && styles.iconDisabled, style]}
      >
        <Feather
          name={icon ?? "more-horizontal"}
          size={20}
          color={onDark ? colors.paperWhite : colors.inkBlack}
        />
      </PressScale>
    );
  }

  if (resolvedVariant === "text") {
    return (
      <PressScale
        {...rest}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={isDisabled}
        style={[styles.textBtn, isDisabled && styles.disabledWrap, style]}
      >
        {({ pressed }) =>
          loading ? (
            <ActivityIndicator
              color={onDark ? colors.paperWhite : colors.inkBlack}
            />
          ) : (
            <Text
              style={[
                styles.textLabel,
                onDark ? styles.textLabelOnDark : null,
                pressed && !isDisabled ? styles.textLabelPressed : null,
                isDisabled && styles.disabledText,
              ]}
            >
              {title.toUpperCase()}
            </Text>
          )
        }
      </PressScale>
    );
  }

  const isDanger = resolvedVariant === "danger";
  const borderColor = isDanger
    ? colors.tabloidOrange
    : onDark
      ? colors.paperWhite
      : colors.inkBlack;
  const textColor = isDanger
    ? colors.tabloidOrange
    : onDark
      ? colors.paperWhite
      : colors.inkBlack;

  return (
    <PressScale
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.outlined,
        {
          borderColor,
          backgroundColor:
            pressed && !isDisabled
              ? onDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)"
              : "transparent",
        },
        isDisabled && styles.outlinedDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Feather
              name={icon}
              size={16}
              color={isDisabled ? colors.ash : textColor}
              style={styles.iconGap}
            />
          ) : null}
          <Text
            style={[
              styles.outlinedLabel,
              { color: isDisabled ? colors.ash : textColor },
            ]}
          >
            {title.toUpperCase()}
          </Text>
        </View>
      )}
    </PressScale>
  );
}

export function PrimaryButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />;
}

export function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />;
}

export function TextButton(props: ButtonProps) {
  return <Button variant="text" {...props} />;
}

export function DangerButton(props: ButtonProps) {
  return <Button variant="danger" {...props} />;
}

export function IconButton(props: ButtonProps) {
  return <Button variant="icon" {...props} />;
}

const styles = StyleSheet.create({
  outlined: {
    marginTop: spacing.base,
    minHeight: primaryButtonHeight,
    borderWidth: hairline,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    width: "100%",
  },
  outlinedDisabled: {
    borderColor: colors.ash,
  },
  outlinedLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    letterSpacing: 1.3,
  },
  textBtn: {
    marginTop: spacing.sm,
    minHeight: tapTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  textLabel: {
    fontFamily: fontFamily.mono,
    fontSize: 13,
    letterSpacing: 1,
    color: colors.inkBlack,
  },
  textLabelOnDark: {
    color: colors.paperWhite,
  },
  textLabelPressed: {
    textDecorationLine: "underline",
  },
  iconBtn: {
    width: tapTarget,
    height: tapTarget,
    borderRadius: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDisabled: {
    opacity: 0.5,
  },
  disabledWrap: {
    opacity: 1,
  },
  disabledText: {
    color: colors.ash,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconGap: {
    marginRight: spacing.sm,
  },
});
