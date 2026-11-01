import { useEffect, useState } from "react";
import { Modal, ScrollView, Text, useWindowDimensions, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { LANGS, type Lang } from "../api";
import { ArrowLeft, Check } from "./icons";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";
import { LANG_LABEL } from "./text";

type Props = { open: boolean; recents: Lang[]; selected: Lang; onSelect: (lang: Lang) => void; onClose: () => void };

// Full-screen "translate to" page (mobile). Modal's onRequestClose is the Android back button.
export function LanguageSheet({ open, recents, selected, onSelect, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Slide up 300ms, down 200ms; the Modal stays mounted until the exit has played. Reduced motion: fade only.
    const cfg = { easing: motion.ease.standard, reduceMotion: ReduceMotion.Never };
    if (open) {
      setMounted(true);
      progress.value = withTiming(1, { ...cfg, duration: reduceMotion ? motion.duration.fast : motion.duration.sheet });
      return;
    }
    const ms = reduceMotion ? motion.duration.fast : motion.duration.exit;
    progress.value = withTiming(0, { ...cfg, duration: ms });
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, reduceMotion, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? progress.value : 1,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * height }],
  }));

  const row = (lang: Lang) => (
    <PressableScale
      key={lang}
      accessibilityRole="button"
      accessibilityState={{ selected: lang === selected }}
      onPress={() => onSelect(lang)}
      className={`h-14 flex-row items-center rounded-full px-4 ${lang === selected ? "bg-chip" : "hover:bg-chip"}`}
    >
      <Text className="flex-1 font-sans text-input text-ink">{LANG_LABEL[lang]}</Text>
      {lang === selected && <Check size={20} className="text-ink" />}
    </PressableScale>
  );
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[{ flex: 1 }, style]}>
        <SafeAreaView className="flex-1 bg-paper">
          <View className="h-14 justify-center px-2">
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="ย้อนกลับ"
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full hover:bg-chip"
            >
              <ArrowLeft size={24} className="text-ink" />
            </PressableScale>
          </View>
          <ScrollView contentContainerClassName="px-2 pb-6">
            <Text accessibilityRole="header" className="px-4 pb-4 font-sans-semibold text-title text-ink">แปลเป็นภาษา</Text>
            <Text className="px-4 pb-1 font-sans text-note text-muted">ภาษาที่ใช้ล่าสุด</Text>
            {recents.map(row)}
            <Text className="px-4 pb-1 pt-4 font-sans text-note text-muted">ภาษาทั้งหมด</Text>
            {LANGS.map(row)}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}
