import { Ionicons } from "@expo/vector-icons";
import { addDays, addHours, format, setHours, setMinutes } from "date-fns";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BorderRadius,
  Brand,
  Colors,
  FontSizes,
  Spacing,
} from "@/constants/theme";
import { useReminders } from "@/context/RemindersContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { DEFAULT_SNOOZE_PRESETS, RecurrenceType } from "@/types/reminder";

const RECURRENCE_OPTIONS: {
  value: RecurrenceType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "none", label: "Never", icon: "close-circle-outline" },
  { value: "daily", label: "Daily", icon: "today-outline" },
  { value: "weekly", label: "Weekly", icon: "calendar-outline" },
  { value: "monthly", label: "Monthly", icon: "calendar-number-outline" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low", color: Brand.secondary },
  { value: "medium", label: "Medium", color: Brand.warning },
  { value: "high", label: "High", color: Brand.error },
] as const;

const QUICK_TIMES = [
  { label: "In 1 hour", getDate: () => addHours(new Date(), 1) },
  {
    label: "Tomorrow 9am",
    getDate: () => setMinutes(setHours(addDays(new Date(), 1), 9), 0),
  },
  {
    label: "Tomorrow 6pm",
    getDate: () => setMinutes(setHours(addDays(new Date(), 1), 18), 0),
  },
];

export default function AddReminderModal() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { addReminder } = useReminders();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [datetime, setDatetime] = useState(addHours(new Date(), 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your reminder.");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await addReminder({
        title: title.trim(),
        notes: notes.trim() || undefined,
        datetime: datetime.toISOString(),
        isCompleted: false,
        recurrence:
          recurrence !== "none"
            ? {
                type: recurrence,
                interval: 1,
              }
            : undefined,
        snoozePresets: DEFAULT_SNOOZE_PRESETS,
        priority,
      });

      router.back();
    } catch (error) {
      console.error("Error saving reminder:", error);
      Alert.alert("Error", "Failed to save reminder. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickTime = (getDate: () => Date) => {
    Haptics.selectionAsync();
    setDatetime(getDate());
  };

  const adjustDate = (days: number) => {
    Haptics.selectionAsync();
    setDatetime((prev) => addDays(prev, days));
  };

  const adjustHours = (hours: number) => {
    Haptics.selectionAsync();
    setDatetime((prev) => addHours(prev, hours));
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Title
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.titleInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.cardBorder,
                },
              ]}
              placeholder="What do you need to remember?"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
              maxLength={100}
            />
          </View>

          {/* Notes Input */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Notes (optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.notesInput,
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.text,
                  borderColor: colors.cardBorder,
                },
              ]}
              placeholder="Add any additional details..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Quick Time Buttons */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Quick Set
            </Text>
            <View style={styles.quickTimeRow}>
              {QUICK_TIMES.map((option) => (
                <Pressable
                  key={option.label}
                  style={[
                    styles.quickTimeButton,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.cardBorder,
                    },
                  ]}
                  onPress={() => handleQuickTime(option.getDate)}
                >
                  <Text style={[styles.quickTimeText, { color: colors.text }]}>
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Date & Time Display with adjusters */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Date & Time
            </Text>

            {/* Date adjuster */}
            <View
              style={[
                styles.dateTimeCard,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Pressable
                style={styles.adjusterButton}
                onPress={() => adjustDate(-1)}
              >
                <Ionicons
                  name="remove-circle"
                  size={28}
                  color={Brand.primary}
                />
              </Pressable>
              <View style={styles.dateTimeCenter}>
                <Ionicons name="calendar" size={20} color={Brand.primary} />
                <Text style={[styles.dateTimeValue, { color: colors.text }]}>
                  {format(datetime, "EEE, MMM d, yyyy")}
                </Text>
              </View>
              <Pressable
                style={styles.adjusterButton}
                onPress={() => adjustDate(1)}
              >
                <Ionicons name="add-circle" size={28} color={Brand.primary} />
              </Pressable>
            </View>

            {/* Time adjuster */}
            <View
              style={[
                styles.dateTimeCard,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Pressable
                style={styles.adjusterButton}
                onPress={() => adjustHours(-1)}
              >
                <Ionicons
                  name="remove-circle"
                  size={28}
                  color={Brand.secondary}
                />
              </Pressable>
              <View style={styles.dateTimeCenter}>
                <Ionicons name="time" size={20} color={Brand.secondary} />
                <Text style={[styles.dateTimeValue, { color: colors.text }]}>
                  {format(datetime, "h:mm a")}
                </Text>
              </View>
              <Pressable
                style={styles.adjusterButton}
                onPress={() => adjustHours(1)}
              >
                <Ionicons name="add-circle" size={28} color={Brand.secondary} />
              </Pressable>
            </View>
          </View>

          {/* Recurrence */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Repeat
            </Text>
            <View style={styles.recurrenceRow}>
              {RECURRENCE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.recurrenceButton,
                    {
                      backgroundColor:
                        recurrence === option.value
                          ? Brand.primary
                          : colors.backgroundSecondary,
                      borderColor:
                        recurrence === option.value
                          ? Brand.primary
                          : colors.cardBorder,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setRecurrence(option.value);
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={
                      recurrence === option.value ? "#fff" : colors.textMuted
                    }
                  />
                  <Text
                    style={[
                      styles.recurrenceText,
                      {
                        color:
                          recurrence === option.value ? "#fff" : colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Priority
            </Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.priorityButton,
                    {
                      backgroundColor:
                        priority === option.value
                          ? option.color
                          : colors.backgroundSecondary,
                      borderColor:
                        priority === option.value
                          ? option.color
                          : colors.cardBorder,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPriority(option.value);
                  }}
                >
                  <Text
                    style={[
                      styles.priorityText,
                      {
                        color: priority === option.value ? "#fff" : colors.text,
                      },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View style={styles.footer}>
          <Pressable
            style={[
              styles.saveButton,
              {
                backgroundColor: title.trim()
                  ? Brand.primary
                  : colors.backgroundTertiary,
              },
            ]}
            onPress={handleSave}
            disabled={!title.trim() || isSaving}
          >
            <Ionicons name="checkmark" size={22} color="#fff" />
            <Text style={styles.saveButtonText}>
              {isSaving ? "Saving..." : "Save Reminder"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  section: {
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    fontSize: FontSizes.md,
  },
  titleInput: {
    fontWeight: "500",
  },
  notesInput: {
    minHeight: 80,
  },
  quickTimeRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  quickTimeButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  quickTimeText: {
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  dateTimeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  adjusterButton: {
    padding: Spacing.sm,
  },
  dateTimeCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  dateTimeValue: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
  },
  recurrenceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  recurrenceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  recurrenceText: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  priorityRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  priorityText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  footer: {
    padding: Spacing.md,
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
