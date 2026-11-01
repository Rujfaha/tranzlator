import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { FadeIn, FadeOut, ReduceMotion } from "react-native-reanimated";
import { X } from "./icons";
import { LoadingDots } from "./LoadingDots";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";
import { MAX_SOURCE, type sourceSize } from "./text";

// Literal class names so Tailwind generates them (`text-${size}` would not be scanned).
const SIZE_CLASS = { "source-lg": "text-source-lg", "source-md": "text-source-md", "source-sm": "text-source-sm" };
const fadeIn = FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never);
const fadeOut = FadeOut.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never);

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  variant: "card" | "bare"; // card: bordered box with its own translate button (wide); bare: borderless, translate lives in the dock (mobile)
  size: ReturnType<typeof sourceSize>;
  compact?: boolean;
};

export function SourcePane({ value, onChange, onSubmit, loading, variant, size, compact }: Props) {
  const over = value.length > MAX_SOURCE;
  const ready = value.trim().length > 0 && !over && !loading;
  // While loading the button keeps its normal look (dots inside) and presses do nothing: submit is single-flight.
  const canPress = value.trim().length > 0 && !over;
  const card = variant === "card";
  const [focused, setFocused] = useState(false); // the card border stands in for the focus ring around the whole box
  const counter = (
    <Text className={`font-sans text-note ${over ? "text-danger" : "text-muted"}`}>
      {value.length}/{MAX_SOURCE}
      {over && "  ยาวเกิน 2000 ตัวอักษร"}
    </Text>
  );
  return (
    <View
      style={card ? { minHeight: compact ? 140 : 220 } : undefined}
      className={card ? `flex-1 rounded-container border bg-paper ${focused ? "border-ink" : "border-line"}` : ""}
    >
      <TextInput
        multiline
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyPress={(e) => {
          const k = e.nativeEvent as unknown as { key: string; ctrlKey?: boolean; metaKey?: boolean };
          if (k.key === "Enter" && (k.ctrlKey || k.metaKey) && ready) onSubmit(); // without a key the page shows the key tip
        }}
        accessibilityLabel="ข้อความที่ต้องการแปล"
        placeholder={card ? "พิมพ์ข้อความที่ต้องการแปล" : "แปลข้อความ"}
        placeholderClassName={card ? "text-muted" : "text-disabled"}
        textAlignVertical="top"
        className={`px-4 pt-4 font-sans text-ink outline-none ${SIZE_CLASS[size]} ${card ? "flex-1 pr-14" : "min-h-40"}`}
      />
      {card && value.length > 0 && (
        <Animated.View entering={fadeIn} exiting={fadeOut} style={{ position: "absolute", right: 6, top: 6 }}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="ล้างข้อความ"
            onPress={() => onChange("")}
            className="h-11 w-11 items-center justify-center rounded-full hover:bg-chip"
          >
            <X size={20} className="text-muted" />
          </PressableScale>
        </Animated.View>
      )}
      {card ? (
        <View className="flex-row items-center gap-3 p-4">
          <View className="flex-1">{counter}</View>
          <PressableScale
            accessibilityRole="button"
            accessibilityState={{ disabled: !canPress, busy: loading }}
            disabled={!canPress}
            onPress={onSubmit}
            className="min-h-11 items-center justify-center rounded-full bg-graphite px-6 hover:bg-ink"
          >
            <LoadingDots loading={loading}>
              <Text className="font-sans-semibold text-body text-paper">แปล</Text>
            </LoadingDots>
          </PressableScale>
        </View>
      ) : (
        (over || value.length > 0) && <View className="px-4 pb-2">{counter}</View>
      )}
    </View>
  );
}
