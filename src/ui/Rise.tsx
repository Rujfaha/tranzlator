import { type ReactNode, useEffect } from "react";
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { motion } from "./motion";

// Fade + rise `px` on mount. Shared values, not a Reanimated `entering` Keyframe: on web that
// pins the element to position:absolute afterwards and pulls it out of the layout flow.
// Reduced motion: plain 125ms fade.
export function Rise({ px, children }: { px: number; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reduceMotion ? motion.duration.fast : motion.duration.sheet,
      easing: motion.ease.standard,
      reduceMotion: ReduceMotion.Never, // Reanimated would otherwise skip even the fade
    });
  }, [progress, reduceMotion]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * px }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}
