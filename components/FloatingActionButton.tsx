import { BorderRadius, Brand, Shadows, Spacing } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, StyleSheet, ViewStyle } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FloatingActionButton({
  onPress,
  icon = "add",
  color = Brand.primary,
  style,
}: FloatingActionButtonProps) {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rotation.value = withSpring(rotation.value + 90, { damping: 15 });
    onPress();
  };

  return (
    <AnimatedPressable
      style={[
        styles.container,
        { backgroundColor: color },
        Shadows.glow(color),
        animatedStyle,
        style,
      ]}
      onPress={handlePress}
      onPressIn={() => {
        scale.value = withSpring(0.9);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
    >
      <Ionicons name={icon} size={28} color="#fff" />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },
});
