import * as NotifeeService from "@/services/notifee";
import {
  addCustomerInfoListener,
  getFeatureAccess,
  getSubscriptionStatus,
  initializeRevenueCat,
} from "@/services/revenuecat";
import * as Storage from "@/services/storage";
import * as Supabase from "@/services/supabase";
import {
  CustomRecurrencePreset,
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
  useRef,
  useState,
} from "react";

// Merge custom recurrence presets from local and cloud
// Keeps all unique presets, takes highest usage count for duplicates
function mergeCustomPresets(
  local: CustomRecurrencePreset[],
  cloud: CustomRecurrencePreset[],
): CustomRecurrencePreset[] {
  const map = new Map<string, CustomRecurrencePreset>();

  for (const preset of local) {
    map.set(preset.id, preset);
  }

  for (const preset of cloud) {
    const existing = map.get(preset.id);
    if (!existing) {
      map.set(preset.id, preset);
    } else {
      // Keep the one with higher usage count
      map.set(preset.id, {
        ...preset,
        usageCount: Math.max(existing.usageCount, preset.usageCount),
      });
    }
  }

  return Array.from(map.values());
}

interface RemindersContextType {
  reminders: Reminder[];
  isLoading: boolean;
  isSyncing: boolean;
  isCloudEnabled: boolean;
  isProUser: boolean;
  featureAccess: ReturnType<typeof getFeatureAccess>;
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
  // Bulk operations
  clearCompleted: () => Promise<void>;
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
  const [isProUser, setIsProUser] = useState(false);
  const [featureAccess, setFeatureAccess] = useState(getFeatureAccess(false));

  // Use refs for handlers that need access to latest state
  const remindersRef = useRef<Reminder[]>([]);
  const isCloudEnabledRef = useRef(false);
  const hasInitializedCloudSyncRef = useRef(false);

  // Keep refs in sync with state
  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  useEffect(() => {
    isCloudEnabledRef.current = isCloudEnabled;
  }, [isCloudEnabled]);

  // Load data on mount
  useEffect(() => {
    loadData();
    setupNotifications();
    let unsubscribe = () => {};

    (async () => {
      try {
        await initializeRevenueCat();
        const status = await getSubscriptionStatus();
        const access = getFeatureAccess(status.isProUser);
        setIsProUser(status.isProUser);
        setFeatureAccess(access);

        if (access.cloudSync) {
          await initializeCloudSyncIfNeeded(true);
        }

        unsubscribe = addCustomerInfoListener(async () => {
          const updatedStatus = await getSubscriptionStatus();
          const updatedAccess = getFeatureAccess(updatedStatus.isProUser);
          setIsProUser(updatedStatus.isProUser);
          setFeatureAccess(updatedAccess);

          if (updatedAccess.cloudSync) {
            await initializeCloudSyncIfNeeded(true);
          } else {
            setIsCloudEnabled(false);
          }
        });
      } catch (error) {
        console.log("RevenueCat not available", error);
      }
    })();

    return () => {
      try {
        unsubscribe();
      } catch {}
    };
  }, []);

  const initializeCloudSyncIfNeeded = async (allowCloudSync: boolean) => {
    if (!allowCloudSync || hasInitializedCloudSyncRef.current) return;
    hasInitializedCloudSyncRef.current = true;
    await initializeCloudSync();
  };

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

        // Initial sync from cloud - fetch and merge
        const cloudReminders = await Supabase.fetchRemindersFromCloud();
        console.log("Fetched", cloudReminders.length, "reminders from cloud");

        if (cloudReminders.length > 0) {
          setReminders((prev) => {
            const mergedMap = new Map<string, Reminder>();

            // Add local reminders first
            for (const r of prev) {
              mergedMap.set(r.syncId || r.id, r);
            }

            // Merge cloud reminders (cloud wins on conflict)
            for (const cloudReminder of cloudReminders) {
              const key = cloudReminder.syncId || cloudReminder.id;
              const local = mergedMap.get(key);

              if (
                !local ||
                new Date(cloudReminder.updatedAt) > new Date(local.updatedAt)
              ) {
                mergedMap.set(key, cloudReminder);
              }
            }

            const merged = Array.from(mergedMap.values());
            console.log("Merged to", merged.length, "total reminders");

            // Save merged data to local storage
            Storage.saveReminders(merged);

            return merged;
          });
        }

        // Fetch preferences from cloud and merge
        try {
          const cloudPrefs = await Supabase.fetchPreferencesFromCloud();
          if (cloudPrefs) {
            // Merge: cloud custom presets win, combine usage counts
            const localPrefs = await Storage.getPreferences();
            const mergedPresets = mergeCustomPresets(
              localPrefs.customRecurrencePresets || [],
              cloudPrefs.customRecurrencePresets || [],
            );
            const mergedPrefs = {
              ...localPrefs,
              ...cloudPrefs,
              customRecurrencePresets: mergedPresets,
            };
            await Storage.savePreferences(mergedPrefs);
            setPreferences(mergedPrefs);
            console.log("Preferences synced from cloud");
          } else {
            // No cloud prefs yet — push local prefs up
            const localPrefs = await Storage.getPreferences();
            await Supabase.upsertPreferencesToCloud(localPrefs);
            console.log("Local preferences pushed to cloud");
          }
        } catch (error) {
          console.log("Preferences cloud fetch unavailable");
        }

        // Push all local reminders to cloud (assigns syncIds to old ones)
        const currentReminders = await Storage.getReminders();
        const updatedReminders =
          await Supabase.syncRemindersToCloud(currentReminders);
        if (updatedReminders) {
          await Storage.saveReminders(updatedReminders);
          setReminders(updatedReminders);
          console.log("Pushed local reminders to cloud with syncIds assigned");
        }

        // Subscribe to real-time changes
        Supabase.subscribeToReminders(
          handleRemoteInsert,
          handleRemoteUpdate,
          handleRemoteDelete,
        );
      }
    } catch (error) {
      // Silently handle network errors - app works offline
      console.log("Cloud sync unavailable - working offline");
    }
  };

  const handleRemoteInsert = useCallback((reminder: Reminder) => {
    console.log("Remote insert received:", reminder.title);
    setReminders((prev) => {
      // Check if we already have this reminder (by syncId or id)
      if (
        prev.some((r) => r.syncId === reminder.syncId || r.id === reminder.id)
      ) {
        console.log("Reminder already exists locally, skipping");
        return prev;
      }
      console.log("Adding remote reminder to local state");
      // Also save to local storage
      const updated = [...prev, reminder];
      Storage.saveReminders(updated);
      return updated;
    });
  }, []);

  const handleRemoteUpdate = useCallback((reminder: Reminder) => {
    console.log("Remote update received:", reminder.title);
    setReminders((prev) => {
      const updated = prev.map((r) =>
        r.syncId === reminder.syncId || r.id === reminder.id
          ? { ...r, ...reminder }
          : r,
      );
      Storage.saveReminders(updated);
      return updated;
    });
  }, []);

  const handleRemoteDelete = useCallback((syncId: string) => {
    console.log("Remote delete received:", syncId);
    setReminders((prev) => {
      const updated = prev.filter(
        (r) => r.syncId !== syncId && r.id !== syncId,
      );
      Storage.saveReminders(updated);
      return updated;
    });
  }, []);

  const syncFromCloud = async () => {
    if (!featureAccess.cloudSync) return;
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
      // Silently handle - app works offline
      console.log("Cloud fetch unavailable - using local data");
    } finally {
      setIsSyncing(false);
    }
  };

  const syncToCloud = async (reminder: Reminder) => {
    // Only sync if cloud is enabled
    if (!featureAccess.cloudSync || !isCloudEnabled) return;

    try {
      const syncId = await Supabase.upsertReminderToCloud(reminder);
      // If we got a new syncId back, save it to the reminder
      if (syncId && syncId !== reminder.syncId) {
        await Storage.updateReminder(reminder.id, { syncId });
        setReminders((prev) =>
          prev.map((r) => (r.id === reminder.id ? { ...r, syncId } : r)),
        );
      }
    } catch (error) {
      // Silently fail - data is saved locally, will sync when online
      console.log("Cloud sync deferred - working offline");
    }
  };

  const syncNow = useCallback(async () => {
    if (!featureAccess.cloudSync) return;
    if (!Supabase.isSupabaseConfigured()) return;

    setIsSyncing(true);
    try {
      // Push all local reminders to cloud (returns reminders with syncIds assigned)
      const updatedReminders = await Supabase.syncRemindersToCloud(reminders);
      if (updatedReminders) {
        // Save updated syncIds back locally
        setReminders(updatedReminders);
        await Storage.saveReminders(updatedReminders);
      }
      // Push preferences to cloud
      await Supabase.upsertPreferencesToCloud(preferences);
      // Pull any remote changes
      await syncFromCloud();
      // Pull preferences from cloud
      const cloudPrefs = await Supabase.fetchPreferencesFromCloud();
      if (cloudPrefs) {
        const mergedPresets = mergeCustomPresets(
          preferences.customRecurrencePresets || [],
          cloudPrefs.customRecurrencePresets || [],
        );
        const mergedPrefs = {
          ...preferences,
          ...cloudPrefs,
          customRecurrencePresets: mergedPresets,
        };
        await Storage.savePreferences(mergedPrefs);
        setPreferences(mergedPrefs);
      }
    } catch (error) {
      console.log("Sync failed - will retry when online");
    } finally {
      setIsSyncing(false);
    }
  }, [reminders, preferences, featureAccess]);

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
    await NotifeeService.setupNotifications();

    // Set up Notifee event handlers with refs for latest state access
    NotifeeService.setupNotificationEventHandler({
      onSnooze: async (
        reminderId: string,
        minutes: number,
        title: string,
        notes?: string,
      ) => {
        console.log(`Snoozing ${reminderId} for ${minutes} minutes`);

        // Update the reminder's snoozed time
        const snoozedUntil = new Date(
          Date.now() + minutes * 60 * 1000,
        ).toISOString();
        const updated = await Storage.updateReminder(reminderId, {
          snoozedUntil,
        });

        if (updated) {
          setReminders((prev) =>
            prev.map((r) => (r.id === reminderId ? { ...r, snoozedUntil } : r)),
          );

          // Schedule new notification
          await NotifeeService.scheduleSnoozeNotification(
            reminderId,
            title,
            notes,
            minutes,
          );

          // Sync to cloud if enabled
          if (isCloudEnabledRef.current) {
            await Supabase.upsertReminderToCloud(updated);
          }
        }
      },

      onDone: async (reminderId: string) => {
        console.log(`Completing reminder ${reminderId} from notification`);

        const updated = await Storage.completeReminder(reminderId);
        if (updated) {
          setReminders((prev) =>
            prev.map((r) =>
              r.id === reminderId
                ? {
                    ...r,
                    isCompleted: true,
                    completedAt: new Date().toISOString(),
                  }
                : r,
            ),
          );

          // Sync to cloud if enabled
          if (isCloudEnabledRef.current) {
            await Supabase.upsertReminderToCloud(updated);
          }
        }
      },

      onTap: (reminderId: string) => {
        console.log(`User tapped notification for ${reminderId}`);
        // Could navigate to reminder detail here if needed
        NotifeeService.clearBadgeCount();
      },
    });
  };

  const refresh = useCallback(async () => {
    await loadData();
  }, []);

  const addReminderHandler = useCallback(
    async (
      reminder: Omit<Reminder, "id" | "createdAt" | "updatedAt" | "syncId">,
    ): Promise<Reminder> => {
      if (
        featureAccess.maxReminders !== Infinity &&
        remindersRef.current.length >= featureAccess.maxReminders
      ) {
        throw new Error("LIMIT_REACHED");
      }

      const newReminder = await Storage.addReminder(reminder);

      // Schedule notification
      const notificationId =
        await NotifeeService.scheduleReminderNotification(newReminder);
      if (notificationId) {
        await Storage.updateReminder(newReminder.id, { notificationId });
        newReminder.notificationId = notificationId;
      }

      setReminders((prev) => [...prev, newReminder]);

      // Sync to cloud
      syncToCloud(newReminder);

      return newReminder;
    },
    [featureAccess, isCloudEnabled],
  );

  const updateReminderHandler = useCallback(
    async (id: string, updates: Partial<Reminder>) => {
      const updated = await Storage.updateReminder(id, updates);
      if (updated) {
        // Reschedule notification if datetime changed
        if (updates.datetime || updates.snoozedUntil) {
          const notificationId =
            await NotifeeService.scheduleReminderNotification(updated);
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
        await NotifeeService.cancelNotification(reminder.notificationId);
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
        await NotifeeService.cancelNotification(reminder.notificationId);
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
          await NotifeeService.scheduleReminderNotification(updated);
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
          await NotifeeService.scheduleReminderNotification(updated);
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

  const clearCompletedHandler = useCallback(async () => {
    const completed = reminders.filter((r) => r.isCompleted);

    // Cancel any notifications for completed reminders
    for (const r of completed) {
      if (r.notificationId) {
        await NotifeeService.cancelNotification(r.notificationId);
      }
    }

    // Delete from cloud
    if (isCloudEnabled) {
      for (const r of completed) {
        if (r.syncId) {
          await Supabase.deleteReminderFromCloud(r.syncId);
        }
      }
    }

    // Remove from local storage and state
    const remaining = reminders.filter((r) => !r.isCompleted);
    await Storage.saveReminders(remaining);
    setReminders(remaining);
  }, [reminders, isCloudEnabled]);

  const updatePreferencesHandler = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (
        updates.customRecurrencePresets &&
        !featureAccess.unlimitedRecurrence
      ) {
        throw new Error("PRO_REQUIRED");
      }
      const updated = { ...preferences, ...updates };
      await Storage.savePreferences(updated);
      setPreferences(updated);

      // Sync preferences to cloud
      if (isCloudEnabled) {
        try {
          await Supabase.upsertPreferencesToCloud(updated);
        } catch (error) {
          console.log("Preferences cloud sync deferred - working offline");
        }
      }
    },
    [preferences, isCloudEnabled, featureAccess],
  );

  // Computed filtered lists
  const activeReminders = reminders.filter((r) => !r.isCompleted && r.datetime);
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = startOfDay(addDays(now, 1));

  // Debug: log reminder counts
  console.log(
    "Total reminders:",
    reminders.length,
    "Active with datetime:",
    activeReminders.length,
  );

  const todayReminders = activeReminders
    .filter((r) => {
      try {
        const date = parseISO(r.snoozedUntil || r.datetime);
        return isToday(date);
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) =>
        parseISO(a.snoozedUntil || a.datetime).getTime() -
        parseISO(b.snoozedUntil || b.datetime).getTime(),
    );

  const upcomingReminders = activeReminders
    .filter((r) => {
      try {
        const date = parseISO(r.snoozedUntil || r.datetime);
        return date >= tomorrowStart;
      } catch {
        return false;
      }
    })
    .sort(
      (a, b) =>
        parseISO(a.snoozedUntil || a.datetime).getTime() -
        parseISO(b.snoozedUntil || b.datetime).getTime(),
    );

  const overdueReminders = activeReminders
    .filter((r) => {
      try {
        const date = parseISO(r.snoozedUntil || r.datetime);
        return date < todayStart;
      } catch {
        return false;
      }
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
        isProUser,
        featureAccess,
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
        clearCompleted: clearCompletedHandler,
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
