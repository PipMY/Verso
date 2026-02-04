import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";

import { Brand, Colors } from "@/constants/theme";
import { RemindersProvider } from "@/context/RemindersContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { initializeRevenueCat } from "@/services/revenuecat";

import { hasCompletedOnboarding } from "./onboarding";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Custom dark theme matching our app
const VersoDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Brand.primary,
    background: Colors.dark.background,
    card: Colors.dark.card,
    text: Colors.dark.text,
    border: Colors.dark.cardBorder,
  },
};

const VersoLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Brand.primary,
    background: Colors.light.background,
    card: Colors.light.card,
    text: Colors.light.text,
    border: Colors.light.cardBorder,
  },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [isReady, setIsReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkOnboarding() {
      const completed = await hasCompletedOnboarding();
      setNeedsOnboarding(!completed);
      setIsReady(true);
    }
    checkOnboarding();
  }, []);

  // Re-check onboarding status when navigating away from onboarding
  useEffect(() => {
    if (!isReady) return;

    const inOnboarding = segments[0] === "onboarding";

    // If we just left onboarding, re-check the status
    if (!inOnboarding && needsOnboarding) {
      hasCompletedOnboarding().then((completed) => {
        if (completed) {
          setNeedsOnboarding(false);
        }
      });
    }
  }, [segments]);

  useEffect(() => {
    if (!isReady || needsOnboarding === null) return;

    const inOnboarding = segments[0] === "onboarding";

    if (needsOnboarding && !inOnboarding) {
      router.replace("/onboarding");
    }
  }, [isReady, needsOnboarding, segments]);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.dark.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={Brand.primary} />
      </View>
    );
  }

  return (
    <ThemeProvider
      value={colorScheme === "dark" ? VersoDarkTheme : VersoLightTheme}
    >
      <Stack>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{
            presentation: "modal",
            title: "New Reminder",
            headerStyle: { backgroundColor: Colors.dark.backgroundSecondary },
            headerTintColor: Colors.dark.text,
          }}
        />
        <Stack.Screen
          name="edit-reminder"
          options={{
            presentation: "modal",
            title: "Edit Reminder",
            headerStyle: { backgroundColor: Colors.dark.backgroundSecondary },
            headerTintColor: Colors.dark.text,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            presentation: "card",
            title: "Settings",
            headerStyle: { backgroundColor: Colors.dark.backgroundSecondary },
            headerTintColor: Colors.dark.text,
          }}
        />
        <Stack.Screen
          name="paywall"
          options={{
            presentation: "modal",
            title: "",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="auth"
          options={{
            presentation: "modal",
            title: "",
            headerShown: false,
          }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    // Initialize RevenueCat
    initializeRevenueCat();
  }, []);

  return (
    <RemindersProvider>
      <RootLayoutNav />
    </RemindersProvider>
  );
}
