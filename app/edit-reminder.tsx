import { Ionicons } from "@expo/vector-icons";
import { addDays, addHours, addMinutes, format, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { RecurrenceType } from "@/types/reminder";

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

export default function EditReminderScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { reminders, updateReminder, deleteReminder, uncompleteReminder } =
    useReminders();

  const reminder = reminders.find((r) => r.id === id);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [datetime, setDatetime] = useState(new Date());
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setNotes(reminder.notes || "");
      setDatetime(parseISO(reminder.datetime));
      setRecurrence(reminder.recurrence?.type || "none");
      setPriority(reminder.priority);
    }
  }, [reminder]);

  if (!reminder) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.textMuted }]}>
          Reminder not found
        </Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Missing Title", "Please enter a title for your reminder.");
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updateReminder(id!, {
        title: title.trim(),
        notes: notes.trim() || undefined,
        datetime: datetime.toISOString(),
        recurrence:
          recurrence !== "none"
            ? {
                type: recurrence,
                interval: 1,
              }
            : undefined,
        priority,
      });

      router.back();
    } catch (error) {
      console.error("Error updating reminder:", error);
      Alert.alert("Error", "Failed to update reminder. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Reminder",
      "Are you sure you want to delete this reminder?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await deleteReminder(id!);
            router.back();
          },
        },
      ],
    );
  };

  const handleUncomplete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await uncompleteReminder(id!);
  };

  const adjustDate = (days: number) => {
    Haptics.selectionAsync();
    setDatetime((prev) => addDays(prev, days));
  };

  const adjustHours = (hours: number) => {
    Haptics.selectionAsync();
    setDatetime((prev) => addHours(prev, hours));
  };

  const adjustMinutes = (mins: number) => {
    Haptics.selectionAsync();
    setDatetime((prev) => addMinutes(prev, mins));
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
          {/* Completed status */}
          {reminder.isCompleted && (
            <View
              style={[
                styles.completedBanner,
                { backgroundColor: Brand.success + "20" },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Brand.success}
              />
              <Text style={[styles.completedText, { color: Brand.success }]}>
                Completed{" "}
                {reminder.completedAt
                  ? format(parseISO(reminder.completedAt), "MMM d, h:mm a")
                  : ""}
              </Text>
              <Pressable onPress={handleUncomplete}>
                <Text style={[styles.uncompleteText, { color: Brand.primary }]}>
                  Restore
                </Text>
              </Pressable>
            </View>
          )}

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

            {/* Minute fine-tuning */}
            <View style={styles.minuteAdjustRow}>
              <Pressable
                style={[
                  styles.minuteButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => adjustMinutes(-15)}
              >
                <Text style={[styles.minuteButtonText, { color: colors.text }]}>
                  -15m
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.minuteButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => adjustMinutes(-5)}
              >
                <Text style={[styles.minuteButtonText, { color: colors.text }]}>
                  -5m
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.minuteButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => adjustMinutes(-1)}
              >
                <Text style={[styles.minuteButtonText, { color: colors.text }]}>
                  -1m
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.minuteButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => adjustMinutes(1)}
              >
                <Text style={[styles.minuteButtonText, { color: colors.text }]}>
                  +1m
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.minuteButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => adjustMinutes(5)}
              >
                <Text style={[styles.minuteButtonText, { color: colors.text }]}>
                  +5m
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.minuteButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => adjustMinutes(15)}
              >
                <Text style={[styles.minuteButtonText, { color: colors.text }]}>
                  +15m
                </Text>
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

          {/* Delete button */}
          <Pressable
            style={[
              styles.deleteButton,
              { backgroundColor: Brand.error + "15" },
            ]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={Brand.error} />
            <Text style={[styles.deleteButtonText, { color: Brand.error }]}>
              Delete Reminder
            </Text>
          </Pressable>
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
              {isSaving ? "Saving..." : "Save Changes"}
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
  errorText: {
    textAlign: "center",
    marginTop: Spacing.xl,
  },
  completedBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  completedText: {
    flex: 1,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  uncompleteText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
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
  minuteAdjustRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  minuteButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  minuteButtonText: {
    fontSize: FontSizes.sm,
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
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  deleteButtonText: {
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
