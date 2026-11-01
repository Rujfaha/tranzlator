import * as Clipboard from "expo-clipboard";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeIn, FadeInDown, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming,
} from "react-native-reanimated";
import type { Result } from "../api";
import { Check, Copy } from "./icons";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";
import { useToast } from "./Toast";

const GAP = 12; // matches the deck's gap-3: how far apart cards sit once fanned out

type Props = { result: Result; selected: boolean; onSelect: () => void; index: number };

// Icon swap: scale .6 -> 1 with a fade (reduced motion: fade only).
function Pop({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(1, { duration: motion.duration.fast, easing: motion.ease.standard, reduceMotion: ReduceMotion.Never });
  }, [p]);
  const style = useAnimatedStyle(() => ({ opacity: p.value, transform: [{ scale: reduceMotion ? 1 : 0.6 + 0.4 * p.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export function ContextCard({ result, selected, onSelect, index }: Props) {
  const reduceMotion = useReducedMotion();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const fan = !result.custom; // AI results fan out once on mount; custom cards slide in
  const progress = useSharedValue(fan ? 0 : 1);
  const height = useSharedValue(0);
  const started = useRef(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  // Card i starts stacked on card 0, tilted i degrees, then unfolds to its place.
  const fanStyle = useAnimatedStyle(() => {
    const rest = 1 - progress.value;
    return {
      opacity: progress.value,
      transform: reduceMotion ? [] : [{ translateY: -index * (height.value + GAP) * rest }, { rotate: `${index * rest}deg` }],
    };
  });

  const entering = reduceMotion
    ? FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)
    : FadeInDown.duration(motion.duration.fan).easing(motion.ease.fan);

  return (
    <Animated.View entering={fan ? undefined : entering} style={[fan ? fanStyle : null, { zIndex: 100 - index }]}>
      <View
        onLayout={(e) => {
          height.value = e.nativeEvent.layout.height;
          if (fan && !started.current) {
            started.current = true; // measured once, so the fan never replays on re-render
            const timing = withTiming(1, {
              duration: reduceMotion ? motion.duration.fast : motion.duration.fan,
              easing: motion.ease.fan,
              reduceMotion: ReduceMotion.Never, // Reanimated would otherwise skip the 125ms fade too
            });
            progress.value = reduceMotion ? timing : withDelay(index * motion.stagger, timing);
          }
        }}
        className={`max-w-xl rounded-container border bg-paper shadow-card hover:shadow-card-hover ${selected ? "border-ink" : "border-transparent"}`}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={onSelect}
          className="items-start gap-1.5 rounded-container p-4 pr-16"
        >
          <View className={`rounded-full px-3 py-1 ${selected ? "bg-graphite" : "bg-chip"}`}>
            <Text className={`font-sans-medium text-note ${selected ? "text-paper" : "text-ink"}`}>{result.context}</Text>
          </View>
          <Text selectable className="font-sans text-translation text-ink">{result.text}</Text>
          <Text className="font-sans text-note text-muted">{result.note}</Text>
        </PressableScale>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="คัดลอกคำแปล"
          onPress={async () => {
            try {
              await Clipboard.setStringAsync(result.text);
              setCopied(true);
              toast.show({ kind: "success", message: "คัดลอกแล้ว" });
            } catch {} // clipboard can be denied (e.g. insecure origin); the icon just stays "copy"
          }}
          className="absolute right-1.5 top-1.5 h-11 w-11 items-center justify-center rounded-full hover:bg-chip"
        >
          {copied ? (
            <Pop key="done"><Check size={20} className="text-ink" /></Pop>
          ) : (
            <Pop key="copy"><Copy size={20} className="text-muted" /></Pop>
          )}
        </PressableScale>
      </View>
    </Animated.View>
  );
}
