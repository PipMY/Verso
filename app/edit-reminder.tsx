import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
    DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
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
import { CustomRecurrencePreset, RecurrenceType } from "@/types/reminder";

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
  const {
    reminders,
    updateReminder,
    deleteReminder,
    uncompleteReminder,
    preferences,
    updatePreferences,
  } = useReminders();

  const reminder = reminders.find((r) => r.id === id);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [datetime, setDatetime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [isSaving, setIsSaving] = useState(false);
  const [showCustomRecurrenceModal, setShowCustomRecurrenceModal] =
    useState(false);
  const [customRecurrenceLabel, setCustomRecurrenceLabel] = useState("");
  const [customRecurrenceType, setCustomRecurrenceType] =
    useState<RecurrenceType>("daily");
  const [customRecurrenceInterval, setCustomRecurrenceInterval] = useState("1");

  // Get top 5 most used custom recurrence presets
  const topCustomPresets = useMemo(() => {
    return [...(preferences.customRecurrencePresets || [])]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5);
  }, [preferences.customRecurrencePresets]);

  useEffect(() => {
    if (reminder) {
      setTitle(reminder.title);
      setNotes(reminder.notes || "");
      setDatetime(parseISO(reminder.datetime));
      setRecurrence(reminder.recurrence?.type || "none");
      setRecurrenceInterval(reminder.recurrence?.interval || 1);
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
                interval: recurrenceInterval,
              }
            : undefined,
        priority,
      });

      // Update custom recurrence usage if applicable
      if (recurrence !== "none" && recurrenceInterval > 1) {
        const existingPresets = preferences.customRecurrencePresets || [];
        const existingIndex = existingPresets.findIndex(
          (p) => p.type === recurrence && p.interval === recurrenceInterval,
        );

        if (existingIndex >= 0) {
          const updated = [...existingPresets];
          updated[existingIndex] = {
            ...updated[existingIndex],
            usageCount: updated[existingIndex].usageCount + 1,
          };
          await updatePreferences({ customRecurrencePresets: updated });
        }
      }

      router.back();
    } catch (error) {
      console.error("Error updating reminder:", error);
      Alert.alert("Error", "Failed to update reminder. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectCustomPreset = (preset: CustomRecurrencePreset) => {
    Haptics.selectionAsync();
    setRecurrence(preset.type);
    setRecurrenceInterval(preset.interval);

    // Update usage count
    const existingPresets = preferences.customRecurrencePresets || [];
    const updated = existingPresets.map((p) =>
      p.id === preset.id ? { ...p, usageCount: p.usageCount + 1 } : p,
    );
    updatePreferences({ customRecurrencePresets: updated });
  };

  const handleDeleteCustomPreset = (preset: CustomRecurrencePreset) => {
    Alert.alert(
      "Delete Preset",
      `Are you sure you want to delete "${preset.label}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const existingPresets = preferences.customRecurrencePresets || [];
            const updated = existingPresets.filter((p) => p.id !== preset.id);
            await updatePreferences({ customRecurrencePresets: updated });
          },
        },
      ],
    );
  };

  const handleAddCustomRecurrence = async () => {
    if (!customRecurrenceLabel.trim()) {
      Alert.alert("Missing Label", "Please enter a label for this preset.");
      return;
    }

    const interval = parseInt(customRecurrenceInterval, 10);
    if (isNaN(interval) || interval < 1) {
      Alert.alert(
        "Invalid Interval",
        "Please enter a valid interval (1 or more).",
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newPreset: CustomRecurrencePreset = {
      id: Date.now().toString(),
      label: customRecurrenceLabel.trim(),
      type: customRecurrenceType,
      interval,
      usageCount: 1,
    };

    const existingPresets = preferences.customRecurrencePresets || [];
    await updatePreferences({
      customRecurrencePresets: [...existingPresets, newPreset],
    });

    // Apply this preset
    setRecurrence(customRecurrenceType);
    setRecurrenceInterval(interval);
    setShowCustomRecurrenceModal(false);
    setCustomRecurrenceLabel("");
    setCustomRecurrenceInterval("1");
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

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      const newDate = new Date(datetime);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDatetime(newDate);
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedTime) {
      const newDate = new Date(datetime);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDatetime(newDate);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["bottom"]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
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
                  <Text
                    style={[styles.uncompleteText, { color: Brand.primary }]}
                  >
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

            {/* Date & Time Pickers */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Date & Time
              </Text>

              {/* Date Picker Button */}
              <Pressable
                style={[
                  styles.dateTimeCard,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar" size={22} color={Brand.primary} />
                <Text style={[styles.dateTimeValue, { color: colors.text }]}>
                  {format(datetime, "EEEE, MMMM d, yyyy")}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>

              {/* Time Picker Button */}
              <Pressable
                style={[
                  styles.dateTimeCard,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time" size={22} color={Brand.secondary} />
                <Text style={[styles.dateTimeValue, { color: colors.text }]}>
                  {format(datetime, "h:mm a")}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>

              {/* iOS Date Picker (inline) */}
              {Platform.OS === "ios" && showDatePicker && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={datetime}
                    mode="date"
                    display="spinner"
                    onChange={onDateChange}
                    themeVariant={colorScheme}
                  />
                  <Pressable
                    style={[
                      styles.pickerDone,
                      { backgroundColor: Brand.primary },
                    ]}
                    onPress={() => setShowDatePicker(false)}
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                </View>
              )}

              {/* iOS Time Picker (inline) */}
              {Platform.OS === "ios" && showTimePicker && (
                <View style={styles.pickerContainer}>
                  <DateTimePicker
                    value={datetime}
                    mode="time"
                    display="spinner"
                    onChange={onTimeChange}
                    themeVariant={colorScheme}
                  />
                  <Pressable
                    style={[
                      styles.pickerDone,
                      { backgroundColor: Brand.primary },
                    ]}
                    onPress={() => setShowTimePicker(false)}
                  >
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </Pressable>
                </View>
              )}

              {/* Android Date Picker (modal) */}
              {Platform.OS === "android" && showDatePicker && (
                <DateTimePicker
                  value={datetime}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}

              {/* Android Time Picker (modal) */}
              {Platform.OS === "android" && showTimePicker && (
                <DateTimePicker
                  value={datetime}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                />
              )}
            </View>

            {/* Recurrence */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: colors.textMuted }]}>
                Repeat
              </Text>
              <View style={styles.recurrenceRow}>
                {RECURRENCE_OPTIONS.map((option) => {
                  const isSelected =
                    recurrence === option.value && recurrenceInterval === 1;
                  return (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.recurrenceButton,
                        {
                          backgroundColor: isSelected
                            ? Brand.primary
                            : colors.backgroundSecondary,
                          borderColor: isSelected
                            ? Brand.primary
                            : colors.cardBorder,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setRecurrence(option.value);
                        setRecurrenceInterval(1);
                      }}
                    >
                      <Ionicons
                        name={option.icon}
                        size={18}
                        color={isSelected ? "#fff" : colors.textMuted}
                      />
                      <Text
                        style={[
                          styles.recurrenceText,
                          { color: isSelected ? "#fff" : colors.text },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Custom Recurrence Presets - Top 5 most used */}
              {topCustomPresets.length > 0 && (
                <View
                  style={[
                    styles.customPresetsSection,
                    { marginTop: Spacing.sm },
                  ]}
                >
                  <Text style={[styles.sublabel, { color: colors.textMuted }]}>
                    Your Presets
                  </Text>
                  <View style={styles.recurrenceRow}>
                    {topCustomPresets.map((preset) => {
                      const isSelected =
                        recurrence === preset.type &&
                        recurrenceInterval === preset.interval;
                      return (
                        <Pressable
                          key={preset.id}
                          style={[
                            styles.recurrenceButton,
                            {
                              backgroundColor: isSelected
                                ? Brand.secondary
                                : colors.backgroundSecondary,
                              borderColor: isSelected
                                ? Brand.secondary
                                : colors.cardBorder,
                            },
                          ]}
                          onPress={() => handleSelectCustomPreset(preset)}
                          onLongPress={() => handleDeleteCustomPreset(preset)}
                        >
                          <Ionicons
                            name="repeat"
                            size={18}
                            color={isSelected ? "#fff" : colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.recurrenceText,
                              { color: isSelected ? "#fff" : colors.text },
                            ]}
                          >
                            {preset.label}
                          </Text>
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color={isSelected ? "#fff" : colors.textMuted}
                            style={{ marginLeft: 4 }}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Add Custom Button */}
              <Pressable
                style={[
                  styles.addCustomButton,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.cardBorder,
                  },
                ]}
                onPress={() => setShowCustomRecurrenceModal(true)}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={18}
                  color={Brand.primary}
                />
                <Text style={[styles.addCustomText, { color: Brand.primary }]}>
                  Add Custom Repeat
                </Text>
              </Pressable>
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
                          color:
                            priority === option.value ? "#fff" : colors.text,
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
      </TouchableWithoutFeedback>

      {/* Custom Recurrence Modal */}
      <Modal
        visible={showCustomRecurrenceModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomRecurrenceModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.background },
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Add Custom Repeat
                </Text>
                <Pressable
                  onPress={() => setShowCustomRecurrenceModal(false)}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.section}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Label
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.backgroundSecondary,
                        borderColor: colors.cardBorder,
                        color: colors.text,
                      },
                    ]}
                    placeholder="e.g., Every 2 weeks"
                    placeholderTextColor={colors.textMuted}
                    value={customRecurrenceLabel}
                    onChangeText={setCustomRecurrenceLabel}
                  />
                </View>

                <View style={styles.section}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>
                    Repeat Every
                  </Text>
                  <View style={styles.intervalRow}>
                    <View
                      style={[
                        styles.stepperRow,
                        {
                          borderColor: colors.cardBorder,
                          backgroundColor: colors.backgroundSecondary,
                        },
                      ]}
                    >
                      <Pressable
                        style={[
                          styles.stepperButton,
                          {
                            borderRightWidth: 1,
                            borderRightColor: colors.cardBorder,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          const current =
                            parseInt(customRecurrenceInterval, 10) || 1;
                          setCustomRecurrenceInterval(
                            String(Math.max(1, current - 1)),
                          );
                        }}
                      >
                        <Ionicons
                          name="remove"
                          size={20}
                          color={Brand.primary}
                        />
                      </Pressable>
                      <TextInput
                        style={[styles.intervalInput, { color: colors.text }]}
                        keyboardType="number-pad"
                        value={customRecurrenceInterval}
                        onChangeText={(text) => {
                          const cleaned = text.replace(/[^0-9]/g, "");
                          setCustomRecurrenceInterval(cleaned);
                        }}
                        onBlur={() => {
                          const num = parseInt(customRecurrenceInterval, 10);
                          if (!num || num < 1) setCustomRecurrenceInterval("1");
                        }}
                        selectTextOnFocus
                      />
                      <Pressable
                        style={[
                          styles.stepperButton,
                          {
                            borderLeftWidth: 1,
                            borderLeftColor: colors.cardBorder,
                          },
                        ]}
                        onPress={() => {
                          Haptics.selectionAsync();
                          const current =
                            parseInt(customRecurrenceInterval, 10) || 1;
                          setCustomRecurrenceInterval(String(current + 1));
                        }}
                      >
                        <Ionicons name="add" size={20} color={Brand.primary} />
                      </Pressable>
                    </View>
                    <View style={styles.typeButtons}>
                      {(
                        [
                          { value: "hourly", label: "Hours" },
                          { value: "daily", label: "Days" },
                          { value: "weekly", label: "Weeks" },
                          { value: "monthly", label: "Months" },
                        ] as const
                      ).map((option) => {
                        const isSelected =
                          customRecurrenceType === option.value;
                        return (
                          <Pressable
                            key={option.value}
                            style={[
                              styles.typeButton,
                              {
                                backgroundColor: isSelected
                                  ? Brand.primary
                                  : colors.backgroundSecondary,
                                borderColor: isSelected
                                  ? Brand.primary
                                  : colors.cardBorder,
                              },
                            ]}
                            onPress={() => {
                              Haptics.selectionAsync();
                              setCustomRecurrenceType(option.value);
                            }}
                          >
                            <Text
                              style={[
                                styles.typeButtonText,
                                { color: isSelected ? "#fff" : colors.text },
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </View>
              </View>

              <Pressable
                style={[
                  styles.modalSaveButton,
                  {
                    backgroundColor: customRecurrenceLabel.trim()
                      ? Brand.primary
                      : colors.backgroundTertiary,
                    opacity: customRecurrenceLabel.trim() ? 1 : 0.5,
                  },
                ]}
                onPress={handleAddCustomRecurrence}
                disabled={!customRecurrenceLabel.trim()}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Add Preset</Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  dateTimeValue: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: "500",
  },
  pickerContainer: {
    marginTop: Spacing.sm,
    backgroundColor: "transparent",
  },
  pickerDone: {
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  pickerDoneText: {
    color: "#fff",
    fontSize: FontSizes.md,
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
  sublabel: {
    fontSize: FontSizes.xs,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  customPresetsSection: {
    gap: Spacing.xs,
  },
  addCustomButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
  },
  addCustomText: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
  },
  modalBody: {
    gap: Spacing.lg,
  },
  intervalRow: {
    gap: Spacing.md,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    alignSelf: "flex-start",
  },
  stepperButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  intervalInput: {
    fontSize: FontSizes.lg,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 50,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  typeButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  typeButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  typeButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  modalSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
});
