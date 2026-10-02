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
import { LinearGradient } from "expo-linear-gradient";

import { PressScale } from "@/components/ui/PressScale";
import {
  Colors,
  Gradients,
  Motion,
  Radius,
  Shadow,
  Size,
  Space,
  typeStyle,
} from "@/lib/theme";

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

/**
 * Shared button for the orange redesign (Section 6 of .cursorrules-redesign).
 *
 * PLAIN ENGLISH:
 * - `primary`   → 60px tall, orange gradient, white label, warm glow.
 * - `secondary` → 56px tall, white with a 1.5px orange border.
 * - `text`      → a plain orange link.
 * - `danger`    → solid red, for destructive actions.
 * - `icon`      → a 48px circular white button with a soft shadow.
 *
 * Prefer the named helpers (PrimaryButton, SecondaryButton…) in screens.
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
        haptic="light"
        style={[
          styles.iconBtn,
          !isDisabled ? Shadow.soft : null,
          isDisabled && styles.iconDisabled,
          style,
        ]}
      >
        <Feather
          name={icon ?? "more-horizontal"}
          size={22}
          color={isDisabled ? Colors.faint : Colors.ink}
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
        style={[styles.textBtn, style]}
      >
        {({ pressed }) =>
          loading ? (
            <ActivityIndicator color={Colors.orange} />
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
        haptic="light"
        style={({ pressed }) => [
          styles.secondary,
          pressed && !isDisabled ? styles.secondaryPressed : null,
          isDisabled && styles.secondaryDisabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={Colors.orange} />
        ) : (
          <View style={styles.row}>
            {icon ? (
              <Feather
                name={icon}
                size={18}
                color={isDisabled ? Colors.faint : Colors.orange}
                style={styles.iconGap}
              />
            ) : null}
            <Text
              style={[styles.secondaryLabel, isDisabled && styles.disabledText]}
            >
              {title}
            </Text>
          </View>
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
      haptic="medium"
      scale={Motion.pressButton}
      style={[
        styles.primaryWrap,
        !isDisabled ? (isDanger ? Shadow.soft : Shadow.button) : null,
        style,
      ]}
    >
      {({ pressed }) => (
        <>
          {isDisabled ? (
            <View style={[styles.primaryFill, styles.primaryDisabled]} />
          ) : isDanger ? (
            <View
              style={[
                styles.primaryFill,
                { backgroundColor: pressed ? Colors.redDeep : Colors.red },
              ]}
            />
          ) : (
            <LinearGradient
              colors={
                pressed
                  ? [Colors.orangeDeep, Colors.orange]
                  : [...Gradients.orange]
              }
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.primaryFill}
            />
          )}
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <View style={styles.row}>
              {icon ? (
                <Feather
                  name={icon}
                  size={18}
                  color={isDisabled ? Colors.faint : Colors.white}
                  style={styles.iconGap}
                />
              ) : null}
              <Text
                style={[styles.primaryLabel, isDisabled && styles.disabledText]}
              >
                {title}
              </Text>
            </View>
          )}
        </>
      )}
    </PressScale>
  );
}

/** 60px orange gradient button — the one clear action on a screen. */
export function PrimaryButton(props: ButtonProps) {
  return <Button variant="primary" {...props} />;
}

/** 56px white button with an orange border — the secondary option. */
export function SecondaryButton(props: ButtonProps) {
  return <Button variant="secondary" {...props} />;
}

/** Plain orange text link. */
export function TextButton(props: ButtonProps) {
  return <Button variant="text" {...props} />;
}

/** Solid red button for destructive actions. */
export function DangerButton(props: ButtonProps) {
  return <Button variant="danger" {...props} />;
}

/** 48px circular white button with a Feather icon. */
export function IconButton(props: ButtonProps) {
  return <Button variant="icon" {...props} />;
}

const styles = StyleSheet.create({
  primaryWrap: {
    marginTop: Space.md,
    minHeight: Size.primaryButton,
    borderRadius: Radius.button,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.lg,
    width: "100%",
    overflow: "hidden",
  },
  primaryFill: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: Radius.button,
  },
  primaryDisabled: {
    backgroundColor: Colors.line,
  },
  primaryLabel: {
    ...typeStyle("cardTitle"),
    color: Colors.white,
    textAlign: "center",
  },
  secondary: {
    marginTop: Space.md,
    minHeight: Size.secondaryButton,
    borderRadius: Radius.button,
    borderWidth: 1.5,
    borderColor: Colors.orange,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.lg,
    width: "100%",
  },
  secondaryPressed: {
    backgroundColor: Colors.orangeTint,
  },
  secondaryDisabled: {
    borderColor: Colors.line,
    backgroundColor: Colors.cloud,
  },
  secondaryLabel: {
    ...typeStyle("cardTitle"),
    color: Colors.orange,
    textAlign: "center",
  },
  textBtn: {
    marginTop: Space.sm,
    minHeight: Size.tap,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Space.sm,
  },
  textLabel: {
    ...typeStyle("body"),
    color: Colors.orange,
  },
  textLabelPressed: {
    color: Colors.orangeDeep,
  },
  iconBtn: {
    width: Size.circleButton,
    height: Size.circleButton,
    borderRadius: Size.circleButton / 2,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  iconDisabled: {
    opacity: 0.5,
  },
  disabledText: {
    color: Colors.faint,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconGap: {
    marginRight: Space.sm,
  },
});
