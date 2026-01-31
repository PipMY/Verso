import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import "react-native-reanimated";

import { Brand, Colors } from "@/constants/theme";
import { RemindersProvider } from "@/context/RemindersContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { initializeRevenueCat } from "@/services/revenuecat";

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

  return (
    <ThemeProvider
      value={colorScheme === "dark" ? VersoDarkTheme : VersoLightTheme}
    >
      <Stack>
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
