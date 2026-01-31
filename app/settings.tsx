import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    BorderRadius,
    Brand,
    Colors,
    FontSizes,
    Spacing,
} from "@/constants/theme";
import { useReminders } from "@/context/RemindersContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Notifications from "@/services/notifications";
import * as Storage from "@/services/storage";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const {
    preferences,
    updatePreferences,
    refresh,
    isSyncing,
    isCloudEnabled,
    syncNow,
  } = useReminders();

  const [hapticEnabled, setHapticEnabled] = useState(
    preferences.hapticFeedback,
  );

  const handleToggleHaptic = async (value: boolean) => {
    setHapticEnabled(value);
    if (value) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await updatePreferences({ hapticFeedback: value });
  };

  const handleSyncNow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await syncNow();
    Alert.alert("Sync Complete", "Your reminders have been synced.");
  };

  const handleTestNotification = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await Notifications.sendTestNotification();
    Alert.alert("Test Sent", "A test notification has been sent!");
  };

  const handleClearCompleted = () => {
    Alert.alert(
      "Clear Completed",
      "Are you sure you want to delete all completed reminders? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            // Implementation would go here
            await refresh();
          },
        },
      ],
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      "Reset App",
      "This will delete ALL your reminders and settings. This cannot be undone!",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            await Storage.clearAllData();
            await Notifications.cancelAllNotifications();
            await refresh();
            router.back();
          },
        },
      ],
    );
  };

  const SettingRow = ({
    icon,
    iconColor = colors.textMuted,
    title,
    subtitle,
    right,
    onPress,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    onPress?: () => void;
  }) => (
    <Pressable
      style={[
        styles.settingRow,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconColor + "20" }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right ||
        (onPress && (
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        ))}
    </Pressable>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + Spacing.lg },
      ]}
    >
      {/* App Info */}
      <View style={styles.appInfo}>
        <View style={[styles.appIcon, { backgroundColor: Brand.primary }]}>
          <Ionicons name="notifications" size={32} color="#fff" />
        </View>
        <Text style={[styles.appName, { color: colors.text }]}>Verso</Text>
        <Text style={[styles.appVersion, { color: colors.textMuted }]}>
          Version 1.0.0
        </Text>
      </View>

      {/* General Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          General
        </Text>

        <SettingRow
          icon="notifications-outline"
          iconColor={Brand.primary}
          title="Test Notification"
          subtitle="Send a test notification"
          onPress={handleTestNotification}
        />

        <SettingRow
          icon="hand-right-outline"
          iconColor={Brand.secondary}
          title="Haptic Feedback"
          subtitle="Vibration when interacting"
          right={
            <Switch
              value={hapticEnabled}
              onValueChange={handleToggleHaptic}
              trackColor={{
                false: colors.backgroundTertiary,
                true: Brand.primary + "60",
              }}
              thumbColor={hapticEnabled ? Brand.primary : colors.textMuted}
            />
          }
        />
      </View>

      {/* Sync Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          Sync
        </Text>

        <SettingRow
          icon="cloud-outline"
          iconColor={isCloudEnabled ? Brand.success : Brand.info}
          title="Cloud Sync"
          subtitle={
            isCloudEnabled
              ? "Connected - syncing across devices"
              : "Not configured - local only"
          }
          right={
            isCloudEnabled ? (
              <View style={styles.syncStatus}>
                {isSyncing ? (
                  <ActivityIndicator size="small" color={Brand.primary} />
                ) : (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={Brand.success}
                  />
                )}
              </View>
            ) : undefined
          }
        />

        {isCloudEnabled && (
          <SettingRow
            icon="sync-outline"
            iconColor={Brand.primary}
            title="Sync Now"
            subtitle={isSyncing ? "Syncing..." : "Manually sync your reminders"}
            onPress={handleSyncNow}
            right={
              isSyncing ? (
                <ActivityIndicator size="small" color={Brand.primary} />
              ) : undefined
            }
          />
        )}
      </View>

      {/* Premium */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          Premium
        </Text>

        <Pressable
          style={[
            styles.premiumCard,
            {
              backgroundColor: Brand.primary + "15",
              borderColor: Brand.primary,
            },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/paywall");
          }}
        >
          <View style={styles.premiumHeader}>
            <Ionicons name="star" size={24} color={Brand.primary} />
            <Text style={[styles.premiumTitle, { color: colors.text }]}>
              Unlock Verso Pro
            </Text>
          </View>
          <Text
            style={[styles.premiumDescription, { color: colors.textSecondary }]}
          >
            Get unlimited reminders, cloud sync, custom snooze times, and more!
          </Text>
          <View
            style={[styles.premiumButton, { backgroundColor: Brand.primary }]}
          >
            <Text style={styles.premiumButtonText}>View Plans</Text>
          </View>
        </Pressable>
      </View>

      {/* Data */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          Data
        </Text>

        <SettingRow
          icon="checkmark-done-outline"
          iconColor={Brand.success}
          title="Clear Completed"
          subtitle="Delete all completed reminders"
          onPress={handleClearCompleted}
        />

        <SettingRow
          icon="trash-outline"
          iconColor={Brand.error}
          title="Reset App"
          subtitle="Delete all data and settings"
          onPress={handleResetApp}
        />
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
          About
        </Text>

        <SettingRow
          icon="document-text-outline"
          iconColor={colors.textMuted}
          title="Privacy Policy"
          onPress={() =>
            WebBrowser.openBrowserAsync("https://sambeckman.com/privacy")
          }
        />

        <SettingRow
          icon="shield-checkmark-outline"
          iconColor={colors.textMuted}
          title="Terms of Service"
          onPress={() =>
            WebBrowser.openBrowserAsync("https://sambeckman.com/terms")
          }
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          Made with ❤️ for Sam Beckman
        </Text>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>
          RevenueCat Shipyard 2026
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  appInfo: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  appIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  appName: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
  },
  appVersion: {
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: FontSizes.md,
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  syncStatus: {
    marginLeft: Spacing.sm,
  },
  premiumCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  premiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  premiumTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  premiumDescription: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  premiumButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  premiumButtonText: {
    color: "#fff",
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  footerText: {
    fontSize: FontSizes.sm,
  },
});
