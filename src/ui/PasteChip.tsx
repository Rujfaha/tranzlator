import * as Clipboard from "expo-clipboard";
import { Text } from "react-native";
import { ClipboardPaste } from "./icons";
import { PressableScale } from "./PressableScale";
import { clampPaste } from "./text";
import { useToast } from "./Toast";

export function PasteChip({ onPaste }: { onPaste: (text: string) => void }) {
  const toast = useToast();
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={async () => {
        let s = "";
        try {
          s = await Clipboard.getStringAsync();
        } catch {} // unreadable (e.g. web permission denied) is treated as empty
        if (s.trim()) onPaste(clampPaste(s));
        else toast.show({ kind: "info", message: "ไม่มีข้อความในคลิปบอร์ด" });
      }}
      className="min-h-11 flex-row items-center gap-2 self-start rounded-full bg-chip px-4 hover:bg-line"
    >
      <ClipboardPaste size={18} className="text-ink" />
      <Text className="font-sans-medium text-body text-ink">วาง</Text>
    </PressableScale>
  );
}
