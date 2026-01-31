import * as NotificationService from "@/services/notifications";
import * as Storage from "@/services/storage";
import * as Supabase from "@/services/supabase";
import {
    DEFAULT_USER_PREFERENCES,
    Reminder,
    UserPreferences,
} from "@/types/reminder";
import { addDays, isToday, parseISO, startOfDay } from "date-fns";
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
  isSyncing: boolean;
  isCloudEnabled: boolean;
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
  // Refresh & Sync
  refresh: () => Promise<void>;
  syncNow: () => Promise<void>;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCloudEnabled, setIsCloudEnabled] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadData();
    setupNotifications();
    initializeCloudSync();
  }, []);

  const initializeCloudSync = async () => {
    if (!Supabase.isSupabaseConfigured()) {
      console.log("Supabase not configured - running in local-only mode");
      return;
    }

    try {
      // Sign in anonymously
      const user = await Supabase.signInAnonymously();
      if (user) {
        setIsCloudEnabled(true);
        console.log("Cloud sync enabled for user:", user.id);

        // Initial sync from cloud
        await syncFromCloud();

        // Subscribe to real-time changes
        Supabase.subscribeToReminders(
          handleRemoteInsert,
          handleRemoteUpdate,
          handleRemoteDelete,
        );
      }
    } catch (error) {
      console.error("Error initializing cloud sync:", error);
    }
  };

  const handleRemoteInsert = useCallback((reminder: Reminder) => {
    setReminders((prev) => {
      // Check if we already have this reminder (by syncId)
      if (prev.some((r) => r.syncId === reminder.syncId)) {
        return prev;
      }
      return [...prev, reminder];
    });
  }, []);

  const handleRemoteUpdate = useCallback((reminder: Reminder) => {
    setReminders((prev) =>
      prev.map((r) =>
        r.syncId === reminder.syncId ? { ...r, ...reminder } : r,
      ),
    );
  }, []);

  const handleRemoteDelete = useCallback((syncId: string) => {
    setReminders((prev) => prev.filter((r) => r.syncId !== syncId));
  }, []);

  const syncFromCloud = async () => {
    if (!isCloudEnabled && !Supabase.isSupabaseConfigured()) return;

    try {
      setIsSyncing(true);
      const cloudReminders = await Supabase.fetchRemindersFromCloud();

      if (cloudReminders.length > 0) {
        // Merge cloud reminders with local (cloud wins for conflicts)
        setReminders((prev) => {
          const localMap = new Map(prev.map((r) => [r.syncId || r.id, r]));

          for (const cloudReminder of cloudReminders) {
            const key = cloudReminder.syncId || cloudReminder.id;
            const local = localMap.get(key);

            if (
              !local ||
              new Date(cloudReminder.updatedAt) > new Date(local.updatedAt)
            ) {
              localMap.set(key, cloudReminder);
            }
          }

          return Array.from(localMap.values());
        });
      }
    } catch (error) {
      console.error("Error syncing from cloud:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToCloud = async (reminder: Reminder) => {
    if (!isCloudEnabled) return;

    try {
      await Supabase.upsertReminderToCloud(reminder);
    } catch (error) {
      console.error("Error syncing to cloud:", error);
    }
  };

  const syncNow = useCallback(async () => {
    if (!Supabase.isSupabaseConfigured()) return;

    setIsSyncing(true);
    try {
      // Push all local reminders to cloud
      await Supabase.syncRemindersToCloud(reminders);
      // Pull any remote changes
      await syncFromCloud();
    } catch (error) {
      console.error("Error during manual sync:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [reminders]);

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

      // Sync to cloud
      syncToCloud(newReminder);

      return newReminder;
    },
    [isCloudEnabled],
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

        // Sync to cloud
        syncToCloud(updated);
      }
    },
    [isCloudEnabled],
  );

  const deleteReminderHandler = useCallback(
    async (id: string) => {
      const reminder = reminders.find((r) => r.id === id);
      if (reminder?.notificationId) {
        await NotificationService.cancelNotification(reminder.notificationId);
      }

      // Delete from cloud first (need syncId before local delete)
      if (reminder?.syncId && isCloudEnabled) {
        await Supabase.deleteReminderFromCloud(reminder.syncId);
      }

      await Storage.deleteReminder(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
    },
    [reminders, isCloudEnabled],
  );

  const completeReminderHandler = useCallback(
    async (id: string) => {
      const reminder = reminders.find((r) => r.id === id);
      if (reminder?.notificationId) {
        await NotificationService.cancelNotification(reminder.notificationId);
      }
      const updated = await Storage.completeReminder(id);
      const completedReminder = {
        ...reminder!,
        isCompleted: true,
        completedAt: new Date().toISOString(),
      };
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? completedReminder : r)),
      );

      // Sync to cloud
      if (updated) syncToCloud(updated);
    },
    [reminders, isCloudEnabled],
  );

  const uncompleteReminderHandler = useCallback(
    async (id: string) => {
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

        // Sync to cloud
        syncToCloud(updated);
      }
    },
    [isCloudEnabled],
  );

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

        // Sync to cloud
        syncToCloud(updated);
      }
    },
    [isCloudEnabled],
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
        isSyncing,
        isCloudEnabled,
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
        syncNow,
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
