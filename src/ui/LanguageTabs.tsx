import { type ReactNode, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";

type Props = {
  items: { key: string; label: string }[];
  active: string;
  onSelect?: (key: string) => void; // omitted: a single static tab (the source side)
  trailing?: ReactNode;
};

// Google-Translate-style language tabs: the underline slides to the tab that becomes active.
export function LanguageTabs({ items, active, onSelect, trailing }: Props) {
  const reduceMotion = useReducedMotion();
  const [layouts, setLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const x = useSharedValue(0);
  const width = useSharedValue(0);
  const placed = useRef(false);
  const rect = layouts[active];

  useEffect(() => {
    if (!rect) return;
    if (!placed.current || reduceMotion) {
      placed.current = true; // first measure, or reduced motion: jump instead of sliding
      x.value = rect.x;
      width.value = rect.width;
      return;
    }
    const cfg = { duration: motion.duration.sheet, easing: motion.ease.standard, reduceMotion: ReduceMotion.Never };
    x.value = withTiming(rect.x, cfg);
    width.value = withTiming(rect.width, cfg);
  }, [rect, reduceMotion, x, width]);
  const underline = useAnimatedStyle(() => ({ width: width.value, transform: [{ translateX: x.value }] }));

  return (
    <View className="flex-row items-center border-b border-line">
      <View className="-mb-px flex-row">
        {items.map(({ key, label }) => {
          const selected = key === active;
          const text = (
            <Text
              className={`font-sans-medium text-body web:transition-colors web:duration-fast web:ease-standard ${selected ? "text-ink" : "text-muted hover:text-ink"}`}
            >
              {label}
            </Text>
          );
          const onLayout = (e: { nativeEvent: { layout: { x: number; width: number } } }) => {
            const { x: lx, width: lw } = e.nativeEvent.layout;
            setLayouts((l) => (l[key]?.x === lx && l[key]?.width === lw ? l : { ...l, [key]: { x: lx, width: lw } }));
          };
          return onSelect ? (
            <PressableScale
              key={key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onLayout={onLayout}
              onPress={() => onSelect(key)}
              className="min-h-12 justify-center px-4"
            >
              {text}
            </PressableScale>
          ) : (
            <View key={key} onLayout={onLayout} className="min-h-12 justify-center px-4">{text}</View>
          );
        })}
        <Animated.View pointerEvents="none" style={[{ position: "absolute", bottom: 0, left: 0 }, underline]}>
          <View className="h-0.5 bg-ink" />
        </Animated.View>
      </View>
      <View className="flex-1" />
      {trailing}
    </View>
  );
}
