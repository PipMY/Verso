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
import {
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";

interface ReminderCardProps {
  reminder: Reminder;
  onPress: () => void;
  onComplete: () => void;
  onSnooze: () => void;
  onDelete?: () => void;
  onUncomplete?: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SWIPE_THRESHOLD = -80;

export function ReminderCard({
  reminder,
  onPress,
  onComplete,
  onSnooze,
  onDelete,
  onUncomplete,
  style,
}: ReminderCardProps) {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const date = parseISO(reminder.snoozedUntil || reminder.datetime);
  const isOverdue = isPast(date) && !reminder.isCompleted;
  const priorityColor = PriorityColors[reminder.priority];

  const triggerDelete = () => {
    Alert.alert(
      "Delete Reminder",
      `Are you sure you want to delete "${reminder.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            translateX.value = withSpring(0);
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete?.();
          },
        },
      ],
    );
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -120);
      }
    })
    .onEnd(() => {
      if (translateX.value < SWIPE_THRESHOLD && onDelete) {
        translateX.value = withSpring(-100);
        runOnJS(triggerDelete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const handleComplete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onComplete();
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress();
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? withTiming(1) : withTiming(0),
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

  const cardContent = (
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
        cardStyle,
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

      {/* Snooze button or Undo button */}
      {!reminder.isCompleted ? (
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
      ) : onUncomplete ? (
        <Pressable
          style={[
            styles.snoozeButton,
            { backgroundColor: colors.backgroundTertiary },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onUncomplete();
          }}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Ionicons name="arrow-undo-outline" size={18} color={Brand.warning} />
        </Pressable>
      ) : null}
    </AnimatedPressable>
  );

  // If delete is enabled, wrap in swipe container
  if (onDelete) {
    return (
      <View style={styles.swipeContainer}>
        <Animated.View style={[styles.deleteAction, deleteButtonStyle]}>
          <Ionicons name="trash" size={24} color="#fff" />
        </Animated.View>
        <GestureDetector gesture={panGesture}>{cardContent}</GestureDetector>
      </View>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: "relative",
  },
  deleteAction: {
    position: "absolute",
    right: Spacing.md + 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    backgroundColor: Brand.error,
    borderRadius: BorderRadius.lg,
    marginVertical: Spacing.xs,
  },
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
