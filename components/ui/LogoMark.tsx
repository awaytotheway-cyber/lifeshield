import { Image } from "expo-image";

type LogoMarkProps = {
  /** Rendered square size in px. Default matches the welcome/splash usage. */
  size?: number;
};

/**
 * The LifeShield brand mark. Always the same source file, shown at whatever
 * size the screen needs — never recolored or redrawn.
 */
export function LogoMark({ size = 96 }: LogoMarkProps) {
  return (
    <Image
      source={require("../../assets/images/lifeshield-logo.png")}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="LifeShield logo"
    />
  );
}
