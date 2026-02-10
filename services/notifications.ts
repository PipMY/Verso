import { Reminder } from "@/types/reminder";
import { differenceInSeconds, parseISO } from "date-fns";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ============================================================================
// CONSTANTS
// ============================================================================

const REMINDER_CATEGORY = "reminder_actions";
const ANDROID_CHANNEL_ID = "reminders";

const SNOOZE_ACTIONS = {
  SNOOZE_5: "snooze_5",
  SNOOZE_15: "snooze_15",
  SNOOZE_60: "snooze_60",
  SNOOZE_CUSTOM: "snooze_custom",
  DONE: "done",
} as const;

// ============================================================================
// NOTIFICATION HANDLER (foreground behavior)
// ============================================================================

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================================================
// PERMISSIONS & CHANNEL SETUP
// ============================================================================

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permissions not granted");
    return false;
  }

  // Configure Android channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B5CF6",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
  }

  return true;
}

// ============================================================================
// NOTIFICATION CATEGORY WITH ACTIONS
// ============================================================================

export async function setupNotificationCategories(): Promise<void> {
  // Android only shows ~3 action buttons, so keep it simple
  // "Custom" opens the app where user can pick any time
  await Notifications.setNotificationCategoryAsync(REMINDER_CATEGORY, [
    {
      identifier: SNOOZE_ACTIONS.SNOOZE_5,
      buttonTitle: "5 min",
      options: { opensAppToForeground: false },
    },
    {
      identifier: SNOOZE_ACTIONS.SNOOZE_15,
      buttonTitle: "15 min",
      options: { opensAppToForeground: false },
    },
    {
      identifier: SNOOZE_ACTIONS.SNOOZE_60,
      buttonTitle: "1 hour",
      options: { opensAppToForeground: false },
    },
    {
      identifier: SNOOZE_ACTIONS.DONE,
      buttonTitle: "Done ✓",
      options: { opensAppToForeground: false },
    },
  ]);
}

// ============================================================================
// SCHEDULE NOTIFICATION
// ============================================================================

export async function scheduleReminderNotification(
  reminder: Reminder,
): Promise<string | null> {
  try {
    const triggerDate = parseISO(reminder.snoozedUntil || reminder.datetime);
    const secondsUntilTrigger = differenceInSeconds(triggerDate, new Date());

    if (secondsUntilTrigger <= 0) {
      console.log("Reminder time has passed, not scheduling notification");
      return null;
    }

    // Cancel existing notification if any
    if (reminder.notificationId) {
      await cancelNotification(reminder.notificationId);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.notes || "Tap to view reminder",
        data: {
          reminderId: reminder.id,
          reminderTitle: reminder.title,
          reminderNotes: reminder.notes,
          type: "reminder",
        },
        categoryIdentifier: REMINDER_CATEGORY,
        sound: "default",
        badge: 1,
        ...(Platform.OS === "android" && {
          channelId: ANDROID_CHANNEL_ID,
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: secondsUntilTrigger,
      },
    });

    return notificationId;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

// Schedule a snooze notification (reschedule after snooze)
export async function scheduleSnoozeNotification(
  reminderId: string,
  title: string,
  notes: string | undefined,
  snoozeMinutes: number,
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ ${title}`,
        body: notes || "Snoozed reminder",
        data: {
          reminderId,
          reminderTitle: title,
          reminderNotes: notes,
          type: "reminder",
          snoozed: true,
        },
        categoryIdentifier: REMINDER_CATEGORY,
        sound: "default",
        badge: 1,
        ...(Platform.OS === "android" && {
          channelId: ANDROID_CHANNEL_ID,
        }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: snoozeMinutes * 60,
      },
    });

    return notificationId;
  } catch (error) {
    console.error("Error scheduling snooze notification:", error);
    return null;
  }
}

// ============================================================================
// CANCEL NOTIFICATIONS
// ============================================================================

export async function cancelNotification(
  notificationId: string,
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error("Error canceling notification:", error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error canceling all notifications:", error);
  }
}

export async function dismissNotification(
  notificationId: string,
): Promise<void> {
  try {
    await Notifications.dismissNotificationAsync(notificationId);
  } catch (error) {
    console.error("Error dismissing notification:", error);
  }
}

export async function dismissAllNotifications(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch (error) {
    console.error("Error dismissing all notifications:", error);
  }
}

// ============================================================================
// GET SCHEDULED NOTIFICATIONS
// ============================================================================

export async function getScheduledNotifications(): Promise<
  Notifications.NotificationRequest[]
> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return [];
  }
}

// ============================================================================
// RESPONSE PARSING
// ============================================================================

export interface ParsedNotificationResponse {
  reminderId: string | null;
  actionType: "snooze" | "done" | "tap" | "dismiss";
  snoozeMinutes: number | null;
  reminderTitle?: string;
  reminderNotes?: string;
  notificationId: string;
}

export function parseNotificationResponse(
  response: Notifications.NotificationResponse,
): ParsedNotificationResponse {
  const data = response.notification.request.content.data as {
    reminderId?: string;
    reminderTitle?: string;
    reminderNotes?: string;
  };
  const actionId = response.actionIdentifier;
  const notificationId = response.notification.request.identifier;

  const result: ParsedNotificationResponse = {
    reminderId: data.reminderId || null,
    reminderTitle: data.reminderTitle,
    reminderNotes: data.reminderNotes,
    actionType: "tap",
    snoozeMinutes: null,
    notificationId,
  };

  // Handle different action types
  switch (actionId) {
    case SNOOZE_ACTIONS.SNOOZE_5:
      result.actionType = "snooze";
      result.snoozeMinutes = 5;
      break;

    case SNOOZE_ACTIONS.SNOOZE_15:
      result.actionType = "snooze";
      result.snoozeMinutes = 15;
      break;

    case SNOOZE_ACTIONS.SNOOZE_60:
      result.actionType = "snooze";
      result.snoozeMinutes = 60;
      break;

    case SNOOZE_ACTIONS.SNOOZE_CUSTOM:
      result.actionType = "snooze";
      result.snoozeMinutes = parseCustomSnoozeInput(response);
      break;

    case SNOOZE_ACTIONS.DONE:
      result.actionType = "done";
      break;

    case Notifications.DEFAULT_ACTION_IDENTIFIER:
      result.actionType = "tap";
      break;

    default:
      // Check for legacy snooze_* patterns
      if (actionId.startsWith("snooze_")) {
        const minutes = parseInt(actionId.replace("snooze_", ""), 10);
        if (!isNaN(minutes) && minutes > 0) {
          result.actionType = "snooze";
          result.snoozeMinutes = clampSnoozeMinutes(minutes);
        }
      }
      break;
  }

  return result;
}

function parseCustomSnoozeInput(
  response: Notifications.NotificationResponse,
): number {
  const userText = response.userText?.trim() || "";
  const parsed = parseInt(userText, 10);

  if (isNaN(parsed) || parsed <= 0) {
    // Default to 15 minutes if invalid input
    return 15;
  }

  return clampSnoozeMinutes(parsed);
}

function clampSnoozeMinutes(minutes: number): number {
  const MIN_SNOOZE = 1;
  const MAX_SNOOZE = 1440; // 24 hours
  return Math.max(MIN_SNOOZE, Math.min(MAX_SNOOZE, minutes));
}

// Legacy helper for backwards compatibility
export function getSnoozeMinutesFromAction(
  actionIdentifier: string,
): number | null {
  const snoozeMap: Record<string, number> = {
    snooze_5: 5,
    snooze_10: 10,
    snooze_15: 15,
    snooze_30: 30,
    snooze_60: 60,
    snooze_180: 180,
  };
  return snoozeMap[actionIdentifier] || null;
}

// ============================================================================
// LISTENERS
// ============================================================================

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

// ============================================================================
// UTILITIES
// ============================================================================

export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Reminder",
      body: "This is a test notification from Verso!",
      data: {
        reminderId: "test-123",
        reminderTitle: "Test Reminder",
        type: "test",
      },
      categoryIdentifier: REMINDER_CATEGORY,
      ...(Platform.OS === "android" && {
        channelId: ANDROID_CHANNEL_ID,
      }),
    },
    trigger: null, // Send immediately
  });
}

export async function clearBadgeCount(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error("Error clearing badge count:", error);
  }
}
