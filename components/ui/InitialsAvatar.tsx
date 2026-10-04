import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { Image } from "expo-image";

import { Ink, Paper, Rule, SpecimenType } from "@/lib/specimen-tokens";

type InitialsAvatarProps = {
  /** Full name or email — initials are derived from it. */
  name?: string | null;
  /** Optional photo. When present it replaces the initials. */
  uri?: string | null;
  /** Diameter. Default 80. */
  size?: number;
  style?: ViewStyle;
};

export function initialsFrom(nameOrEmail?: string | null): string {
  const raw = (nameOrEmail ?? "").trim();
  if (!raw) return "?";
  const base = raw.includes("@") ? raw.split("@")[0] : raw;
  const parts = base
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Circular avatar with the brand gradient behind white initials.
 * Initials read as more distinctive than a stock placeholder photo.
 */
export function InitialsAvatar({
  name,
  uri,
  size = 80,
  style,
}: InitialsAvatarProps) {
  const dim = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.wrap, dim, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.35) }]}>
          {initialsFrom(name)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Ink.full,
    borderWidth: Rule.medium,
    borderColor: Ink.full,
  },
  initials: {
    fontFamily: SpecimenType.serif,
    color: Paper.sheet,
  },
});
