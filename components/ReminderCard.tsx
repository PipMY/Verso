import {
    BorderRadius,
    Brand,
    Colors,
    FontSizes,
    PriorityColors,
    Shadows,
    Spacing,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Reminder } from "@/types/reminder";
import { Ionicons } from "@expo/vector-icons";
import { format, isPast, isToday, isTomorrow, parseISO } from "date-fns";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from "react-native-reanimated";

interface ReminderCardProps {
  reminder: Reminder;
  onPress: () => void;
  onComplete: () => void;
  onSnooze: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ReminderCard({
  reminder,
  onPress,
  onComplete,
  onSnooze,
  style,
}: ReminderCardProps) {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const scale = useSharedValue(1);

  const date = parseISO(reminder.snoozedUntil || reminder.datetime);
  const isOverdue = isPast(date) && !reminder.isCompleted;
  const priorityColor = PriorityColors[reminder.priority];

  const handleComplete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const formatDate = () => {
    if (isToday(date)) {
      return `Today at ${format(date, "h:mm a")}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM d, h:mm a");
    }
  };

  return (
    <AnimatedPressable
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: isOverdue ? Brand.error : colors.cardBorder,
          borderWidth: isOverdue ? 1.5 : 1,
        },
        reminder.isCompleted && styles.completedContainer,
        style,
        animatedStyle,
      ]}
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      {/* Priority indicator */}
      <View
        style={[styles.priorityIndicator, { backgroundColor: priorityColor }]}
      />

      {/* Checkbox */}
      <Pressable
        style={[
          styles.checkbox,
          {
            borderColor: reminder.isCompleted
              ? Brand.success
              : colors.textMuted,
            backgroundColor: reminder.isCompleted
              ? Brand.success
              : "transparent",
          },
        ]}
        onPress={handleComplete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {reminder.isCompleted && (
          <Ionicons name="checkmark" size={16} color="#fff" />
        )}
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            { color: colors.text },
            reminder.isCompleted && styles.completedText,
          ]}
          numberOfLines={2}
        >
          {reminder.title}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons
            name={isOverdue ? "alert-circle" : "time-outline"}
            size={14}
            color={isOverdue ? Brand.error : colors.textMuted}
          />
          <Text
            style={[
              styles.dateText,
              { color: isOverdue ? Brand.error : colors.textMuted },
            ]}
          >
            {formatDate()}
          </Text>

          {reminder.recurrence && reminder.recurrence.type !== "none" && (
            <>
              <Ionicons
                name="repeat"
                size={14}
                color={colors.textMuted}
                style={styles.recurrenceIcon}
              />
              <Text
                style={[styles.recurrenceText, { color: colors.textMuted }]}
              >
                {reminder.recurrence.type}
              </Text>
            </>
          )}
        </View>

        {reminder.notes && (
          <Text
            style={[styles.notes, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {reminder.notes}
          </Text>
        )}
      </View>

      {/* Snooze button */}
      {!reminder.isCompleted && (
        <Pressable
          style={[
            styles.snoozeButton,
            { backgroundColor: colors.backgroundTertiary },
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            onSnooze();
          }}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Ionicons name="alarm-outline" size={18} color={Brand.primary} />
        </Pressable>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    overflow: "hidden",
    ...Shadows.sm,
  },
  completedContainer: {
    opacity: 0.6,
  },
  priorityIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: BorderRadius.lg,
    borderBottomLeftRadius: BorderRadius.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
    marginRight: Spacing.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  completedText: {
    textDecorationLine: "line-through",
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateText: {
    fontSize: FontSizes.sm,
    marginLeft: Spacing.xs,
  },
  recurrenceIcon: {
    marginLeft: Spacing.sm,
  },
  recurrenceText: {
    fontSize: FontSizes.xs,
    marginLeft: Spacing.xs,
  },
  notes: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  snoozeButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
});
