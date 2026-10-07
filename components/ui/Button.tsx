import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Icon, type IconName } from "@/components/specimen/Icon";

import { Sheet } from "@/components/specimen/Sheet";
import { PressScale } from "@/components/ui/PressScale";
import { Accent, Edge, Ink, Paper, primaryButtonHeight, Rule, secondaryButtonHeight, SpecimenType, tapTarget, TRACK } from "@/lib/specimen-tokens";

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

/** Primary is a solid ink block; pressing lifts it slightly, not a hue shift. */
function inkFill(pressed: boolean) {
  return pressed ? Ink.pressed : Ink.full;
}

function tagFill(pressed: boolean) {
  return pressed ? Accent.tagPressed : Accent.tag;
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
        <Icon name={icon ?? "more-horizontal"} size={20} color={Accent.tag} />
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
            <ActivityIndicator color={Accent.tag} />
          ) : (
            <Text
              style={[
                styles.textLabel,
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
        <Sheet style={styles.secondarySheet}>
          {loading ? (
            <ActivityIndicator color={Ink.full} />
          ) : (
            <Text style={[styles.secondaryLabel, isDisabled && styles.disabledText]}>
              {title.toUpperCase()}
            </Text>
          )}
        </Sheet>
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
        { backgroundColor: isDanger ? tagFill(pressed) : inkFill(pressed) },
        !isDisabled ? {} : null,
        isDisabled && styles.primaryDisabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={Paper.sheet} />
      ) : (
        <View style={styles.row}>
          {icon ? (
            <Icon
              name={icon}
              size={18}
              color={isDisabled ? Ink.ghost : Paper.sheet}
              style={styles.iconGap}
            />
          ) : null}
          <Text style={[styles.primaryLabel, isDisabled && styles.disabledText]}>
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
  primary: {
    marginTop: 16,
    minHeight: primaryButtonHeight,
    borderRadius: Edge.none,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  primaryDisabled: {
    backgroundColor: Ink.ruleStrong,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryLabel: {
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    letterSpacing: TRACK.label,
    color: Paper.sheet,
  },
  secondaryWrap: {
    marginTop: 16,
    width: "100%",
    borderRadius: Edge.none,
    overflow: "hidden",
  },
  secondarySheet: {
    minHeight: secondaryButtonHeight,
    borderWidth: Rule.medium,
    borderColor: Ink.full,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  secondaryPressed: {
    opacity: 0.85,
  },
  secondaryLabel: {
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    letterSpacing: TRACK.label,
    color: Ink.full,
  },
  textBtn: {
    marginTop: 8,
    minHeight: tapTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  textLabel: {
    fontFamily: SpecimenType.mono,
    fontSize: 14,
    letterSpacing: TRACK.label,
    color: Accent.tag,
    textDecorationLine: "underline",
  },
  textLabelPressed: {
    opacity: 0.6,
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
    color: Ink.faint,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconGap: {
    marginRight: 8,
  },
});
