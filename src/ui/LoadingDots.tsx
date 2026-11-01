import { type ReactNode, useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming,
} from "react-native-reanimated";
import { motion } from "./motion";

const STAGGER = 160;

function Dot({ index, still }: { index: number; still: boolean }) {
  const v = useSharedValue(1);
  useEffect(() => {
    if (still) {
      v.value = 1;
      return;
    }
    v.value = 0;
    // 0 -> 1 -> 0 over one cycle (reverse), each dot a little behind the last.
    v.value = withDelay(
      index * STAGGER,
      withRepeat(withTiming(1, { duration: motion.duration.dots / 2, easing: Easing.inOut(Easing.quad) }), -1, true),
    );
  }, [index, still, v]);
  const style = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * v.value, transform: [{ scale: 0.6 + 0.4 * v.value }] }));
  return (
    <Animated.View style={style}>
      <View className="h-1.5 w-1.5 rounded-full bg-paper" />
    </Animated.View>
  );
}

// A button label that cross-fades into three pulsing dots while `loading`. The label stays laid out
// (only its opacity changes), so the button never changes width. Reduced motion: dots stay lit.
export function LoadingDots({ loading, children }: { loading: boolean; children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const fade = useSharedValue(0);
  useEffect(() => {
    fade.value = withTiming(loading ? 1 : 0, { duration: motion.duration.fast, easing: motion.ease.standard, reduceMotion: ReduceMotion.Never });
  }, [loading, fade]);
  const label = useAnimatedStyle(() => ({ opacity: 1 - fade.value }));
  const dots = useAnimatedStyle(() => ({ opacity: fade.value }));
  return (
    <View className="items-center justify-center">
      <Animated.View style={label}>{children}</Animated.View>
      <Animated.View pointerEvents="none" style={[{ position: "absolute" }, dots]}>
        <View className="flex-row items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <Dot key={i} index={i} still={reduceMotion} />
          ))}
        </View>
      </Animated.View>
    </View>
  );
}
