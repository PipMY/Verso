import {
    DEFAULT_USER_PREFERENCES,
    Reminder,
    ReminderList,
    SyncState,
    UserPreferences,
} from "@/types/reminder";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEYS = {
  REMINDERS: "verso_reminders",
  LISTS: "verso_lists",
  PREFERENCES: "verso_preferences",
  SYNC_STATE: "verso_sync_state",
  DEVICE_ID: "verso_device_id",
};

// Device ID management
export async function getDeviceId(): Promise<string> {
  let deviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  if (!deviceId) {
    deviceId = uuidv4();
    await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }
  return deviceId;
}

// Reminder CRUD operations
export async function getReminders(): Promise<Reminder[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error getting reminders:", error);
    return [];
  }
}

export async function saveReminders(reminders: Reminder[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.REMINDERS,
      JSON.stringify(reminders),
    );
  } catch (error) {
    console.error("Error saving reminders:", error);
    throw error;
  }
}

export async function addReminder(
  reminder: Omit<Reminder, "id" | "createdAt" | "updatedAt" | "syncId">,
): Promise<Reminder> {
  const reminders = await getReminders();
  const now = new Date().toISOString();
  const deviceId = await getDeviceId();

  const newReminder: Reminder = {
    ...reminder,
    id: uuidv4(),
    syncId: uuidv4(),
    deviceId,
    createdAt: now,
    updatedAt: now,
  };

  reminders.push(newReminder);
  await saveReminders(reminders);
  return newReminder;
}

export async function updateReminder(
  id: string,
  updates: Partial<Reminder>,
): Promise<Reminder | null> {
  const reminders = await getReminders();
  const index = reminders.findIndex((r) => r.id === id);

  if (index === -1) return null;

  const updatedReminder: Reminder = {
    ...reminders[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  reminders[index] = updatedReminder;
  await saveReminders(reminders);
  return updatedReminder;
}

export async function deleteReminder(id: string): Promise<boolean> {
  const reminders = await getReminders();
  const filtered = reminders.filter((r) => r.id !== id);

  if (filtered.length === reminders.length) return false;

  await saveReminders(filtered);
  return true;
}

export async function completeReminder(id: string): Promise<Reminder | null> {
  return updateReminder(id, {
    isCompleted: true,
    completedAt: new Date().toISOString(),
  });
}

export async function snoozeReminder(
  id: string,
  minutes: number,
): Promise<Reminder | null> {
  const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  return updateReminder(id, { snoozedUntil });
}

// Lists CRUD operations
export async function getLists(): Promise<ReminderList[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.LISTS);
    return data ? JSON.parse(data) : getDefaultLists();
  } catch (error) {
    console.error("Error getting lists:", error);
    return getDefaultLists();
  }
}

function getDefaultLists(): ReminderList[] {
  return [
    {
      id: "default",
      name: "Reminders",
      color: "#8B5CF6",
      icon: "bell",
      reminderIds: [],
      createdAt: new Date().toISOString(),
    },
  ];
}

export async function saveLists(lists: ReminderList[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LISTS, JSON.stringify(lists));
  } catch (error) {
    console.error("Error saving lists:", error);
    throw error;
  }
}

// User preferences
export async function getPreferences(): Promise<UserPreferences> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PREFERENCES);
    return data
      ? { ...DEFAULT_USER_PREFERENCES, ...JSON.parse(data) }
      : DEFAULT_USER_PREFERENCES;
  } catch (error) {
    console.error("Error getting preferences:", error);
    return DEFAULT_USER_PREFERENCES;
  }
}

export async function savePreferences(
  preferences: UserPreferences,
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.PREFERENCES,
      JSON.stringify(preferences),
    );
  } catch (error) {
    console.error("Error saving preferences:", error);
    throw error;
  }
}

// Sync state management
export async function getSyncState(): Promise<SyncState> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SYNC_STATE);
    const deviceId = await getDeviceId();
    return data
      ? { ...JSON.parse(data), deviceId }
      : { deviceId, syncEnabled: false };
  } catch (error) {
    console.error("Error getting sync state:", error);
    const deviceId = await getDeviceId();
    return { deviceId, syncEnabled: false };
  }
}

export async function updateSyncState(
  updates: Partial<SyncState>,
): Promise<void> {
  try {
    const current = await getSyncState();
    await AsyncStorage.setItem(
      STORAGE_KEYS.SYNC_STATE,
      JSON.stringify({ ...current, ...updates }),
    );
  } catch (error) {
    console.error("Error updating sync state:", error);
    throw error;
  }
}

// Clear all data (for testing/reset)
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.REMINDERS,
      STORAGE_KEYS.LISTS,
      STORAGE_KEYS.PREFERENCES,
      STORAGE_KEYS.SYNC_STATE,
    ]);
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}
