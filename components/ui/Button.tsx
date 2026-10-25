import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import {
  colors,
  controlHeight,
  radius,
  status,
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
  /** Trailing icon, for forward actions where a leading arrow reads wrong. */
  iconTrailing?: keyof typeof Feather.glyphMap;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Pressed primary. Ink darkened just enough to register the press without
 * reading as a second colour — the only press state the system defines.
 */
const INK_PRESSED = "#2A2A26";

/**
 * Disabled label. Darker than `inkFaint` so it still clears 4.5:1 on the
 * `hairline` disabled fill, and lighter than `inkSoft` so it reads as off.
 */
const DISABLED_TEXT = "#6B6B65";

/** Destructive actions borrow the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/**
 * The Moss button. Flat ink, one radius, no shadow, no bounce.
 *
 * Exactly one `primary` belongs on a screen — everything else is `secondary`
 * (a 1px ink outline on nothing) or `text` (an underlined link). `ghost` is
 * kept as a name because 27 screens still ask for it; it renders the
 * secondary outline, which is what those screens meant by "not the primary".
 * `icon` likewise keeps its name and loses its glass: a bare 44pt hit area.
 *
 * There is no `PressScale` here. Moss does not bounce; a press darkens or
 * fills, and that is the whole feedback vocabulary.
 */
export function Button({
  title = "",
  loading = false,
  variant = "primary",
  disabled,
  icon,
  iconTrailing,
  accessibilityLabel,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  // `ghost` was the glass outline button. Moss has one outline, so it maps
  // straight onto `secondary` rather than renaming 27 call sites.
  const resolvedVariant = variant === "ghost" ? "secondary" : variant;
  const label = accessibilityLabel ?? title;

  if (resolvedVariant === "icon") {
    return (
      <Pressable
        {...rest}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.iconBtn,
          pressed && !isDisabled ? styles.iconPressed : null,
          style,
        ]}
      >
        <Feather
          name={icon ?? "more-horizontal"}
          size={20}
          color={isDisabled ? DISABLED_TEXT : colors.ink}
        />
      </Pressable>
    );
  }

  if (resolvedVariant === "text") {
    return (
      <Pressable
        {...rest}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={isDisabled}
        style={[styles.textBtn, style]}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          // The underline is the affordance, so it is always drawn — a
          // tertiary action that only underlines on hover is invisible on a
          // phone. React Native has no `textUnderlineOffset`; the spec's 4px
          // offset lands only where the platform supplies one.
          <Text
            style={[styles.textLabel, isDisabled ? styles.disabledText : null]}
          >
            {title}
          </Text>
        )}
      </Pressable>
    );
  }

  if (resolvedVariant === "secondary" || resolvedVariant === "danger") {
    const isDanger = resolvedVariant === "danger";
    const outline = isDisabled
      ? colors.hairline
      : isDanger
        ? CLAY
        : colors.ink;
    const labelColor = isDisabled
      ? DISABLED_TEXT
      : isDanger
        ? CLAY
        : colors.ink;

    return (
      <Pressable
        {...rest}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.outline,
          { borderColor: outline },
          pressed && !isDisabled ? styles.outlinePressed : null,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={colors.ink} />
        ) : (
          <View style={styles.row}>
            {icon ? (
              <Feather
                name={icon}
                size={18}
                color={labelColor}
                style={styles.iconGap}
              />
            ) : null}
            <Text style={[styles.label, { color: labelColor }]}>{title}</Text>
            {iconTrailing ? (
              <Feather
                name={iconTrailing}
                size={18}
                color={labelColor}
                style={styles.iconGapTrailing}
              />
            ) : null}
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.primary,
        {
          backgroundColor: isDisabled
            ? colors.hairline
            : pressed
              ? INK_PRESSED
              : colors.ink,
        },
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
              color={isDisabled ? DISABLED_TEXT : colors.white}
              style={styles.iconGap}
            />
          ) : null}
          <Text
            style={[
              styles.label,
              { color: isDisabled ? DISABLED_TEXT : colors.white },
            ]}
          >
            {title}
          </Text>
          {iconTrailing ? (
            <Feather
              name={iconTrailing}
              size={18}
              color={isDisabled ? DISABLED_TEXT : colors.white}
              style={styles.iconGapTrailing}
            />
          ) : null}
        </View>
      )}
    </Pressable>
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
    // The 16pt lead keeps the rhythm the screens were written against; the
    // screen tasks set their own spacing when they rebuild each layout.
    marginTop: 16,
    minHeight: controlHeight,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  outline: {
    marginTop: 16,
    minHeight: controlHeight,
    borderRadius: radius.control,
    borderWidth: 1,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    width: "100%",
  },
  // A press fills the outline with the paper ground rather than tinting it:
  // the outline button carries no colour of its own to darken.
  outlinePressed: {
    backgroundColor: colors.paper,
  },
  label: {
    fontFamily: fontFamily.bodySemi,
    fontSize: 15,
  },
  textBtn: {
    marginTop: 8,
    minHeight: tapTarget,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  textLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 15,
    color: colors.ink,
    textDecorationLine: "underline",
  },
  iconBtn: {
    width: tapTarget,
    height: tapTarget,
    borderRadius: radius.control,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPressed: {
    backgroundColor: colors.paper,
  },
  disabledText: {
    color: DISABLED_TEXT,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconGap: {
    marginRight: 8,
  },
  iconGapTrailing: {
    marginLeft: 8,
  },
});
