import { Text, TextInput, View } from "react-native";
import Animated, { LinearTransition, useReducedMotion } from "react-native-reanimated";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";

const MAX = 200;

// The page owns the text: it clears it once the card was added, and keeps it when adding failed (a toast offers a retry).
type Props = { value: string; onChange: (value: string) => void; onSubmit: (context: string) => void; loading: boolean };

export function AddContextCard({ value, onChange, onSubmit, loading }: Props) {
  const reduceMotion = useReducedMotion();
  const canSubmit = value.trim().length > 0 && !loading;

  function submit() {
    if (canSubmit) onSubmit(value.trim());
  }

  return (
    // The card slides down when a new card is added above it.
    <Animated.View layout={reduceMotion ? undefined : LinearTransition.duration(motion.duration.fan).easing(motion.ease.fan)}>
      <View className="max-w-xl flex-row items-center gap-3 rounded-container border border-dashed border-line bg-paper p-4">
        <TextInput
          value={value}
          onChangeText={onChange}
          onSubmitEditing={submit}
          maxLength={MAX}
          returnKeyType="done"
          accessibilityLabel="บริบทที่ต้องการเพิ่ม"
          placeholder="เช่น ข้อความขอลาหัวหน้าคนญี่ปุ่น"
          placeholderClassName="text-muted"
          className="min-h-11 flex-1 rounded-element border border-line px-3 font-sans text-body text-ink"
        />
        <PressableScale
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={submit}
          className="min-h-11 items-center justify-center rounded-full bg-graphite px-6 hover:bg-ink"
        >
          <Text className="font-sans-semibold text-body text-paper">เพิ่ม</Text>
        </PressableScale>
      </View>
    </Animated.View>
  );
}
