import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import * as Crypto from "expo-crypto";

import { Reminder, UserPreferences } from "@/types/reminder";

// UUID v4 regex for validation
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str);
}

// TODO: Replace with your Supabase project credentials
// Get these from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
const SUPABASE_URL = "https://esupboygbdeweoqufgrc.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzdXBib3lnYmRld2VvcXVmZ3JjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzkzODksImV4cCI6MjA4NTQ1NTM4OX0.lDsNqI-IJLoREzOWcZimqKGCN06SSX42iP-c8yhfPDI";

// Custom storage adapter for React Native
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
};

// Create Supabase client
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return (
    !SUPABASE_URL.includes("YOUR_PROJECT") &&
    !SUPABASE_ANON_KEY.includes("YOUR_ANON_KEY")
  );
}

// ============ Authentication ============

// Sign in anonymously (no email/password needed)
export async function signInAnonymously(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    console.log("Supabase not configured - skipping auth");
    return null;
  }

  try {
    // First check if we have an existing session
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      console.log("Existing session found:", session.user.id);
      return session.user;
    }

    // Sign in anonymously
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error("Anonymous sign in error:", error);
      return null;
    }

    console.log("Signed in anonymously:", data.user?.id);
    return data.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    return null;
  }
}

// Sign in with email
export async function signInWithEmail(
  email: string,
  password: string,
): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error);
      return null;
    }

    console.log("Signed in with email:", data.user?.id);
    return data.user;
  } catch (error) {
    console.error("Error signing in with email:", error);
    return null;
  }
}

// Sign up with email (create new account)
export async function signUpWithEmail(
  email: string,
  password: string,
): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("Sign up error:", error);
      return null;
    }

    console.log("Signed up with email:", data.user?.id);
    return data.user;
  } catch (error) {
    console.error("Error signing up with email:", error);
    return null;
  }
}

// Link anonymous account to email (upgrade account)
export async function linkEmailToAccount(
  email: string,
  password: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase.auth.updateUser({
      email,
      password,
    });

    if (error) {
      console.error("Error linking email:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error linking email:", error);
    return false;
  }
}

// Sign out
export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;

  await supabase.auth.signOut();
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Get user info (email, anonymous status)
export async function getUserInfo(): Promise<{
  id: string;
  email: string | null;
  isAnonymous: boolean;
} | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  return {
    id: user.id,
    email: user.email || null,
    isAnonymous: user.is_anonymous || !user.email,
  };
}

// ============ Reminders Sync ============

// Convert local reminder to Supabase format
function toSupabaseReminder(reminder: Reminder, userId: string) {
  // Ensure we always have a valid UUID for the cloud id
  let cloudId = reminder.syncId;
  if (!cloudId || !isValidUUID(cloudId)) {
    cloudId = Crypto.randomUUID();
  }
  return {
    id: cloudId,
    user_id: userId,
    local_id: reminder.id,
    title: reminder.title,
    notes: reminder.notes,
    datetime: reminder.datetime,
    snoozed_until: reminder.snoozedUntil,
    is_completed: reminder.isCompleted,
    completed_at: reminder.completedAt,
    priority: reminder.priority,
    recurrence: reminder.recurrence,
    snooze_presets: reminder.snoozePresets,
    tags: reminder.tags,
    notification_id: reminder.notificationId,
    device_id: reminder.deviceId,
    created_at: reminder.createdAt,
    updated_at: reminder.updatedAt,
  };
}

// Convert Supabase reminder to local format
function fromSupabaseReminder(data: any): Reminder {
  // Parse snooze_presets if it's a string
  let snoozePresets = data.snooze_presets || [];
  if (typeof snoozePresets === "string") {
    try {
      snoozePresets = JSON.parse(snoozePresets);
    } catch {
      snoozePresets = [];
    }
  }

  const reminder: Reminder = {
    id: data.local_id || data.id,
    syncId: data.id,
    deviceId: data.device_id,
    title: data.title,
    notes: data.notes,
    datetime: data.datetime,
    snoozedUntil: data.snoozed_until,
    isCompleted: data.is_completed || false,
    completedAt: data.completed_at,
    priority: data.priority || "medium",
    recurrence: data.recurrence,
    snoozePresets: snoozePresets,
    tags: data.tags || [],
    notificationId: data.notification_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  console.log(
    "Parsed reminder from cloud:",
    reminder.title,
    "datetime:",
    reminder.datetime,
    "isCompleted:",
    reminder.isCompleted,
  );

  return reminder;
}

// Fetch all reminders from Supabase
export async function fetchRemindersFromCloud(): Promise<Reminder[]> {
  if (!isSupabaseConfigured()) return [];

  const user = await getCurrentUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching reminders:", error);
      return [];
    }

    return (data || []).map(fromSupabaseReminder);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return [];
  }
}

// Upsert a reminder to Supabase
// Returns the syncId used in the cloud, or null on failure
export async function upsertReminderToCloud(
  reminder: Reminder,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const supabaseData = toSupabaseReminder(reminder, user.id);
    const { error } = await supabase.from("reminders").upsert(supabaseData, {
      onConflict: "id",
    });

    if (error) {
      console.error("Error upserting reminder:", error);
      return null;
    }

    return supabaseData.id;
  } catch (error) {
    console.error("Error upserting reminder:", error);
    return null;
  }
}

// Delete a reminder from Supabase
export async function deleteReminderFromCloud(
  syncId: string,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  try {
    const { error } = await supabase
      .from("reminders")
      .delete()
      .eq("id", syncId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting reminder:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return false;
  }
}

// Sync all local reminders to cloud
// Returns updated reminders with syncIds assigned, or null on failure
export async function syncRemindersToCloud(
  reminders: Reminder[],
): Promise<Reminder[] | null> {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  try {
    // First, fetch existing reminder IDs from cloud for this user
    const { data: existingReminders } = await supabase
      .from("reminders")
      .select("id, local_id")
      .eq("user_id", user.id);

    const existingSyncIds = new Set(existingReminders?.map((r) => r.id) || []);
    const existingLocalIds = new Set(
      existingReminders?.map((r) => r.local_id) || [],
    );

    // Ensure all reminders have a valid UUID syncId
    const updatedReminders = reminders.map((r) => {
      if (!r.syncId || !isValidUUID(r.syncId)) {
        return { ...r, syncId: Crypto.randomUUID() };
      }
      return r;
    });

    // Filter reminders: only sync those that are new or belong to current user
    const remindersToSync = updatedReminders.filter((r) => {
      // If it has a syncId that exists in cloud for this user, sync it
      if (r.syncId && existingSyncIds.has(r.syncId)) {
        return true;
      }
      // If it has a local_id that exists in cloud for this user, sync it
      if (existingLocalIds.has(r.id)) {
        return true;
      }
      // If it doesn't exist in cloud yet, it's a new local reminder - sync it
      return true;
    });

    if (remindersToSync.length === 0) {
      console.log("No reminders to sync for current user");
      return updatedReminders;
    }

    const supabaseReminders = remindersToSync.map((r) =>
      toSupabaseReminder(r, user.id),
    );

    const { error } = await supabase
      .from("reminders")
      .upsert(supabaseReminders, { onConflict: "id" });

    if (error) {
      console.error("Error syncing reminders:", error);
      return null;
    }

    console.log("Synced", remindersToSync.length, "reminders to cloud");
    return updatedReminders;
  } catch (error) {
    console.error("Error syncing reminders:", error);
    return null;
  }
}

// Subscribe to real-time changes
export function subscribeToReminders(
  onInsert: (reminder: Reminder) => void,
  onUpdate: (reminder: Reminder) => void,
  onDelete: (id: string) => void,
) {
  if (!isSupabaseConfigured()) {
    return { unsubscribe: () => {} };
  }

  const channel = supabase
    .channel("reminders-changes")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "reminders",
      },
      (payload) => {
        onInsert(fromSupabaseReminder(payload.new));
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "reminders",
      },
      (payload) => {
        onUpdate(fromSupabaseReminder(payload.new));
      },
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "reminders",
      },
      (payload) => {
        onDelete(payload.old.id);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase.removeChannel(channel);
    },
  };
}

// ============ Preferences Sync ============

// Fetch user preferences from cloud
export async function fetchPreferencesFromCloud(): Promise<UserPreferences | null> {
  if (!isSupabaseConfigured()) return null;

  const user = await getCurrentUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("preferences, updated_at")
      .eq("user_id", user.id)
      .single();

    if (error) {
      // PGRST116 = no rows found, that's fine for new users
      if (error.code === "PGRST116") return null;
      console.error("Error fetching preferences:", error);
      return null;
    }

    return (data?.preferences as UserPreferences) || null;
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return null;
  }
}

// Upsert user preferences to cloud
export async function upsertPreferencesToCloud(
  prefs: UserPreferences,
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const user = await getCurrentUser();
  if (!user) return false;

  try {
    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        preferences: prefs,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      console.error("Error upserting preferences:", error);
      return false;
    }

    console.log("Preferences synced to cloud");
    return true;
  } catch (error) {
    console.error("Error upserting preferences:", error);
    return false;
  }
}
