import { Text, View } from "react-native";
import { CircleAlert } from "./icons";
import { PressableScale } from "./PressableScale";
import { Rise } from "./Rise";

type Props = { message: string; onRetry: () => void; onSettings?: () => void }; // onSettings: only for a rejected key (401)

// Translation failures live in the result card, not in a toast: the thing to retry is right there.
export function InlineError({ message, onRetry, onSettings }: Props) {
  return (
    <Rise px={8}>
      <View className="flex-row items-start gap-3">
        <View className="pt-0.5">
          <CircleAlert size={20} className="text-danger" />
        </View>
        <View className="flex-1 items-start">
          <Text accessibilityRole="alert" className="font-sans text-body text-ink">{message}</Text>
          <View className="flex-row gap-4">
            <PressableScale accessibilityRole="button" onPress={onRetry} className="min-h-11 justify-center">
              <Text className="font-sans-semibold text-body text-ink hover:underline">ลองอีกครั้ง</Text>
            </PressableScale>
            {onSettings && (
              <PressableScale accessibilityRole="button" onPress={onSettings} className="min-h-11 justify-center">
                <Text className="font-sans-semibold text-body text-ink hover:underline">ตั้งค่า</Text>
              </PressableScale>
            )}
          </View>
        </View>
      </View>
    </Rise>
  );
}
