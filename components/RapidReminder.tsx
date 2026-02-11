import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Keyboard,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    SlideInDown,
    SlideOutDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from "react-native-reanimated";

import {
    BorderRadius,
    Brand,
    Colors,
    FontSizes,
    Shadows,
    Spacing,
} from "@/constants/theme";
import { useReminders } from "@/context/RemindersContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    ParsedReminder,
    parseNaturalLanguage
} from "@/services/nlp";
import { scheduleNotification } from "@/services/notifee";
import { DEFAULT_SNOOZE_PRESETS } from "@/types/reminder";

interface RapidReminderProps {
  onCreated?: () => void;
}

export function RapidReminder({ onCreated }: RapidReminderProps) {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { addReminder, featureAccess } = useReminders();

  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedReminder | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const scale = useSharedValue(1);

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

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

  const handleToggle = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(isExpanded ? 1 : 1.1, { damping: 10 }, () => {
      scale.value = withSpring(1);
    });

    if (!isExpanded) {
      setIsExpanded(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      Keyboard.dismiss();
      setIsExpanded(false);
      setText("");
      setParsed(null);
    }
  }, [isExpanded, scale]);

  const handleSave = useCallback(async () => {
    if (!parsed) return;

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

      // Schedule notification
      try {
        await scheduleNotification(saved.id, saved.title, parsed.datetime);
      } catch (error) {
        console.log("Could not schedule notification:", error);
      }

      // Reset UI
      setText("");
      setParsed(null);
      setIsExpanded(false);
      Keyboard.dismiss();
      onCreated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";
      if (message === "LIMIT_REACHED") {
        Alert.alert(
          "Upgrade to Pro",
          "Free plan allows up to 10 reminders. Upgrade to create unlimited reminders.",
        );
      } else {
        Alert.alert("Error", "Failed to save reminder. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [parsed, addReminder, onCreated]);

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
    <View style={styles.wrapper}>
      {/* Expanded Input Area */}
      {isExpanded && (
        <Animated.View
          entering={SlideInDown.duration(300).springify()}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.expandedContainer,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: parsed ? confidenceColor : colors.cardBorder,
            },
          ]}
        >
          {/* Input Row */}
          <View style={styles.inputRow}>
            <Ionicons
              name="flash"
              size={20}
              color={Brand.warning}
              style={styles.inputIcon}
            />
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.text }]}
              placeholder='e.g. "Take bins out every day at 7am"'
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
              autoCapitalize="sentences"
              autoCorrect
              multiline={false}
            />
            {text.length > 0 && (
              <Pressable
                onPress={() => {
                  setText("");
                  setParsed(null);
                }}
                hitSlop={8}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            )}
          </View>

          {/* Parsed Preview */}
          {parsed && (
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={styles.previewContainer}
            >
              <View
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: colors.backgroundTertiary,
                    borderColor: confidenceColor + "40",
                  },
                ]}
              >
                {/* Title */}
                <View style={styles.previewRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={16}
                    color={confidenceColor}
                  />
                  <Text
                    style={[styles.previewTitle, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {parsed.title}
                  </Text>
                </View>

                {/* Details */}
                <View style={styles.previewDetails}>
                  <View style={styles.previewChip}>
                    <Ionicons
                      name="time-outline"
                      size={12}
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
                      })}{" "}
                      at{" "}
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
                        size={12}
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
                      size={12}
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

              {/* Save Button */}
              <Pressable
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: Brand.primary,
                    opacity: isSaving ? 0.6 : 1,
                  },
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                <Ionicons
                  name={isSaving ? "hourglass" : "checkmark"}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.saveButtonText}>
                  {isSaving ? "Saving..." : "Create Reminder"}
                </Text>
              </Pressable>
            </Animated.View>
          )}

          {/* Hint text when no input */}
          {!text && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Type naturally — include what, when, and how often
              </Text>
              <View style={styles.examplesContainer}>
                {[
                  "Take bins out every day at 7am",
                  "Call mum every Sunday at 3pm",
                  "Dentist tomorrow at 2:30pm",
                  "Pay rent monthly on the 1st",
                ].map((example) => (
                  <Pressable
                    key={example}
                    style={[
                      styles.exampleChip,
                      { backgroundColor: colors.backgroundTertiary },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setText(example);
                    }}
                  >
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
        </Animated.View>
      )}

      {/* Toggle Button */}
      <Animated.View style={animatedIconStyle}>
        <Pressable
          style={[
            styles.toggleButton,
            {
              backgroundColor: isExpanded
                ? colors.backgroundTertiary
                : Brand.warning,
            },
            !isExpanded && Shadows.glow(Brand.warning),
          ]}
          onPress={handleToggle}
        >
          <Ionicons
            name={isExpanded ? "close" : "flash"}
            size={22}
            color={isExpanded ? colors.textMuted : "#fff"}
          />
          {!isExpanded && <Text style={styles.toggleLabel}>Rapid</Text>}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 90,
    left: Spacing.md,
    right: Spacing.md,
    alignItems: "flex-start",
  },
  toggleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  toggleLabel: {
    color: "#fff",
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },
  expandedContainer: {
    width: "100%",
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.md,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  inputIcon: {
    marginRight: 2,
  },
  textInput: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: "500",
    paddingVertical: Spacing.xs,
  },
  previewContainer: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  previewCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  previewTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    flex: 1,
  },
  previewDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  previewChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  previewChipText: {
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md - 2,
    borderRadius: BorderRadius.md,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  hintText: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  examplesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  exampleChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.sm,
  },
  exampleText: {
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
});
