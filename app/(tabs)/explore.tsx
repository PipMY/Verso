import { addDays, format, isSameDay, parseISO, startOfDay } from "date-fns";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmptyState } from "@/components/EmptyState";
import { FloatingActionButton } from "@/components/FloatingActionButton";
import { ReminderCard } from "@/components/ReminderCard";
import { SectionHeader } from "@/components/SectionHeader";
import { SnoozeModal } from "@/components/SnoozeModal";
import {
    BorderRadius,
    Brand,
    Colors,
    FontSizes,
    Spacing,
} from "@/constants/theme";
import { useReminders } from "@/context/RemindersContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Reminder } from "@/types/reminder";

export default function UpcomingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const {
    isLoading,
    upcomingReminders,
    completeReminder,
    snoozeReminder,
    refresh,
  } = useReminders();

  const [refreshing, setRefreshing] = useState(false);
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(
    null,
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleSnooze = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setSnoozeModalVisible(true);
  };

  const handleSnoozeConfirm = async (minutes: number) => {
    if (selectedReminder) {
      await snoozeReminder(selectedReminder.id, minutes);
    }
  };

  const handleReminderPress = (reminder: Reminder) => {
    router.push({ pathname: "/edit-reminder", params: { id: reminder.id } });
  };

  const handleAddReminder = () => {
    router.push("/modal");
  };

  // Group reminders by date
  const groupedReminders = upcomingReminders.reduce(
    (groups, reminder) => {
      const date = startOfDay(
        parseISO(reminder.snoozedUntil || reminder.datetime),
      );
      const dateKey = format(date, "yyyy-MM-dd");

      if (!groups[dateKey]) {
        groups[dateKey] = {
          date,
          reminders: [],
        };
      }
      groups[dateKey].reminders.push(reminder);
      return groups;
    },
    {} as Record<string, { date: Date; reminders: Reminder[] }>,
  );

  const sortedGroups = Object.values(groupedReminders).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  const formatDateHeader = (date: Date) => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    if (isSameDay(date, tomorrow)) {
      return "Tomorrow";
    }
    return format(date, "EEEE, MMMM d");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(500)}
        style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            Plan Ahead
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>Upcoming</Text>
        </View>
        <View
          style={[
            styles.countBadge,
            { backgroundColor: Brand.secondary + "20" },
          ]}
        >
          <Text style={[styles.countText, { color: Brand.secondary }]}>
            {upcomingReminders.length}
          </Text>
        </View>
      </Animated.View>

      {/* Main content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          upcomingReminders.length === 0 && styles.emptyContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Brand.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {upcomingReminders.length === 0 && !isLoading ? (
          <EmptyState
            icon="calendar-outline"
            title="No Upcoming Reminders"
            description="All your future reminders will appear here. Add a reminder for later to get started."
            actionLabel="Add Reminder"
            onAction={handleAddReminder}
          />
        ) : (
          <>
            {sortedGroups.map((group, groupIndex) => (
              <Animated.View
                key={format(group.date, "yyyy-MM-dd")}
                entering={FadeInDown.duration(400).delay(groupIndex * 100)}
              >
                <SectionHeader
                  title={formatDateHeader(group.date)}
                  count={group.reminders.length}
                  icon="calendar"
                  iconColor={Brand.secondary}
                />
                {group.reminders.map((reminder, index) => (
                  <Animated.View
                    key={reminder.id}
                    entering={FadeInDown.duration(300).delay(index * 50)}
                  >
                    <ReminderCard
                      reminder={reminder}
                      onPress={() => handleReminderPress(reminder)}
                      onComplete={() => completeReminder(reminder.id)}
                      onSnooze={() => handleSnooze(reminder)}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            ))}

            {/* Bottom padding for FAB */}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <FloatingActionButton
        onPress={handleAddReminder}
        color={Brand.secondary}
      />

      {/* Snooze Modal */}
      <SnoozeModal
        visible={snoozeModalVisible}
        onClose={() => setSnoozeModalVisible(false)}
        onSnooze={handleSnoozeConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: {
    fontSize: FontSizes.sm,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
  },
  countBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  countText: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xxl,
  },
  emptyContent: {
    flex: 1,
  },
});
