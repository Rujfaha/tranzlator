import { useEffect, useState } from "react";
import { Modal, Text, useWindowDimensions, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { LANGS, type Lang } from "../api";
import { Check } from "./icons";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";
import { LANG_LABEL } from "./text";

type Props = {
  open: boolean;
  anchor?: { x: number; y: number; width: number; height: number }; // window rect of the tabs row the menu hangs under
  selected: Lang;
  onSelect: (lang: Lang) => void;
  onClose: () => void;
};

// Popover with all languages in 3 columns. A Modal gives click-outside and Esc (onRequestClose) on web and native alike.
export function LanguageMenu({ open, anchor, selected, onSelect, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const { width: screen } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Keep the Modal mounted until the exit animation has played.
    const cfg = { easing: motion.ease.standard, reduceMotion: ReduceMotion.Never };
    if (open) {
      setMounted(true);
      progress.value = withTiming(1, { ...cfg, duration: reduceMotion ? motion.duration.fast : motion.duration.exit });
      return;
    }
    progress.value = withTiming(0, { ...cfg, duration: motion.duration.fast });
    const t = setTimeout(() => setMounted(false), motion.duration.fast);
    return () => clearTimeout(t);
  }, [open, reduceMotion, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: reduceMotion ? 1 : 0.96 + 0.04 * progress.value }],
  }));

  const menuWidth = Math.min(Math.max(anchor?.width ?? 0, 320), screen - 24);
  const left = Math.min(Math.max(anchor?.x ?? 12, 12), screen - menuWidth - 12);
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <PressableScale accessibilityLabel="ปิด" onPress={onClose} className="absolute inset-0" />
      <Animated.View style={[{ position: "absolute", top: (anchor?.y ?? 0) + (anchor?.height ?? 0) + 4, left, width: menuWidth }, style]}>
        <View className="flex-row flex-wrap rounded-container bg-paper p-2 shadow-popover">
          {LANGS.map((lang) => (
            <PressableScale
              key={lang}
              accessibilityRole="button"
              accessibilityState={{ selected: lang === selected }}
              onPress={() => onSelect(lang)}
              className="w-1/3 min-h-11 flex-row items-center gap-2 rounded-element px-3 hover:bg-chip"
            >
              <View className="w-5">{lang === selected && <Check size={18} className="text-ink" />}</View>
              <Text className="flex-1 font-sans text-body text-ink">{LANG_LABEL[lang]}</Text>
            </PressableScale>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
}
