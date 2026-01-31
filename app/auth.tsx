import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
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
import * as Supabase from "@/services/supabase";

export default function AuthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { refresh } = useReminders();

  const [mode, setMode] = useState<"signin" | "signup" | "link">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      let success = false;

      if (mode === "link") {
        // Link anonymous account to email
        success = await Supabase.linkEmailToAccount(email, password);
        if (success) {
          Alert.alert(
            "Account Created!",
            "Your reminders are now linked to your email. You can sign in on other devices.",
            [{ text: "OK", onPress: () => router.back() }],
          );
        } else {
          Alert.alert(
            "Error",
            "Could not link account. The email may already be in use.",
          );
        }
      } else if (mode === "signup") {
        // Sign up new account
        const user = await Supabase.signUpWithEmail(email, password);
        if (user) {
          Alert.alert(
            "Account Created!",
            "You can now sign in on other devices with this email.",
            [{ text: "OK", onPress: () => router.back() }],
          );
        } else {
          Alert.alert(
            "Error",
            "Could not create account. The email may already be in use.",
          );
        }
      } else {
        // Sign in
        const user = await Supabase.signInWithEmail(email, password);
        if (user) {
          // Refresh to load reminders from new account
          await refresh();
          Alert.alert(
            "Signed In!",
            "Your reminders will now sync with this account.",
            [{ text: "OK", onPress: () => router.back() }],
          );
        } else {
          Alert.alert(
            "Error",
            "Invalid email or password. If you just signed up, check your email for confirmation.",
          );
        }
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case "link":
        return "Link Your Account";
      case "signup":
        return "Create Account";
      default:
        return "Sign In";
    }
  };

  const getSubtitle = () => {
    switch (mode) {
      case "link":
        return "Add an email to sync your reminders across devices";
      case "signup":
        return "Create an account to sync across devices";
      default:
        return "Sign in to access your reminders";
    }
  };

  const getButtonText = () => {
    switch (mode) {
      case "link":
        return "Link Account";
      case "signup":
        return "Create Account";
      default:
        return "Sign In";
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={[
            styles.backButton,
            { backgroundColor: colors.backgroundSecondary },
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: Brand.primary + "20" },
          ]}
        >
          <Ionicons name="cloud-outline" size={48} color={Brand.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{getTitle()}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {getSubtitle()}
        </Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Email
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
                borderColor: colors.cardBorder,
              },
            ]}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Password
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
                borderColor: colors.cardBorder,
              },
            ]}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Submit Button */}
        <Pressable
          style={[
            styles.submitButton,
            { backgroundColor: Brand.primary },
            isLoading && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{getButtonText()}</Text>
          )}
        </Pressable>

        {/* Mode Switcher */}
        <View style={styles.modeSwitcher}>
          {mode !== "signin" && (
            <Pressable onPress={() => setMode("signin")}>
              <Text style={[styles.switchText, { color: Brand.primary }]}>
                Already have an account? Sign In
              </Text>
            </Pressable>
          )}
          {mode !== "signup" && mode !== "link" && (
            <Pressable onPress={() => setMode("signup")}>
              <Text style={[styles.switchText, { color: Brand.primary }]}>
                Don't have an account? Sign Up
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSizes.md,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
    marginBottom: Spacing.xs,
  },
  input: {
    height: 50,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.md,
  },
  submitButton: {
    height: 50,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  modeSwitcher: {
    marginTop: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  switchText: {
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
});
