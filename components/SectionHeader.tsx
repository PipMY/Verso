import {
    BorderRadius,
    Brand,
    Colors,
    FontSizes,
    Spacing,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

interface SectionHeaderProps {
  title: string;
  count?: number;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  collapsed?: boolean;
  onToggle?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  count,
  icon,
  iconColor,
  collapsed,
  onToggle,
  style,
}: SectionHeaderProps) {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const handleToggle = () => {
    if (onToggle) {
      Haptics.selectionAsync();
      onToggle();
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.container, style]}
    >
      <Pressable
        style={styles.content}
        onPress={handleToggle}
        disabled={!onToggle}
      >
        {icon && (
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: iconColor || Brand.primary },
            ]}
          >
            <Ionicons name={icon} size={16} color="#fff" />
          </View>
        )}
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {count !== undefined && (
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.backgroundTertiary },
            ]}
          >
            <Text style={[styles.badgeText, { color: colors.textMuted }]}>
              {count}
            </Text>
          </View>
        )}
        {onToggle && (
          <Ionicons
            name={collapsed ? "chevron-forward" : "chevron-down"}
            size={18}
            color={colors.textMuted}
            style={styles.chevron}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badge: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  chevron: {
    marginLeft: "auto",
  },
});
