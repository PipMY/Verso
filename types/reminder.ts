// Reminder data types for Verso app

export type RecurrenceType =
  | "none"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "custom";

export interface RecurrenceRule {
  type: RecurrenceType;
  interval: number; // e.g., every 2 days
  daysOfWeek?: number[]; // 0-6 for weekly (0 = Sunday)
  dayOfMonth?: number; // 1-31 for monthly
  endDate?: string; // ISO date string
  repeatCount?: number; // custom number of repeats
}

export interface SnoozePreset {
  id: string;
  label: string;
  minutes: number;
}

export interface Reminder {
  id: string;
  title: string;
  notes?: string;
  datetime: string; // ISO date string
  isCompleted: boolean;
  completedAt?: string;
  recurrence?: RecurrenceRule;
  snoozePresets: SnoozePreset[];
  snoozedUntil?: string; // ISO date string
  priority: "low" | "medium" | "high";
  tags?: string[];
  notificationId?: string;
  syncId?: string; // for cross-device sync
  createdAt: string;
  updatedAt: string;
  deviceId?: string;
}

export interface ReminderList {
  id: string;
  name: string;
  color: string;
  icon?: string;
  reminderIds: string[];
  createdAt: string;
}

export interface UserPreferences {
  defaultSnoozeMinutes: number;
  defaultRecurrence: RecurrenceType;
  customSnoozePresets: SnoozePreset[];
  defaultView: "today" | "upcoming" | "all";
  notificationSound: string;
  hapticFeedback: boolean;
  theme: "dark" | "light" | "system";
}

export interface SyncState {
  lastSyncAt?: string;
  deviceId: string;
  syncEnabled: boolean;
}

// Default snooze presets
export const DEFAULT_SNOOZE_PRESETS: SnoozePreset[] = [
  { id: "5min", label: "5 minutes", minutes: 5 },
  { id: "15min", label: "15 minutes", minutes: 15 },
  { id: "30min", label: "30 minutes", minutes: 30 },
  { id: "1hr", label: "1 hour", minutes: 60 },
  { id: "3hr", label: "3 hours", minutes: 180 },
  { id: "tomorrow", label: "Tomorrow", minutes: 1440 },
];

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultSnoozeMinutes: 15,
  defaultRecurrence: "none",
  customSnoozePresets: DEFAULT_SNOOZE_PRESETS,
  defaultView: "today",
  notificationSound: "default",
  hapticFeedback: true,
  theme: "dark",
};
