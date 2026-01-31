import * as NotificationService from "@/services/notifications";
import * as Storage from "@/services/storage";
import {
    DEFAULT_USER_PREFERENCES,
    Reminder,
    UserPreferences
} from "@/types/reminder";
import {
    addDays,
    isToday,
    parseISO,
    startOfDay
} from "date-fns";
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useState,
} from "react";

interface RemindersContextType {
  reminders: Reminder[];
  isLoading: boolean;
  preferences: UserPreferences;
  // CRUD operations
  addReminder: (
    reminder: Omit<Reminder, "id" | "createdAt" | "updatedAt" | "syncId">,
  ) => Promise<Reminder>;
  updateReminder: (id: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  completeReminder: (id: string) => Promise<void>;
  uncompleteReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, minutes: number) => Promise<void>;
  // Filtered lists
  todayReminders: Reminder[];
  upcomingReminders: Reminder[];
  completedReminders: Reminder[];
  overdueReminders: Reminder[];
  // Preferences
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  // Refresh
  refresh: () => Promise<void>;
}

const RemindersContext = createContext<RemindersContextType | undefined>(
  undefined,
);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(
    DEFAULT_USER_PREFERENCES,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadData();
    setupNotifications();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [loadedReminders, loadedPreferences] = await Promise.all([
        Storage.getReminders(),
        Storage.getPreferences(),
      ]);
      setReminders(loadedReminders);
      setPreferences(loadedPreferences);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupNotifications = async () => {
    await NotificationService.requestNotificationPermissions();

    // Handle notification responses
    NotificationService.addNotificationResponseListener(async (response) => {
      const { reminderId } = response.notification.request.content.data as {
        reminderId?: string;
      };
      const actionId = response.actionIdentifier;

      if (!reminderId) return;

      if (actionId === "done") {
        await completeReminderHandler(reminderId);
      } else {
        const snoozeMinutes =
          NotificationService.getSnoozeMinutesFromAction(actionId);
        if (snoozeMinutes) {
          await snoozeReminderHandler(reminderId, snoozeMinutes);
        }
      }
    });
  };

  const refresh = useCallback(async () => {
    await loadData();
  }, []);

  const addReminderHandler = useCallback(
    async (
      reminder: Omit<Reminder, "id" | "createdAt" | "updatedAt" | "syncId">,
    ): Promise<Reminder> => {
      const newReminder = await Storage.addReminder(reminder);

      // Schedule notification
      const notificationId =
        await NotificationService.scheduleReminderNotification(newReminder);
      if (notificationId) {
        await Storage.updateReminder(newReminder.id, { notificationId });
        newReminder.notificationId = notificationId;
      }

      setReminders((prev) => [...prev, newReminder]);
      return newReminder;
    },
    [],
  );

  const updateReminderHandler = useCallback(
    async (id: string, updates: Partial<Reminder>) => {
      const updated = await Storage.updateReminder(id, updates);
      if (updated) {
        // Reschedule notification if datetime changed
        if (updates.datetime || updates.snoozedUntil) {
          const notificationId =
            await NotificationService.scheduleReminderNotification(updated);
          if (notificationId) {
            await Storage.updateReminder(id, { notificationId });
            updated.notificationId = notificationId;
          }
        }
        setReminders((prev) => prev.map((r) => (r.id === id ? updated : r)));
      }
    },
    [],
  );

  const deleteReminderHandler = useCallback(
    async (id: string) => {
      const reminder = reminders.find((r) => r.id === id);
      if (reminder?.notificationId) {
        await NotificationService.cancelNotification(reminder.notificationId);
      }
      await Storage.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    },
    [reminders],
  );

  const completeReminderHandler = useCallback(
    async (id: string) => {
      const reminder = reminders.find((r) => r.id === id);
      if (reminder?.notificationId) {
        await NotificationService.cancelNotification(reminder.notificationId);
      }
      await Storage.completeReminder(id);
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, isCompleted: true, completedAt: new Date().toISOString() }
            : r,
        ),
      );
    },
    [reminders],
  );

  const uncompleteReminderHandler = useCallback(async (id: string) => {
    const updated = await Storage.updateReminder(id, {
      isCompleted: false,
      completedAt: undefined,
    });
    if (updated) {
      // Reschedule notification
      const notificationId =
        await NotificationService.scheduleReminderNotification(updated);
      if (notificationId) {
        await Storage.updateReminder(id, { notificationId });
      }
      setReminders((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                isCompleted: false,
                completedAt: undefined,
                notificationId: notificationId || undefined,
              }
            : r,
        ),
      );
    }
  }, []);

  const snoozeReminderHandler = useCallback(
    async (id: string, minutes: number) => {
      const snoozedUntil = new Date(
        Date.now() + minutes * 60 * 1000,
      ).toISOString();
      const updated = await Storage.updateReminder(id, { snoozedUntil });
      if (updated) {
        const notificationId =
          await NotificationService.scheduleReminderNotification(updated);
        if (notificationId) {
          await Storage.updateReminder(id, { notificationId });
        }
        setReminders((prev) =>
          prev.map((r) =>
            r.id === id
              ? {
                  ...r,
                  snoozedUntil,
                  notificationId: notificationId || undefined,
                }
              : r,
          ),
        );
      }
    },
    [],
  );

  const updatePreferencesHandler = useCallback(
    async (updates: Partial<UserPreferences>) => {
      const updated = { ...preferences, ...updates };
      await Storage.savePreferences(updated);
      setPreferences(updated);
    },
    [preferences],
  );

  // Computed filtered lists
  const activeReminders = reminders.filter((r) => !r.isCompleted);
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = startOfDay(addDays(now, 1));

  const todayReminders = activeReminders
    .filter((r) => {
      const date = parseISO(r.snoozedUntil || r.datetime);
      return isToday(date);
    })
    .sort(
      (a, b) =>
        parseISO(a.snoozedUntil || a.datetime).getTime() -
        parseISO(b.snoozedUntil || b.datetime).getTime(),
    );

  const upcomingReminders = activeReminders
    .filter((r) => {
      const date = parseISO(r.snoozedUntil || r.datetime);
      return date >= tomorrowStart;
    })
    .sort(
      (a, b) =>
        parseISO(a.snoozedUntil || a.datetime).getTime() -
        parseISO(b.snoozedUntil || b.datetime).getTime(),
    );

  const overdueReminders = activeReminders
    .filter((r) => {
      const date = parseISO(r.snoozedUntil || r.datetime);
      return date < todayStart;
    })
    .sort(
      (a, b) =>
        parseISO(b.snoozedUntil || b.datetime).getTime() -
        parseISO(a.snoozedUntil || a.datetime).getTime(),
    );

  const completedReminders = reminders
    .filter((r) => r.isCompleted)
    .sort(
      (a, b) =>
        parseISO(b.completedAt || b.updatedAt).getTime() -
        parseISO(a.completedAt || a.updatedAt).getTime(),
    );

  return (
    <RemindersContext.Provider
      value={{
        reminders,
        isLoading,
        preferences,
        addReminder: addReminderHandler,
        updateReminder: updateReminderHandler,
        deleteReminder: deleteReminderHandler,
        completeReminder: completeReminderHandler,
        uncompleteReminder: uncompleteReminderHandler,
        snoozeReminder: snoozeReminderHandler,
        todayReminders,
        upcomingReminders,
        completedReminders,
        overdueReminders,
        updatePreferences: updatePreferencesHandler,
        refresh,
      }}
    >
      {children}
    </RemindersContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(RemindersContext);
  if (context === undefined) {
    throw new Error("useReminders must be used within a RemindersProvider");
  }
  return context;
}
