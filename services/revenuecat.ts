import Constants from "expo-constants";
import { Platform } from "react-native";
import Purchases, {
    CustomerInfo,
    LOG_LEVEL,
    PurchasesPackage,
} from "react-native-purchases";

const API_KEYS = {
  ios: "test_mqFVmMFiTnlObipFTNbincfOHmD",
  android: "test_mqFVmMFiTnlObipFTNbincfOHmD",
};

export interface SubscriptionStatus {
  isProUser: boolean;
  activeSubscription?: string;
  expirationDate?: Date;
}

// Check if running in Expo Go
function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

// Track if RevenueCat was successfully initialized
let revenueCatInitialized = false;

// Initialize RevenueCat
export async function initializeRevenueCat(): Promise<void> {
  // Skip RevenueCat initialization in Expo Go - it doesn't support native purchases
  if (isExpoGo()) {
    console.log(
      "Running in Expo Go - RevenueCat features disabled. Use a development build for full functionality.",
    );
    return;
  }

  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    const apiKey = Platform.OS === "ios" ? API_KEYS.ios : API_KEYS.android;

    await Purchases.configure({ apiKey });

    revenueCatInitialized = true;
    console.log("RevenueCat initialized successfully");
  } catch (error) {
    console.error("Error initializing RevenueCat:", error);
  }
}

// Get available packages/offerings
export async function getOfferings(): Promise<PurchasesPackage[]> {
  if (!revenueCatInitialized) {
    console.log("RevenueCat not initialized - returning empty offerings");
    return [];
  }

  try {
    const offerings = await Purchases.getOfferings();

    if (offerings.current?.availablePackages) {
      return offerings.current.availablePackages;
    }

    return [];
  } catch (error) {
    console.error("Error fetching offerings:", error);
    return [];
  }
}

// Purchase a package
export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<CustomerInfo | null> {
  if (!revenueCatInitialized) {
    console.log("RevenueCat not initialized - cannot purchase");
    return null;
  }

  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    return customerInfo;
  } catch (error: any) {
    if (error.userCancelled) {
      console.log("User cancelled purchase");
    } else {
      console.error("Error purchasing:", error);
    }
    return null;
  }
}

// Restore purchases
export async function restorePurchases(): Promise<CustomerInfo | null> {
  if (!revenueCatInitialized) {
    console.log("RevenueCat not initialized - cannot restore purchases");
    return null;
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo;
  } catch (error) {
    console.error("Error restoring purchases:", error);
    return null;
  }
}

// Get current subscription status
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  if (!revenueCatInitialized) {
    // In Expo Go, return free user status
    return { isProUser: false };
  }

  try {
    const customerInfo = await Purchases.getCustomerInfo();

    // Check for active entitlements
    const isProUser = customerInfo.entitlements.active["pro"] !== undefined;

    // Get active subscription details
    let activeSubscription: string | undefined;
    let expirationDate: Date | undefined;

    if (isProUser) {
      const proEntitlement = customerInfo.entitlements.active["pro"];
      activeSubscription = proEntitlement?.productIdentifier;
      if (proEntitlement?.expirationDate) {
        expirationDate = new Date(proEntitlement.expirationDate);
      }
    }

    return {
      isProUser,
      activeSubscription,
      expirationDate,
    };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return { isProUser: false };
  }
}

// Set user ID for attribution
export async function setUserId(userId: string): Promise<void> {
  if (!revenueCatInitialized) {
    return;
  }

  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.error("Error setting user ID:", error);
  }
}

// Listen for customer info updates
export function addCustomerInfoListener(
  callback: (customerInfo: CustomerInfo) => void,
): () => void {
  if (!revenueCatInitialized) {
    return () => {};
  }

  Purchases.addCustomerInfoUpdateListener(callback);
  // RevenueCat SDK handles listener cleanup internally
  return () => {};
}

// Feature flags based on subscription
export function getFeatureAccess(isProUser: boolean) {
  return {
    // Free features
    maxReminders: isProUser ? Infinity : 10,
    customSnoozePresets: isProUser,
    unlimitedRecurrence: isProUser,
    cloudSync: isProUser,
    themes: isProUser,
    widgets: isProUser,

    // Always available
    basicReminders: true,
    notifications: true,
    basicRecurrence: true,
  };
}

// Product identifiers
export const PRODUCT_IDS = {
  MONTHLY: "verso_pro_monthly",
  YEARLY: "verso_pro_yearly",
  LIFETIME: "verso_pro_lifetime",
};

// Format price for display
export function formatPrice(pkg: PurchasesPackage): string {
  return pkg.product.priceString;
}

// Get subscription period description
export function getSubscriptionPeriod(pkg: PurchasesPackage): string {
  const identifier = pkg.identifier;

  if (identifier.includes("monthly")) return "month";
  if (identifier.includes("yearly") || identifier.includes("annual"))
    return "year";
  if (identifier.includes("lifetime")) return "lifetime";

  return "subscription";
}
