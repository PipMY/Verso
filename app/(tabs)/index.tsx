import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeOut,
    Layout,
} from "react-native-reanimated";
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

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const {
    isLoading,
    todayReminders,
    upcomingReminders,
    overdueReminders,
    completedReminders,
    completeReminder,
    uncompleteReminder,
    deleteReminder,
    snoozeReminder,
    refresh,
  } = useReminders();

  const [refreshing, setRefreshing] = useState(false);
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(
    null,
  );
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Filter reminders by search query
  const filterReminders = useCallback(
    (reminders: Reminder[]) => {
      if (!searchQuery.trim()) return reminders;
      const query = searchQuery.toLowerCase();
      return reminders.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.notes?.toLowerCase().includes(query),
      );
    },
    [searchQuery],
  );

  const filteredToday = useMemo(
    () => filterReminders(todayReminders),
    [filterReminders, todayReminders],
  );
  const filteredUpcoming = useMemo(
    () => filterReminders(upcomingReminders),
    [filterReminders, upcomingReminders],
  );
  const filteredOverdue = useMemo(
    () => filterReminders(overdueReminders),
    [filterReminders, overdueReminders],
  );
  const filteredCompleted = useMemo(
    () => filterReminders(completedReminders),
    [filterReminders, completedReminders],
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

  const handleDelete = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await deleteReminder(id);
  };

  const handleUncomplete = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await uncompleteReminder(id);
  };

  const toggleSearch = () => {
    Haptics.selectionAsync();
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery("");
    }
  };

  const hasReminders =
    todayReminders.length > 0 ||
    upcomingReminders.length > 0 ||
    overdueReminders.length > 0;

  const hasFilteredResults =
    filteredToday.length > 0 ||
    filteredUpcoming.length > 0 ||
    filteredOverdue.length > 0 ||
    filteredCompleted.length > 0;

  const today = new Date();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View
        entering={FadeIn.duration(500)}
        style={[styles.header, { paddingTop: insets.top + Spacing.md }]}
      >
        <View>
          <Text style={[styles.greeting, { color: colors.textMuted }]}>
            {format(today, "EEEE, MMMM d")}
          </Text>
          <Text style={[styles.title, { color: colors.text }]}>
            Your Reminders
          </Text>
        </View>
        <Pressable
          style={[
            styles.headerButton,
            {
              backgroundColor: showSearch
                ? Brand.primary
                : colors.backgroundSecondary,
            },
          ]}
          onPress={toggleSearch}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={showSearch ? "#fff" : colors.text}
          />
        </Pressable>
      </Animated.View>

      {/* Search Bar */}
      {showSearch && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          exiting={FadeOut.duration(200)}
          style={[
            styles.searchContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search reminders..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textMuted}
              />
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* Stats bar */}
      {hasReminders && (
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={[
            styles.statsBar,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Brand.error }]}>
              {overdueReminders.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Overdue
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.separator }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Brand.primary }]}>
              {todayReminders.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Today
            </Text>
          </View>
          <View
            style={[styles.statDivider, { backgroundColor: colors.separator }]}
          />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: Brand.secondary }]}>
              {upcomingReminders.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Upcoming
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Main content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          !hasReminders && !searchQuery && styles.emptyContent,
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
        {!hasReminders && !isLoading && !searchQuery ? (
          <EmptyState
            icon="notifications-outline"
            title="No Reminders Yet"
            description="Add your first reminder to get started. Tap the + button below to create one."
            actionLabel="Add Reminder"
            onAction={handleAddReminder}
          />
        ) : searchQuery && !hasFilteredResults ? (
          <EmptyState
            icon="search-outline"
            title="No Results"
            description={`No reminders found matching "${searchQuery}"`}
          />
        ) : (
          <>
            {/* Overdue Section */}
            {filteredOverdue.length > 0 && (
              <Animated.View
                entering={FadeInDown.duration(400).delay(150)}
                layout={Layout.springify()}
              >
                <SectionHeader
                  title="Overdue"
                  count={filteredOverdue.length}
                  icon="alert-circle"
                  iconColor={Brand.error}
                />
                {filteredOverdue.map((reminder, index) => (
                  <Animated.View
                    key={reminder.id}
                    entering={FadeInDown.duration(300).delay(index * 50)}
                  >
                    <ReminderCard
                      reminder={reminder}
                      onPress={() => handleReminderPress(reminder)}
                      onComplete={() => completeReminder(reminder.id)}
                      onSnooze={() => handleSnooze(reminder)}
                      onDelete={() => handleDelete(reminder.id)}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {/* Today Section */}
            {filteredToday.length > 0 && (
              <Animated.View
                entering={FadeInDown.duration(400).delay(200)}
                layout={Layout.springify()}
              >
                <SectionHeader
                  title="Today"
                  count={filteredToday.length}
                  icon="today"
                  iconColor={Brand.primary}
                />
                {filteredToday.map((reminder, index) => (
                  <Animated.View
                    key={reminder.id}
                    entering={FadeInDown.duration(300).delay(index * 50)}
                  >
                    <ReminderCard
                      reminder={reminder}
                      onPress={() => handleReminderPress(reminder)}
                      onComplete={() => completeReminder(reminder.id)}
                      onSnooze={() => handleSnooze(reminder)}
                      onDelete={() => handleDelete(reminder.id)}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {/* Upcoming Section */}
            {filteredUpcoming.length > 0 && (
              <Animated.View
                entering={FadeInDown.duration(400).delay(250)}
                layout={Layout.springify()}
              >
                <SectionHeader
                  title="Upcoming"
                  count={filteredUpcoming.length}
                  icon="calendar"
                  iconColor={Brand.secondary}
                />
                {filteredUpcoming.slice(0, 10).map((reminder, index) => (
                  <Animated.View
                    key={reminder.id}
                    entering={FadeInDown.duration(300).delay(index * 50)}
                  >
                    <ReminderCard
                      reminder={reminder}
                      onPress={() => handleReminderPress(reminder)}
                      onComplete={() => completeReminder(reminder.id)}
                      onSnooze={() => handleSnooze(reminder)}
                      onDelete={() => handleDelete(reminder.id)}
                    />
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            {/* Completed Section (Collapsible) */}
            {filteredCompleted.length > 0 && (
              <Animated.View
                entering={FadeInDown.duration(400).delay(300)}
                layout={Layout.springify()}
              >
                <SectionHeader
                  title="Completed"
                  count={filteredCompleted.length}
                  icon="checkmark-circle"
                  iconColor={Brand.success}
                  collapsed={!showCompleted}
                  onToggle={() => setShowCompleted(!showCompleted)}
                />
                {showCompleted &&
                  filteredCompleted.slice(0, 5).map((reminder, index) => (
                    <Animated.View
                      key={reminder.id}
                      entering={FadeInDown.duration(300).delay(index * 50)}
                      exiting={FadeOut.duration(200)}
                    >
                      <ReminderCard
                        reminder={reminder}
                        onPress={() => handleReminderPress(reminder)}
                        onComplete={() => {}}
                        onSnooze={() => handleSnooze(reminder)}
                        onDelete={() => handleDelete(reminder.id)}
                        onUncomplete={() => handleUncomplete(reminder.id)}
                      />
                    </Animated.View>
                  ))}
              </Animated.View>
            )}

            {/* Bottom padding for FAB */}
            <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <FloatingActionButton onPress={handleAddReminder} />

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
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  statsBar: {
    flexDirection: "row",
    marginHorizontal: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: "100%",
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
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: FontSizes.md,
  },
});
