import {
    DEFAULT_SNOOZE_PRESETS,
    Reminder
} from "@/types/reminder";
import { differenceInSeconds, parseISO } from "date-fns";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request permissions
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
    await Notifications.setNotificationChannelAsync("reminders", {
      name: "Reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#8B5CF6",
    });
  }

  return true;
}

// Schedule a notification for a reminder
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

    // Create action buttons for snooze presets
    const snoozePresets = reminder.snoozePresets || DEFAULT_SNOOZE_PRESETS;

    // Build category with snooze actions (iOS)
    const categoryIdentifier = `reminder_${reminder.id}`;

    if (Platform.OS === "ios") {
      await Notifications.setNotificationCategoryAsync(categoryIdentifier, [
        {
          identifier: "snooze_5",
          buttonTitle: "5 min",
          options: { opensAppToForeground: false },
        },
        {
          identifier: "snooze_15",
          buttonTitle: "15 min",
          options: { opensAppToForeground: false },
        },
        {
          identifier: "snooze_60",
          buttonTitle: "1 hour",
          options: { opensAppToForeground: false },
        },
        {
          identifier: "done",
          buttonTitle: "Done ✓",
          options: { opensAppToForeground: false },
        },
      ]);
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminder.title,
        body: reminder.notes || "Tap to view reminder",
        data: {
          reminderId: reminder.id,
          type: "reminder",
        },
        categoryIdentifier:
          Platform.OS === "ios" ? categoryIdentifier : undefined,
        sound: "default",
        badge: 1,
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

// Cancel a scheduled notification
export async function cancelNotification(
  notificationId: string,
): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error("Error canceling notification:", error);
  }
}

// Cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error canceling all notifications:", error);
  }
}

// Get all scheduled notifications
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

// Handle notification response (when user taps on notification or action button)
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Handle received notification (when notification is received while app is foregrounded)
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void,
): Notifications.EventSubscription {
  return Notifications.addNotificationReceivedListener(callback);
}

// Get snooze duration from action identifier
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

// Send an immediate notification (for testing)
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Test Reminder",
      body: "This is a test notification from Verso!",
      data: { type: "test" },
    },
    trigger: null, // Send immediately
  });
}

// Clear badge count
export async function clearBadgeCount(): Promise<void> {
  try {
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    console.error("Error clearing badge count:", error);
  }
}
