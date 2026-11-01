import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming,
} from "react-native-reanimated";
import type { Result } from "../api";
import { AddContextCard } from "./AddContextCard";
import { ContextCard } from "./ContextCard";

type Props = {
  results: Result[];
  batch: number; // changes per translate response, so the fan-out runs once per new set
  loading: boolean;
  error: string | null;
  selected: number | null;
  onSelect: (index: number) => void;
  onRetry: () => void;
  onAdd: (context: string) => Promise<void>;
  adding: boolean;
};

export function ContextDeck({ results, batch, loading, error, selected, onSelect, onRetry, onAdd, adding }: Props) {
  if (loading) return <Skeleton />;
  if (error) {
    return (
      <View className="items-start gap-3">
        <Text accessibilityRole="alert" className="font-sans text-body text-danger">{error}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="min-h-11 items-center justify-center rounded-full bg-graphite px-6 active:opacity-80"
        >
          <Text className="font-sans-semibold text-body text-paper">ลองอีกครั้ง</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View className="gap-3">
      {results.map((r, i) => (
        <ContextCard key={`${batch}-${i}`} result={r} index={i} selected={selected === i} onSelect={() => onSelect(i)} />
      ))}
      <AddContextCard onSubmit={onAdd} loading={adding} />
    </View>
  );
}

// Three stacked placeholder cards that breathe (opacity .4 <-> 1); static under reduced motion.
function Skeleton() {
  const reduceMotion = useReducedMotion();
  const breath = useSharedValue(1);
  useEffect(() => {
    if (!reduceMotion) breath.value = withRepeat(withTiming(0.4, { duration: 1200 }), -1, true);
  }, [breath, reduceMotion]);
  const style = useAnimatedStyle(() => ({ opacity: breath.value }));
  return (
    <Animated.View style={style}>
      <View accessibilityLabel="กำลังแปล" className="h-40 max-w-xl">
        {[2, 1, 0].map((i) => (
          <View
            key={i}
            style={{ top: i * 12 }}
            className="absolute inset-x-0 h-28 gap-3 rounded-container border border-line bg-paper p-4 shadow-card"
          >
            <View className="h-5 w-20 rounded-full bg-chip" />
            <View className="h-6 w-full rounded-inner bg-chip" />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}
