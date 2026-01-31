import {
    BorderRadius,
    Brand,
    Colors,
    FontSizes,
    Shadows,
    Spacing,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = "checkmark-circle-outline",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: colors.backgroundTertiary },
        ]}
      >
        <Ionicons name={icon} size={48} color={Brand.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textMuted }]}>
        {description}
      </Text>

      {actionLabel && onAction && (
        <Pressable
          style={[styles.actionButton, { backgroundColor: Brand.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onAction();
          }}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  description: {
    fontSize: FontSizes.md,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.xl,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  actionText: {
    color: "#fff",
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
});
