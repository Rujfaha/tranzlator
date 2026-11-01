import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { LinearTransition, useReducedMotion } from "react-native-reanimated";
import { motion } from "./motion";

const MAX = 200;

type Props = { onSubmit: (context: string) => Promise<void>; loading: boolean };

export function AddContextCard({ onSubmit, loading }: Props) {
  const reduceMotion = useReducedMotion();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const canSubmit = value.trim().length > 0 && !loading;

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    try {
      await onSubmit(value.trim());
      setValue("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    // The card slides down when a new card is added above it.
    <Animated.View layout={reduceMotion ? undefined : LinearTransition.duration(motion.duration.fan).easing(motion.ease.fan)}>
      <View className="max-w-xl gap-3 rounded-container border border-dashed border-line p-4">
        <View className="flex-row items-center gap-3">
          <TextInput
            value={value}
            onChangeText={setValue}
            onSubmitEditing={submit}
            maxLength={MAX}
            returnKeyType="done"
            accessibilityLabel="บริบทที่ต้องการเพิ่ม"
            placeholder="เช่น ข้อความขอลาหัวหน้าคนญี่ปุ่น"
            placeholderClassName="text-muted"
            className="min-h-11 flex-1 rounded-element border border-line px-3 font-sans text-body text-ink"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSubmit }}
            disabled={!canSubmit}
            onPress={submit}
            className={`min-h-11 items-center justify-center rounded-full px-6 ${canSubmit ? "bg-graphite active:opacity-80" : "bg-disabled"}`}
          >
            <Text className="font-sans-semibold text-body text-paper">เพิ่ม</Text>
          </Pressable>
        </View>
        {error && <Text className="font-sans text-note text-danger">{error}</Text>}
      </View>
    </Animated.View>
  );
}
