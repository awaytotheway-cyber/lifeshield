import type { ThemeConfig } from "antd";

import { colors, fonts, radii, shadows } from "./tokens";

/** Ant Design token theme — primary is deep teal, never generic Material blue. */
export const lifeShieldAntdTheme: ThemeConfig = {
  token: {
    colorPrimary: colors.deepTeal,
    colorInfo: colors.midTeal,
    colorSuccess: colors.sage,
    colorWarning: colors.amber,
    colorError: colors.coral,
    colorLink: colors.midTeal,
    colorText: colors.charcoal,
    colorTextSecondary: colors.slate,
    colorTextTertiary: colors.mist,
    colorBorder: colors.border,
    colorBorderSecondary: colors.border,
    colorBgLayout: colors.cream,
    colorBgContainer: colors.white,
    colorBgElevated: colors.white,
    colorBgSpotlight: colors.deepTeal,
    borderRadius: radii.input,
    borderRadiusLG: radii.card,
    fontFamily: fonts.ui,
    controlHeight: 40,
    controlOutline: "rgba(26, 122, 154, 0.12)",
    boxShadow: shadows.card,
    boxShadowSecondary: shadows.button,
  },
  components: {
    Layout: {
      bodyBg: colors.cream,
      headerBg: colors.white,
      siderBg: colors.deepTeal,
      triggerBg: "#0A3A48",
      triggerColor: colors.white,
    },
    Menu: {
      itemBg: "transparent",
      itemColor: "rgba(255, 255, 255, 0.82)",
      itemHoverColor: colors.white,
      itemHoverBg: "rgba(255, 255, 255, 0.08)",
      itemSelectedBg: colors.midTeal,
      itemSelectedColor: colors.white,
      itemActiveBg: colors.midTeal,
      iconSize: 16,
    },
    Button: {
      borderRadius: radii.button,
      primaryShadow: shadows.button,
      dangerShadow: "0 4px 16px rgba(232, 99, 74, 0.22)",
      fontWeight: 600,
    },
    Card: {
      borderRadiusLG: radii.card,
      boxShadowTertiary: shadows.card,
    },
    Input: {
      borderRadius: radii.input,
      activeBorderColor: colors.midTeal,
      hoverBorderColor: colors.midTeal,
    },
    Select: {
      borderRadius: radii.input,
    },
    Tag: {
      borderRadiusSM: radii.chip,
    },
    Table: {
      headerBg: colors.cream,
      headerColor: colors.slate,
      rowHoverBg: colors.lightTeal,
      borderColor: colors.border,
    },
    Alert: {
      borderRadiusLG: radii.alert,
    },
    Modal: {
      borderRadiusLG: radii.card,
    },
  },
};
