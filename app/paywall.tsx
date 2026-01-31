import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { PurchasesPackage } from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
    BorderRadius,
    Brand,
    Colors,
    FontSizes,
    Shadows,
    Spacing,
} from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as RevenueCat from "@/services/revenuecat";

const FEATURES = [
  {
    icon: "infinite-outline",
    title: "Unlimited Reminders",
    description: "No limits on how many reminders you can create",
  },
  {
    icon: "cloud-outline",
    title: "Cloud Sync",
    description: "Sync across all your devices seamlessly",
  },
  {
    icon: "alarm-outline",
    title: "Custom Snooze",
    description: "Create your own snooze presets (e.g., 22 mins)",
  },
  {
    icon: "repeat-outline",
    title: "Advanced Recurrence",
    description: "Complex recurring patterns and custom intervals",
  },
  {
    icon: "color-palette-outline",
    title: "Themes",
    description: "Customize the look and feel of your app",
  },
  {
    icon: "apps-outline",
    title: "Widgets",
    description: "Quick access widgets for your home screen",
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState(false);

  useEffect(() => {
    loadOfferings();
  }, []);

  const loadOfferings = async () => {
    setIsLoading(true);
    const offerings = await RevenueCat.getOfferings();
    setPackages(offerings);
    if (offerings.length > 0) {
      // Select yearly by default (usually best value)
      const yearly = offerings.find((p) => p.identifier.includes("yearly"));
      setSelectedPackage(yearly || offerings[0]);
    }
    setIsLoading(false);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) return;

    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const customerInfo = await RevenueCat.purchasePackage(selectedPackage);

    setIsPurchasing(false);

    if (customerInfo) {
      const status = await RevenueCat.getSubscriptionStatus();
      if (status.isProUser) {
        Alert.alert(
          "Welcome to Pro! 🎉",
          "Thank you for your purchase. Enjoy all the premium features!",
          [{ text: "Let's Go!", onPress: () => router.back() }],
        );
      }
    }
  };

  const handleRestore = async () => {
    setIsPurchasing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const customerInfo = await RevenueCat.restorePurchases();

    setIsPurchasing(false);

    if (customerInfo) {
      const status = await RevenueCat.getSubscriptionStatus();
      if (status.isProUser) {
        Alert.alert("Restored!", "Your purchase has been restored.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      } else {
        Alert.alert(
          "No Purchases Found",
          "We couldn't find any previous purchases to restore.",
        );
      }
    }
  };

  const getPackageLabel = (pkg: PurchasesPackage) => {
    if (pkg.identifier.includes("yearly")) return "Best Value";
    if (pkg.identifier.includes("lifetime")) return "One Time";
    return "";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <Pressable
          style={[
            styles.closeButton,
            { backgroundColor: colors.backgroundSecondary },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View
            style={[styles.iconContainer, { backgroundColor: Brand.primary }]}
          >
            <Ionicons name="star" size={40} color="#fff" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Unlock Verso Pro
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Get the full reminders experience with powerful features
          </Text>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          {FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: Brand.primary + "20" },
                ]}
              >
                <Ionicons
                  name={feature.icon as any}
                  size={22}
                  color={Brand.primary}
                />
              </View>
              <View style={styles.featureContent}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>
                  {feature.title}
                </Text>
                <Text
                  style={[
                    styles.featureDescription,
                    { color: colors.textMuted },
                  ]}
                >
                  {feature.description}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Packages */}
        {isLoading ? (
          <ActivityIndicator
            size="large"
            color={Brand.primary}
            style={styles.loader}
          />
        ) : (
          <View style={styles.packagesSection}>
            {packages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;
              const label = getPackageLabel(pkg);

              return (
                <Pressable
                  key={pkg.identifier}
                  style={[
                    styles.packageCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: isSelected
                        ? Brand.primary
                        : colors.cardBorder,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedPackage(pkg);
                  }}
                >
                  {label && (
                    <View
                      style={[
                        styles.packageBadge,
                        { backgroundColor: Brand.primary },
                      ]}
                    >
                      <Text style={styles.packageBadgeText}>{label}</Text>
                    </View>
                  )}
                  <View style={styles.packageContent}>
                    <Text style={[styles.packageTitle, { color: colors.text }]}>
                      {pkg.product.title}
                    </Text>
                    <Text
                      style={[styles.packagePrice, { color: Brand.primary }]}
                    >
                      {pkg.product.priceString}
                      <Text
                        style={[
                          styles.packagePeriod,
                          { color: colors.textMuted },
                        ]}
                      >
                        /{RevenueCat.getSubscriptionPeriod(pkg)}
                      </Text>
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.radioButton,
                      {
                        borderColor: isSelected
                          ? Brand.primary
                          : colors.textMuted,
                        backgroundColor: isSelected
                          ? Brand.primary
                          : "transparent",
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Restore link */}
        <Pressable style={styles.restoreButton} onPress={handleRestore}>
          <Text style={[styles.restoreText, { color: colors.textMuted }]}>
            Already purchased? Restore
          </Text>
        </Pressable>
      </ScrollView>

      {/* Purchase button */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.md,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          style={[styles.purchaseButton, { backgroundColor: Brand.primary }]}
          onPress={handlePurchase}
          disabled={!selectedPackage || isPurchasing}
        >
          {isPurchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.purchaseButtonText}>Continue</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </Pressable>
        <Text style={[styles.disclaimer, { color: colors.textMuted }]}>
          Cancel anytime. Subscription auto-renews.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
  },
  closeButton: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
    ...Shadows.glow(Brand.primary),
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    textAlign: "center",
    maxWidth: 280,
  },
  featuresSection: {
    marginBottom: Spacing.xl,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: FontSizes.sm,
  },
  loader: {
    marginVertical: Spacing.xl,
  },
  packagesSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  packageCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  packageBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  packageBadgeText: {
    color: "#fff",
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  packageContent: {
    flex: 1,
  },
  packageTitle: {
    fontSize: FontSizes.md,
    fontWeight: "500",
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  packagePeriod: {
    fontSize: FontSizes.sm,
    fontWeight: "400",
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  restoreButton: {
    alignItems: "center",
    padding: Spacing.md,
  },
  restoreText: {
    fontSize: FontSizes.sm,
    textDecorationLine: "underline",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
  },
  purchaseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.md,
  },
  purchaseButtonText: {
    color: "#fff",
    fontSize: FontSizes.lg,
    fontWeight: "600",
  },
  disclaimer: {
    fontSize: FontSizes.xs,
    textAlign: "center",
    marginTop: Spacing.sm,
  },
});
