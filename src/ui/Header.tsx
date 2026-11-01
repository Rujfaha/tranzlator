import type { ComponentRef, Ref } from "react";
import { View } from "react-native";
import { Settings } from "./icons";
import { Logo } from "./Logo";
import { PressableScale } from "./PressableScale";

type Props = {
  compact: boolean; // short landscape window
  wide: boolean;
  needsKey: boolean; // no API key yet: dot on the settings icon
  onHome: () => void;
  onSettings: () => void;
  settingsRef: Ref<ComponentRef<typeof View>>; // lets the page measure the icon the key tip points at
};

export function Header({ compact, wide, needsKey, onHome, onSettings, settingsRef }: Props) {
  return (
    <View className={wide ? "border-b border-line" : ""}>
      <View
        style={{ maxWidth: 1200 }}
        className={`w-full flex-row items-center self-center px-4 ${compact ? "h-12" : wide ? "h-16 px-6" : "h-14"}`}
      >
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="tranzlator หน้าแรก"
          onPress={onHome}
          className="min-h-11 justify-center rounded-element"
        >
          <Logo size={wide ? 28 : 25} />
        </PressableScale>
        <View className="flex-1" />
        <View ref={settingsRef} collapsable={false}>
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={needsKey ? "ตั้งค่า (ยังไม่ได้ใส่ API key)" : "ตั้งค่า"}
            onPress={onSettings}
            className="h-11 w-11 items-center justify-center rounded-full hover:bg-chip"
          >
            <Settings size={22} className="text-ink" />
            {needsKey && <View className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-ink" />}
          </PressableScale>
        </View>
      </View>
    </View>
  );
}
