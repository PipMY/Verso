import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    BorderRadius,
    Brand,
    Colors,
    FontSizes,
    Spacing,
} from "@/constants/theme";
import { useReminders } from "@/context/RemindersContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ParsedReminder, parseNaturalLanguage } from "@/services/nlp";
import { scheduleNotification } from "@/services/notifee";
import { DEFAULT_SNOOZE_PRESETS } from "@/types/reminder";

export default function RapidReminderModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const { addReminder, featureAccess, preferences, updatePreferences } =
    useReminders();

  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedReminder | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Auto-focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  // Debounced parsing
  useEffect(() => {
    if (!text.trim()) {
      setParsed(null);
      return;
    }

    const timeout = setTimeout(() => {
      const result = parseNaturalLanguage(text);
      setParsed(result);
    }, 300);

    return () => clearTimeout(timeout);
  }, [text]);

  const handleSave = useCallback(async () => {
    if (!parsed) return;

    // Block custom recurrence for free users
    if (
      parsed.recurrence &&
      parsed.recurrence.type === "custom" &&
      !featureAccess.unlimitedRecurrence
    ) {
      Alert.alert(
        "Verso Pro Required",
        "Custom repeats are a Pro feature. Upgrade to unlock them.",
        [
          { text: "Not Now", style: "cancel" },
          { text: "View Plans", onPress: () => router.push("/paywall") },
        ],
      );
      return;
    }

    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      const newReminder = {
        title: parsed.title,
        notes: undefined,
        datetime: parsed.datetime.toISOString(),
        isCompleted: false,
        recurrence: parsed.recurrence
          ? {
              type: parsed.recurrence.type,
              interval: parsed.recurrence.interval,
            }
          : undefined,
        snoozePresets: DEFAULT_SNOOZE_PRESETS,
        priority: parsed.priority,
      };

      const saved = await addReminder(newReminder);

      // Save/update custom recurrence preset when interval > 1
      if (parsed.recurrence && parsed.recurrence.interval > 1) {
        const existingPresets = preferences.customRecurrencePresets || [];
        const existingIndex = existingPresets.findIndex(
          (p) =>
            p.type === parsed.recurrence!.type &&
            p.interval === parsed.recurrence!.interval,
        );

        if (existingIndex >= 0) {
          // Increment usage count
          const updated = [...existingPresets];
          updated[existingIndex] = {
            ...updated[existingIndex],
            usageCount: updated[existingIndex].usageCount + 1,
          };
          await updatePreferences({ customRecurrencePresets: updated });
        } else {
          // Create new custom recurrence preset
          const unitMap: Record<string, string> = {
            daily: "days",
            weekly: "weeks",
            monthly: "months",
            yearly: "years",
            hourly: "hours",
          };
          const unit =
            unitMap[parsed.recurrence.type] || parsed.recurrence.type;
          const label = `Every ${parsed.recurrence.interval} ${unit}`;

          const newPreset = {
            id: Date.now().toString(),
            label,
            type: parsed.recurrence.type,
            interval: parsed.recurrence.interval,
            usageCount: 1,
          };
          await updatePreferences({
            customRecurrencePresets: [...existingPresets, newPreset],
          });
        }
      }

      // Schedule notification
      try {
        await scheduleNotification(saved.id, saved.title, parsed.datetime);
      } catch (error) {
        console.log("Could not schedule notification:", error);
      }

      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (message === "LIMIT_REACHED") {
        Alert.alert(
          "Upgrade to Pro",
          "Free plan allows up to 10 reminders. Upgrade to create unlimited reminders.",
          [
            { text: "Not Now", style: "cancel" },
            { text: "View Plans", onPress: () => router.push("/paywall") },
          ],
        );
      } else {
        Alert.alert("Error", "Failed to save reminder. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [parsed, addReminder, featureAccess, router]);

  const handleSubmit = useCallback(() => {
    if (parsed) {
      handleSave();
    }
  }, [parsed, handleSave]);

  const confidenceColor =
    parsed && parsed.confidence >= 0.7
      ? Brand.success
      : parsed && parsed.confidence >= 0.4
        ? Brand.warning
        : Brand.error;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Header hint */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View style={styles.headerRow}>
              <Ionicons name="flash" size={24} color={Brand.warning} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Rapid Reminder
              </Text>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Type naturally — include what, when, and how often
            </Text>
          </Animated.View>

          {/* Input */}
          <View style={styles.section}>
            <TextInput
              ref={inputRef}
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: parsed ? confidenceColor : colors.cardBorder,
                },
              ]}
              placeholder="e.g. Take bins out every day at 7am"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
              autoCapitalize="sentences"
              autoCorrect
              multiline={false}
            />
          </View>

          {/* Example chips */}
          {!text && (
            <Animated.View
              entering={FadeInDown.duration(300).delay(100)}
              style={styles.section}
            >
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                Try an example
              </Text>
              <View style={styles.examplesContainer}>
                {[
                  "Take bins out every day at 7am",
                  "Call mum every Sunday at 3pm",
                  "Dentist tomorrow at 2:30pm",
                  "Water plants every 3 days at 8am",
                  "Team standup daily at 9:15am urgent",
                ].map((example) => (
                  <Pressable
                    key={example}
                    style={[
                      styles.exampleChip,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setText(example);
                    }}
                  >
                    <Ionicons
                      name="flash-outline"
                      size={12}
                      color={Brand.warning}
                    />
                    <Text
                      style={[
                        styles.exampleText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {example}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Parsed Preview */}
          {parsed && (
            <Animated.View
              entering={FadeInDown.duration(250)}
              style={styles.section}
            >
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                Preview
              </Text>
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: confidenceColor + "40",
                  },
                ]}
              >
                {/* Title */}
                <View style={styles.previewRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={confidenceColor}
                  />
                  <Text
                    style={[styles.previewTitle, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {parsed.title}
                  </Text>
                </View>

                {/* Details */}
                <View style={styles.previewDetails}>
                  <View style={styles.previewChip}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={Brand.primary}
                    />
                    <Text
                      style={[
                        styles.previewChipText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {parsed.datetime.toLocaleDateString([], {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>

                  <View style={styles.previewChip}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={Brand.primary}
                    />
                    <Text
                      style={[
                        styles.previewChipText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {parsed.datetime.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>

                  {parsed.recurrence && (
                    <View style={styles.previewChip}>
                      <Ionicons
                        name="repeat-outline"
                        size={14}
                        color={Brand.secondary}
                      />
                      <Text
                        style={[
                          styles.previewChipText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {parsed.recurrence.interval === 1
                          ? parsed.recurrence.type
                          : `Every ${parsed.recurrence.interval} ${
                              (
                                {
                                  daily: "days",
                                  weekly: "weeks",
                                  monthly: "months",
                                  yearly: "years",
                                  hourly: "hours",
                                } as Record<string, string>
                              )[parsed.recurrence.type] ||
                              parsed.recurrence.type
                            }`}
                      </Text>
                    </View>
                  )}

                  <View
                    style={[
                      styles.previewChip,
                      {
                        backgroundColor:
                          (parsed.priority === "high"
                            ? Brand.error
                            : parsed.priority === "low"
                              ? Brand.secondary
                              : Brand.warning) + "20",
                      },
                    ]}
                  >
                    <Ionicons
                      name="flag"
                      size={14}
                      color={
                        parsed.priority === "high"
                          ? Brand.error
                          : parsed.priority === "low"
                            ? Brand.secondary
                            : Brand.warning
                      }
                    />
                    <Text
                      style={[
                        styles.previewChipText,
                        {
                          color:
                            parsed.priority === "high"
                              ? Brand.error
                              : parsed.priority === "low"
                                ? Brand.secondary
                                : Brand.warning,
                        },
                      ]}
                    >
                      {parsed.priority}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Empty state when text entered but nothing parsed */}
          {text && !parsed && (
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.section}
            >
              <View
                style={[
                  styles.emptyParseCard,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={24}
                  color={colors.textMuted}
                />
                <Text
                  style={[styles.emptyParseText, { color: colors.textMuted }]}
                >
                  Couldn't parse that — try including a time like "at 7am" or
                  "tomorrow"
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Save Button */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
          ]}
        >
          <Pressable
            style={[
              styles.saveButton,
              {
                backgroundColor:
                  parsed && !isSaving
                    ? Brand.primary
                    : colors.backgroundTertiary,
                opacity: parsed && !isSaving ? 1 : 0.5,
              },
            ]}
            onPress={handleSave}
            disabled={!parsed || isSaving}
          >
            <Ionicons
              name={isSaving ? "hourglass" : "flash"}
              size={20}
              color="#fff"
            />
            <Text style={styles.saveButtonText}>
              {isSaving ? "Creating..." : "Create Reminder"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: FontSizes.sm,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textInput: {
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    padding: Spacing.md,
    minHeight: 52,
    fontSize: FontSizes.md,
    fontWeight: "500",
  },
  examplesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  exampleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  exampleText: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  previewCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  previewTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    flex: 1,
  },
  previewDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  previewChipText: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  emptyParseCard: {
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  emptyParseText: {
    fontSize: FontSizes.sm,
    textAlign: "center",
  },
  footer: {
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
});
