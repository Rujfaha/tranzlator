import { Text, View } from "react-native";
import { ArrowUpRight, KeyRound } from "./icons";
import { PressableScale } from "./PressableScale";
import { Rise } from "./Rise";

// A hint, not a call to action: a quiet row, in the style of Google Translate's suggestion rows.  `onShell`: on the grey result card the row flips to white.
export function KeySuggestion({ onPress, onShell }: { onPress: () => void; onShell?: boolean }) {
  return (
    <Rise px={8}>
      <PressableScale
        accessibilityRole="button"
        onPress={onPress}
        className={`flex-row items-center gap-3 rounded-element p-4 ${onShell ? "bg-paper hover:bg-chip" : "bg-chip hover:bg-line"}`}
      >
        <KeyRound size={20} className="text-ink" />
        <View className="flex-1">
          <Text className="font-sans-semibold text-body text-ink">ใส่ API key ของคุณเพื่อเริ่มแปล</Text>
          <Text className="font-sans text-note text-muted">เลือกผู้ให้บริการและใส่ key ในการตั้งค่า</Text>
        </View>
        <ArrowUpRight size={20} className="text-muted" />
      </PressableScale>
    </Rise>
  );
}
