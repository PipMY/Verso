import { differenceInSeconds, parseISO } from "date-fns";

import { Reminder } from "@/types/reminder";

// ============================================================================
// SAFE NOTIFEE IMPORT — gracefully no-ops in Expo Go
// ============================================================================

let notifee: any = null;
let TriggerType: any = {};
let AndroidImportance: any = {};
let AndroidStyle: any = {};
let AuthorizationStatus: any = { AUTHORIZED: 1 };
let EventType: any = {};

let isNotifeeAvailable = false;

// The @notifee/react-native package throws at module evaluation time if the
// native module isn't linked (Expo Go). We isolate the require in a separate
// file so the error is thrown during that file's evaluation and can be caught.
try {
  const loader = require("./notifee-loader");
  notifee = loader.notifee;
  TriggerType = loader.TriggerType;
  AndroidImportance = loader.AndroidImportance;
  AndroidStyle = loader.AndroidStyle;
  AuthorizationStatus = loader.AuthorizationStatus;
  EventType = loader.EventType;
  isNotifeeAvailable = true;
} catch (_e) {
  console.log(
    "[Notifee] Native module not available (Expo Go?). Notifications disabled.",
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CHANNEL_ID = "reminders";

// ============================================================================
// SETUP
// ============================================================================

export async function setupNotifications(): Promise<boolean> {
  if (!isNotifeeAvailable) {
    console.log("[Notifee] Skipping setup — native module not available");
    return false;
  }

  // Request permissions
  const settings = await notifee.requestPermission();

  if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
    console.log("Notification permissions not granted");
    return false;
  }

  // Create Android channel
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: "Reminders",
    importance: AndroidImportance.HIGH,
    vibration: true,
    lights: true,
    lightColor: "#8B5CF6",
  });

  return true;
}

// ============================================================================
// SCHEDULE NOTIFICATION
// ============================================================================

// Simple schedule function for modal.tsx (takes id, title, datetime)
export async function scheduleNotification(
  id: string,
  title: string,
  datetime: Date,
  notes?: string,
): Promise<string | null> {
  if (!isNotifeeAvailable) return null;

  try {
    const secondsUntilTrigger = differenceInSeconds(datetime, new Date());

    if (secondsUntilTrigger <= 0) {
      console.log("Reminder time has passed, not scheduling notification");
      return null;
    }

    const trigger: any = {
      type: TriggerType.TIMESTAMP,
      timestamp: datetime.getTime(),
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        id,
        title,
        body: notes || "Tap to view reminder",
        data: {
          reminderId: id,
          reminderTitle: title,
          reminderNotes: notes || "",
          type: "reminder",
        },
        android: {
          channelId: CHANNEL_ID,
          pressAction: { id: "default" },
          actions: [
            {
              title: "Done ✓",
              pressAction: { id: "done" },
            },
            {
              title: "5 min",
              pressAction: { id: "snooze_5" },
            },
            {
              title: "Custom",
              pressAction: { id: "snooze_custom" },
              input: {
                placeholder: "Minutes",
              },
            },
          ],
        },
        ios: {
          categoryId: "reminder_actions",
        },
      },
      trigger,
    );

    return notificationId;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

export async function scheduleReminderNotification(
  reminder: Reminder,
): Promise<string | null> {
  if (!isNotifeeAvailable) return null;

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

    const trigger: any = {
      type: TriggerType.TIMESTAMP,
      timestamp: triggerDate.getTime(),
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        id: reminder.id,
        title: reminder.title,
        body: reminder.notes || "Tap to view reminder",
        data: {
          reminderId: reminder.id,
          reminderTitle: reminder.title,
          reminderNotes: reminder.notes || "",
          type: "reminder",
        },
        android: {
          channelId: CHANNEL_ID,
          pressAction: { id: "default" },
          actions: [
            {
              title: "Done ✓",
              pressAction: { id: "done" },
            },
            {
              title: "5 min",
              pressAction: { id: "snooze_5" },
            },
            {
              title: "Custom",
              pressAction: { id: "snooze_custom" },
              input: {
                placeholder: "Minutes",
              },
            },
          ],
          style: {
            type: AndroidStyle.BIGTEXT,
            text: reminder.notes || "Tap to view reminder",
          },
        },
        ios: {
          categoryId: "reminder_actions",
        },
      },
      trigger,
    );

    return notificationId;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

// Schedule snooze notification
export async function scheduleSnoozeNotification(
  reminderId: string,
  title: string,
  notes: string | undefined,
  snoozeMinutes: number,
): Promise<string | null> {
  if (!isNotifeeAvailable) return null;

  try {
    const trigger: any = {
      type: TriggerType.TIMESTAMP,
      timestamp: Date.now() + snoozeMinutes * 60 * 1000,
    };

    const notificationId = await notifee.createTriggerNotification(
      {
        id: `${reminderId}_snooze`,
        title: `⏰ ${title}`,
        body: notes || "Snoozed reminder",
        data: {
          reminderId,
          reminderTitle: title,
          reminderNotes: notes || "",
          type: "reminder",
          snoozed: "true",
        },
        android: {
          channelId: CHANNEL_ID,
          pressAction: { id: "default" },
          actions: [
            {
              title: "Done ✓",
              pressAction: { id: "done" },
            },
            {
              title: "5 min",
              pressAction: { id: "snooze_5" },
            },
            {
              title: "Custom",
              pressAction: { id: "snooze_custom" },
              input: {
                placeholder: "Minutes",
              },
            },
          ],
        },
        ios: {
          categoryId: "reminder_actions",
        },
      },
      trigger,
    );

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
  if (!isNotifeeAvailable) return;

  try {
    await notifee.cancelNotification(notificationId);
  } catch (error) {
    console.error("Error canceling notification:", error);
  }
}

export async function cancelAllNotifications(): Promise<void> {
  if (!isNotifeeAvailable) return;

  try {
    await notifee.cancelAllNotifications();
  } catch (error) {
    console.error("Error canceling all notifications:", error);
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

function parseCustomSnoozeInput(input: string | undefined): number {
  if (!input) return 15;

  const parsed = parseInt(input.trim(), 10);
  if (isNaN(parsed) || parsed <= 0) return 15;

  // Clamp between 1 and 1440 minutes (24 hours)
  return Math.max(1, Math.min(1440, parsed));
}

// ============================================================================
// EVENT HANDLER - Call this in your app entry point
// ============================================================================

export function setupNotificationEventHandler(handlers: {
  onSnooze: (
    reminderId: string,
    minutes: number,
    title: string,
    notes?: string,
  ) => Promise<void>;
  onDone: (reminderId: string) => Promise<void>;
  onTap: (reminderId: string) => void;
}): void {
  if (!isNotifeeAvailable) return;

  notifee.onForegroundEvent(
    async ({ type, detail }: { type: any; detail: any }) => {
      const { notification, pressAction, input } = detail;

      if (!notification?.data?.reminderId) return;

      const reminderId = notification.data.reminderId as string;
      const title = (notification.data.reminderTitle as string) || "Reminder";
      const notes = notification.data.reminderNotes as string | undefined;

      if (type === EventType.ACTION_PRESS && pressAction) {
        // Dismiss the notification first
        if (notification.id) {
          await notifee.cancelNotification(notification.id);
        }

        switch (pressAction.id) {
          case "snooze_5":
            await handlers.onSnooze(reminderId, 5, title, notes);
            break;
          case "snooze_15":
            await handlers.onSnooze(reminderId, 15, title, notes);
            break;
          case "snooze_custom":
            const minutes = parseCustomSnoozeInput(input);
            await handlers.onSnooze(reminderId, minutes, title, notes);
            break;
          case "done":
            await handlers.onDone(reminderId);
            break;
        }
      } else if (type === EventType.PRESS) {
        handlers.onTap(reminderId);
      }
    },
  );

  // Background event handler
  notifee.onBackgroundEvent(
    async ({ type, detail }: { type: any; detail: any }) => {
      const { notification, pressAction, input } = detail;

      if (!notification?.data?.reminderId) return;

      const reminderId = notification.data.reminderId as string;
      const title = (notification.data.reminderTitle as string) || "Reminder";
      const notes = notification.data.reminderNotes as string | undefined;

      if (type === EventType.ACTION_PRESS && pressAction) {
        // Dismiss the notification first
        if (notification.id) {
          await notifee.cancelNotification(notification.id);
        }

        switch (pressAction.id) {
          case "done":
            await handlers.onDone(reminderId);
            break;
          case "snooze_5":
            await handlers.onSnooze(reminderId, 5, title, notes);
            break;
          case "snooze_custom":
            const minutes = parseCustomSnoozeInput(input);
            await handlers.onSnooze(reminderId, minutes, title, notes);
            break;
        }
      }
    },
  );
}

// ============================================================================
// UTILITIES
// ============================================================================

export async function sendTestNotification(): Promise<void> {
  if (!isNotifeeAvailable) return;

  await notifee.displayNotification({
    title: "Test Reminder",
    body: "This is a test notification from Verso!",
    data: {
      reminderId: "test-123",
      reminderTitle: "Test Reminder",
      type: "test",
    },
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: "default" },
      actions: [
        {
          title: "Done ✓",
          pressAction: { id: "done" },
        },
        {
          title: "5 min",
          pressAction: { id: "snooze_5" },
        },
        {
          title: "Custom",
          pressAction: { id: "snooze_custom" },
          input: {
            placeholder: "Minutes",
          },
        },
      ],
    },
  });
}

export async function clearBadgeCount(): Promise<void> {
  if (!isNotifeeAvailable) return;

  try {
    await notifee.setBadgeCount(0);
  } catch (error) {
    console.error("Error clearing badge count:", error);
  }
}

export async function getScheduledNotifications() {
  if (!isNotifeeAvailable) return [];

  return notifee.getTriggerNotifications();
}
