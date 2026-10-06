import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { GlassCard } from "@/components/ui/GlassCard";
import { PressScale } from "@/components/ui/PressScale";
import {
  colors,
  primaryButtonHeight,
  radius,
  secondaryButtonHeight,
  shadows,
  tapTarget,
} from "@/lib/design-tokens";
import { fontFamily } from "@/lib/typography";
import { Icon, type IconName } from "@/components/ui/Icon";

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
  /** Icon name for IconButton (and optional leading icon). */
  icon?: IconName;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

function darkerPrimary(pressed: boolean) {
  return pressed ? colors.primaryBluePressed : colors.primaryBlue;
}

function darkerCoral(pressed: boolean) {
  return pressed ? colors.riskHighPressed : colors.riskHigh;
}

/**
 * Shared button. Prefer PrimaryButton / SecondaryButton names in new screens.
 * Older screens still pass title + variant="ghost".
 *
 * The in-button spinner below is the one place ActivityIndicator is correct:
 * the design system bans it for *content* that is loading (use a shimmer
 * skeleton there), but a button that is mid-submit has no layout to ghost and
 * must keep its own footprint, so a spinner in place of the label is right.
 */
export function Button({
  title = "",
  loading = false,
  variant = "primary",
  disabled,
  icon,
  accessibilityLabel,
  style,
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
        <Icon name={icon ?? "more-horizontal"} size={20} color={colors.primaryBlue} />
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
            <ActivityIndicator color={colors.primaryBlue} />
          ) : (
            <Text
              style={[
                styles.textLabel,
                pressed && !isDisabled ? styles.textLabelPressed : null,
                isDisabled && styles.disabledText,
              ]}
            >
              {title}
            </Text>
          )
        }
      </PressScale>
    );
  }

  if (resolvedVariant === "secondary") {
    return (
      <PressScale
        {...rest}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.secondaryWrap,
          pressed && !isDisabled ? styles.secondaryPressed : null,
          isDisabled && styles.disabledWrap,
          style,
        ]}
      >
        <GlassCard intensity="button" style={styles.secondaryGlass}>
          {loading ? (
            <ActivityIndicator color={colors.primaryBlue} />
          ) : (
            <Text style={[styles.secondaryLabel, isDisabled && styles.disabledText]}>
              {title}
            </Text>
          )}
        </GlassCard>
      </PressScale>
    );
  }

  const isDanger = resolvedVariant === "danger";

  return (
    <PressScale
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primary,
        { backgroundColor: isDanger ? darkerCoral(pressed) : darkerPrimary(pressed) },
        !isDisabled ? shadows.button : null,
        isDisabled && styles.primaryDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.white} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Icon
              name={icon}
              size={18}
              color={isDisabled ? colors.mist : colors.white}
              style={styles.iconGap}
            />
          ) : null}
          <Text style={[styles.primaryLabel, isDisabled && styles.disabledText]}>
            {title}
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
  primary: {
    marginTop: 16,
    minHeight: primaryButtonHeight,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  primaryDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.white,
  },
  secondaryWrap: {
    marginTop: 16,
    width: "100%",
    borderRadius: radius.button,
    overflow: "hidden",
  },
  secondaryGlass: {
    minHeight: secondaryButtonHeight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  secondaryPressed: {
    opacity: 0.85,
  },
  secondaryLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.primaryBlue,
  },
  textBtn: {
    marginTop: 8,
    minHeight: tapTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  textLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.primaryBlue,
  },
  textLabelPressed: {
    textDecorationLine: "underline",
  },
  iconBtn: {
    width: tapTarget,
    height: tapTarget,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDisabled: {
    opacity: 0.5,
  },
  disabledWrap: {
    opacity: 0.5,
  },
  disabledText: {
    color: colors.mist,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconGap: {
    marginRight: 8,
  },
});
