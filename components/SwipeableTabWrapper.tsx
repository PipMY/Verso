import { useRouter } from "expo-router";
import React, { useRef } from "react";
import {
    PanResponder,
    Animated as RNAnimated,
    StyleSheet
} from "react-native";

const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY = 0.3;

const TAB_ROUTES = ["/(tabs)", "/(tabs)/explore", "/(tabs)/settings"] as const;

interface SwipeableTabWrapperProps {
  tabIndex: number;
  children: React.ReactNode;
}

export function SwipeableTabWrapper({
  tabIndex,
  children,
}: SwipeableTabWrapperProps) {
  const router = useRouter();
  const translateX = useRef(new RNAnimated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only respond to horizontal gestures that are more horizontal than vertical
        return (
          Math.abs(gestureState.dx) > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderGrant: () => {
        translateX.setValue(0);
      },
      onPanResponderMove: (_evt, gestureState) => {
        // Clamp at edges
        if (tabIndex === 0 && gestureState.dx > 0) return;
        if (tabIndex === TAB_ROUTES.length - 1 && gestureState.dx < 0) return;
        // Subtle visual feedback (dampened)
        translateX.setValue(gestureState.dx * 0.15);
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const swipedLeft =
          gestureState.dx < -SWIPE_THRESHOLD ||
          gestureState.vx < -SWIPE_VELOCITY;
        const swipedRight =
          gestureState.dx > SWIPE_THRESHOLD || gestureState.vx > SWIPE_VELOCITY;

        RNAnimated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 120,
          friction: 14,
        }).start();

        if (swipedLeft && tabIndex < TAB_ROUTES.length - 1) {
          router.navigate(TAB_ROUTES[tabIndex + 1] as any);
        } else if (swipedRight && tabIndex > 0) {
          router.navigate(TAB_ROUTES[tabIndex - 1] as any);
        }
      },
      onPanResponderTerminate: () => {
        RNAnimated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  return (
    <RNAnimated.View
      style={[styles.wrapper, { transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {children}
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
});
