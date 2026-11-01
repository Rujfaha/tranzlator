import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Lang } from "../api";
import { ArrowRight, ChevronDown } from "./icons";
import { PressableScale } from "./PressableScale";
import { LANG_LABEL } from "./text";

type Props = {
  detected?: string; // source language name once known
  target: Lang;
  onOpenLanguages: () => void;
  onTranslate: () => void;
  canTranslate: boolean;
  loading: boolean;
};

// Mobile: language pills + translate, pinned to the bottom (the layout lifts it above the keyboard).
// Source is always auto-detected, so there is an arrow instead of a swap button.
export function BottomDock({ detected, target, onOpenLanguages, onTranslate, canTranslate, loading }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingBottom: insets.bottom + 12 }} className="gap-2 border-t border-line bg-paper px-4 pt-3">
      <View className="h-12 flex-row items-center gap-3">
        <View className="h-12 flex-1 items-center justify-center rounded-container bg-chip">
          <Text numberOfLines={1} className="font-sans-medium text-body text-muted">{detected ?? "ตรวจหาภาษา"}</Text>
        </View>
        <ArrowRight size={20} className="text-muted" />
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`ภาษาปลายทาง ${LANG_LABEL[target]}`}
          onPress={onOpenLanguages}
          className="h-12 flex-1 flex-row items-center justify-center gap-1 rounded-container bg-chip hover:bg-line"
        >
          <Text numberOfLines={1} className="font-sans-medium text-body text-ink">{LANG_LABEL[target]}</Text>
          <ChevronDown size={18} className="text-ink" />
        </PressableScale>
      </View>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: !canTranslate, busy: loading }}
        disabled={!canTranslate}
        onPress={onTranslate}
        style={{ height: 52 }}
        className="items-center justify-center rounded-full bg-graphite hover:bg-ink"
      >
        <Text className="font-sans-semibold text-input text-paper">แปล</Text>
      </PressableScale>
    </View>
  );
}
