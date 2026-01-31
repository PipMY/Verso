import { Platform } from "react-native";
import Purchases, {
    CustomerInfo,
    LOG_LEVEL,
    PurchasesPackage,
} from "react-native-purchases";

// Replace these with your actual RevenueCat API keys
const API_KEYS = {
  ios: "appl_YOUR_IOS_API_KEY",
  android: "goog_YOUR_ANDROID_API_KEY",
};

export interface SubscriptionStatus {
  isProUser: boolean;
  activeSubscription?: string;
  expirationDate?: Date;
}

// Initialize RevenueCat
export async function initializeRevenueCat(): Promise<void> {
  try {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);

    const apiKey = Platform.OS === "ios" ? API_KEYS.ios : API_KEYS.android;

    await Purchases.configure({ apiKey });

    console.log("RevenueCat initialized successfully");
  } catch (error) {
    console.error("Error initializing RevenueCat:", error);
  }
}

// Get available packages/offerings
export async function getOfferings(): Promise<PurchasesPackage[]> {
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
