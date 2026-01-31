import {
    BorderRadius,
    Brand,
    Colors,
    FontSizes,
    Shadows,
    Spacing,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DEFAULT_SNOOZE_PRESETS, SnoozePreset } from "@/types/reminder";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

interface SnoozeModalProps {
  visible: boolean;
  onClose: () => void;
  onSnooze: (minutes: number) => void;
  customPresets?: SnoozePreset[];
}

export function SnoozeModal({
  visible,
  onClose,
  onSnooze,
  customPresets,
}: SnoozeModalProps) {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const presets = customPresets || DEFAULT_SNOOZE_PRESETS;

  const handleSnooze = (minutes: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSnooze(minutes);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Snooze Reminder
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Choose when to be reminded again
            </Text>
          </View>

          <View style={styles.presetsContainer}>
            {presets.map((preset) => (
              <Pressable
                key={preset.id}
                style={[
                  styles.presetButton,
                  { backgroundColor: colors.backgroundTertiary },
                ]}
                onPress={() => handleSnooze(preset.minutes)}
              >
                <Ionicons
                  name="alarm-outline"
                  size={20}
                  color={Brand.primary}
                />
                <Text style={[styles.presetLabel, { color: colors.text }]}>
                  {preset.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.customSection}>
            <Text style={[styles.customLabel, { color: colors.textMuted }]}>
              Or enter custom time
            </Text>
            <View style={styles.customRow}>
              {[5, 10, 22, 45].map((mins) => (
                <Pressable
                  key={mins}
                  style={[styles.customButton, { borderColor: Brand.primary }]}
                  onPress={() => handleSnooze(mins)}
                >
                  <Text
                    style={[styles.customButtonText, { color: Brand.primary }]}
                  >
                    {mins}m
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={[
              styles.cancelButton,
              { backgroundColor: colors.backgroundSecondary },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>
              Cancel
            </Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  container: {
    width: "100%",
    maxWidth: 360,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.sm,
  },
  presetsContainer: {
    gap: Spacing.sm,
  },
  presetButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  presetLabel: {
    fontSize: FontSizes.md,
    fontWeight: "500",
  },
  customSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  customLabel: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  customRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  customButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    alignItems: "center",
  },
  customButtonText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  cancelText: {
    fontSize: FontSizes.md,
    fontWeight: "500",
  },
});
