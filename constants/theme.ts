/**
 * Verso Theme - Dark mode first design with purple/teal accents
 * Inspired by modern productivity apps
 */

import { Platform } from "react-native";

// Brand colors matching mood board
export const Brand = {
  primary: "#8B5CF6", // Purple
  primaryLight: "#A78BFA",
  primaryDark: "#7C3AED",
  secondary: "#14B8A6", // Teal
  secondaryLight: "#2DD4BF",
  secondaryDark: "#0D9488",
  accent: "#F472B6", // Pink
  accentLight: "#F9A8D4",
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
};

export const Colors = {
  light: {
    text: "#1F2937",
    textSecondary: "#6B7280",
    textMuted: "#9CA3AF",
    background: "#FFFFFF",
    backgroundSecondary: "#F3F4F6",
    backgroundTertiary: "#E5E7EB",
    card: "#FFFFFF",
    cardBorder: "#E5E7EB",
    tint: Brand.primary,
    icon: "#6B7280",
    tabIconDefault: "#9CA3AF",
    tabIconSelected: Brand.primary,
    separator: "#E5E7EB",
    overlay: "rgba(0, 0, 0, 0.5)",
  },
  dark: {
    text: "#F9FAFB",
    textSecondary: "#D1D5DB",
    textMuted: "#9CA3AF",
    background: "#0F0F14",
    backgroundSecondary: "#1A1A24",
    backgroundTertiary: "#252532",
    card: "#1A1A24",
    cardBorder: "#2D2D3A",
    tint: Brand.primary,
    icon: "#9CA3AF",
    tabIconDefault: "#6B7280",
    tabIconSelected: Brand.primary,
    separator: "#2D2D3A",
    overlay: "rgba(0, 0, 0, 0.7)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
  },
});

// Shadow presets
export const Shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  }),
};

// Priority colors
export const PriorityColors = {
  low: Brand.secondary,
  medium: Brand.warning,
  high: Brand.error,
};
