import { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Text, TextInput, useWindowDimensions, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { type Lang, LANGUAGES, langName, searchLanguages } from "../../shared/languages";
import { Check, Search } from "./icons";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";

type Props = {
  open: boolean;
  anchor?: { x: number; y: number; width: number; height: number }; // window rect of the tabs row the menu hangs under
  selected: Lang;
  onSelect: (lang: Lang) => void;
  onClose: () => void;
};

const ROW = 44; // fixed row height: lets the list jump to a row without measuring
const MAX_HEIGHT = 420;
const ALL = LANGUAGES.map((l) => l.code);

// Popover with a search field over a grid of every language (4 columns from 1024px, else 3).
// A Modal gives click-outside and Esc (onRequestClose) on web and native alike.
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

  const cols = screen >= 1024 ? 4 : 3;
  const menuWidth = Math.min(cols * 168 + 16, screen - 24);
  const left = Math.min(Math.max(anchor?.x ?? 12, 12), screen - menuWidth - 12);
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <PressableScale accessibilityLabel="ปิด" onPress={onClose} className="absolute inset-0" />
      <Animated.View style={[{ position: "absolute", top: (anchor?.y ?? 0) + (anchor?.height ?? 0) + 4, left, width: menuWidth }, style]}>
        {/* The body is only mounted while the menu is shown, so every opening starts with an empty search. */}
        <Picker cols={cols} selected={selected} onSelect={onSelect} />
      </Animated.View>
    </Modal>
  );
}

function Picker({ cols, selected, onSelect }: { cols: number; selected: Lang; onSelect: (lang: Lang) => void }) {
  const list = useRef<FlatList<Lang[]>>(null);
  const [query, setQuery] = useState("");
  const codes = useMemo(() => searchLanguages(query), [query]);
  const rows = useMemo(() => {
    const out: Lang[][] = [];
    for (let i = 0; i < codes.length; i += cols) out.push(codes.slice(i, i + cols));
    return out;
  }, [codes, cols]);
  const [active, setActive] = useState(Math.max(0, ALL.indexOf(selected))); // the keyboard cursor, an index into `codes`
  const cursor = Math.min(active, codes.length - 1);

  const move = (to: number) => {
    const next = Math.min(Math.max(to, 0), codes.length - 1);
    setActive(next);
    list.current?.scrollToIndex({ index: Math.floor(next / cols), animated: false, viewPosition: 0.5 });
  };
  const onKeyPress = (e: { nativeEvent: { key: string }; preventDefault?: () => void }) => {
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols };
    const key = e.nativeEvent.key;
    if (key in step) {
      e.preventDefault?.(); // keep the caret where it is
      if (codes.length) move(cursor + step[key]);
    } else if (key === "Enter" && codes.length) {
      e.preventDefault?.();
      onSelect(codes[cursor]);
    }
  };

  return (
    <View className="rounded-container bg-paper pb-2 shadow-popover">
      <View className="m-2 h-11 flex-row items-center gap-2 rounded-element bg-chip px-3">
        <Search size={18} className="text-muted" />
        <TextInput
          autoFocus
          value={query}
          onChangeText={(q) => {
            setQuery(q);
            setActive(0);
            list.current?.scrollToOffset({ offset: 0, animated: false });
          }}
          onKeyPress={onKeyPress}
          accessibilityLabel="ค้นหาภาษา"
          placeholder="ค้นหาภาษา"
          placeholderClassName="text-muted"
          className="flex-1 font-sans text-body text-ink outline-none"
        />
      </View>
      {rows.length === 0 ? (
        <Text className="px-4 py-6 font-sans text-body text-muted">ไม่พบภาษาที่ตรงกับ “{query.trim()}”</Text>
      ) : (
        <FlatList
          ref={list}
          key={cols}
          data={rows}
          keyExtractor={(r) => r[0]}
          style={{ maxHeight: MAX_HEIGHT }}
          contentContainerClassName="px-2"
          keyboardShouldPersistTaps="handled"
          getItemLayout={(_, index) => ({ length: ROW, offset: ROW * index, index })}
          initialScrollIndex={query ? undefined : Math.floor(Math.max(0, ALL.indexOf(selected)) / cols)}
          renderItem={({ item: row, index: r }) => (
            <View style={{ height: ROW }} className="flex-row">
              {row.map((lang, c) => (
                <PressableScale
                  key={lang}
                  accessibilityRole="button"
                  accessibilityState={{ selected: lang === selected }}
                  onPress={() => onSelect(lang)}
                  style={{ width: `${100 / cols}%` }}
                  className={`h-11 flex-row items-center gap-2 rounded-element px-3 hover:bg-chip ${r * cols + c === cursor ? "bg-chip" : ""}`}
                >
                  <View className="w-5">{lang === selected && <Check size={18} className="text-ink" />}</View>
                  <Text numberOfLines={1} className="flex-1 font-sans text-body text-ink">{langName(lang)}</Text>
                </PressableScale>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}
