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
  primaryButtonHeight,
  secondaryButtonHeight,
  shadows,
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
};

function darkerTeal(pressed: boolean) {
  return pressed ? "#0B3E4E" : colors.deepTeal;
}

function darkerCoral(pressed: boolean) {
  return pressed ? "#D15540" : colors.coral;
}

/**
 * Shared button. Prefer PrimaryButton / SecondaryButton names in new screens.
 * Older screens still pass title + variant="ghost".
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
        <Feather name={icon ?? "more-horizontal"} size={20} color={colors.deepTeal} />
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
            <ActivityIndicator color={colors.midTeal} />
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
          styles.secondary,
          pressed && !isDisabled ? styles.secondaryPressed : null,
          isDisabled && styles.disabledWrap,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.deepTeal} />
        ) : (
          <Text style={[styles.secondaryLabel, isDisabled && styles.disabledText]}>
            {title}
          </Text>
        )}
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
        { backgroundColor: isDanger ? darkerCoral(pressed) : darkerTeal(pressed) },
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
            <Feather
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
    borderRadius: 12,
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
  secondary: {
    marginTop: 16,
    minHeight: secondaryButtonHeight,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.deepTeal,
  },
  secondaryPressed: {
    backgroundColor: colors.lightTeal,
  },
  secondaryLabel: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
    color: colors.deepTeal,
  },
  textBtn: {
    marginTop: 8,
    minHeight: tapTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  textLabel: {
    fontFamily: fontFamily.body,
    fontSize: 15,
    color: colors.midTeal,
  },
  textLabelPressed: {
    textDecorationLine: "underline",
  },
  iconBtn: {
    width: tapTarget,
    height: tapTarget,
    borderRadius: 10,
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
