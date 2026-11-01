import { cssInterop } from "nativewind";
import { Pressable, type PressableProps } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { motion } from "./motion";

// className is not applied to Animated.* on web without this.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: "style" });

// Every tappable thing in the app goes through this: one press feel, one hover fade (web), one disabled look.
// Hover colours are plain `hover:` classes in the caller's className (Tailwind must see the literal class).
export function PressableScale({ disabled, onPressIn, onPressOut, className, ...props }: PressableProps & { className?: string }) {
  const reduceMotion = useReducedMotion();
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({
    opacity: disabled ? 0.4 : 1 - 0.15 * pressed.value,
    transform: [{ scale: reduceMotion ? 1 : 1 - (1 - motion.press.scale) * pressed.value }], // reduced motion: opacity only
  }));
  const to = (v: number) => {
    pressed.value = withTiming(v, { duration: motion.duration.fast, easing: motion.ease.standard, reduceMotion: ReduceMotion.Never });
  };
  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        to(1);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(0);
        onPressOut?.(e);
      }}
      className={`web:transition-colors web:duration-fast web:ease-standard ${className ?? ""}`}
      style={style}
    />
  );
}
