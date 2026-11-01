import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Text, TextInput, useWindowDimensions, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Lang, langName, searchLanguages } from "../../shared/languages";
import { ArrowLeft, Check, Search, X } from "./icons";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";

type Props = { open: boolean; recents: Lang[]; selected: Lang; onSelect: (lang: Lang) => void; onClose: () => void };

const TITLE_ROW = 64; // 8 (top padding) + 36 (text-title line) + 20: the height the title row collapses from
// className is not applied to Animated.* on web: absolute fill via style, layout in an inner View.
const FILL = { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 } as const;
const fade = (reduceMotion: boolean, ms: number) => ({
  duration: reduceMotion ? motion.duration.fast : ms,
  easing: motion.ease.standard,
  reduceMotion: ReduceMotion.Never,
});

// Full-screen "translate to" page (mobile), laid out like the Google app: app bar (back, search), title row, list.
// Searching turns the app bar into a search field and collapses the title. Modal's onRequestClose is the Android back button.
export function LanguageSheet({ open, recents, selected, onSelect, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(open);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const progress = useSharedValue(0);
  const search = useSharedValue(0); // 0 browsing, 1 searching

  useEffect(() => {
    // Slide up 300ms, down 200ms; the Modal stays mounted until the exit has played. Reduced motion: fade only.
    if (open) {
      setMounted(true);
      setSearching(false);
      setQuery("");
      search.value = 0;
      progress.value = withTiming(1, fade(reduceMotion, motion.duration.sheet));
      return;
    }
    const ms = reduceMotion ? motion.duration.fast : motion.duration.exit;
    progress.value = withTiming(0, fade(reduceMotion, motion.duration.exit));
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [open, reduceMotion, progress, search]);
  useEffect(() => {
    search.value = withTiming(searching ? 1 : 0, fade(reduceMotion, motion.duration.exit));
  }, [searching, reduceMotion, search]);

  const exitSearch = () => {
    setSearching(false);
    setQuery("");
  };

  const style = useAnimatedStyle(() => ({
    opacity: reduceMotion ? progress.value : 1,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * height }],
  }));
  // Search button and search field share the app bar: one fades out while the other fades in from the right.
  const browseBar = useAnimatedStyle(() => ({ opacity: 1 - search.value }));
  const searchBar = useAnimatedStyle(() => ({
    opacity: search.value,
    transform: [{ translateX: reduceMotion ? 0 : 16 * (1 - search.value) }],
  }));
  // The title fades and its row shrinks to nothing. Reduced motion: fade only, the row closes once the fade is done.
  const titleRow = useAnimatedStyle(() => ({
    opacity: 1 - search.value,
    height: reduceMotion ? (search.value >= 1 ? 0 : TITLE_ROW) : TITLE_ROW * (1 - search.value),
  }));

  const results = useMemo(() => searchLanguages(query), [query]);
  const row = ({ item: lang }: { item: Lang }) => (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: lang === selected }}
      onPress={() => onSelect(lang)}
      className={`h-14 flex-row items-center rounded-full px-4 ${lang === selected ? "bg-chip" : "hover:bg-chip"}`}
    >
      <Text className="flex-1 font-sans text-input text-ink">{langName(lang)}</Text>
      {lang === selected && <Check size={20} className="text-ink" />}
    </PressableScale>
  );
  const heading = (label: string, first?: boolean) => (
    <Text className={`px-4 pb-1 font-sans text-note text-muted ${first ? "" : "pt-4"}`}>{label}</Text>
  );
  return (
    // Back closes the search first, then the page.
    <Modal visible={mounted} transparent animationType="none" onRequestClose={searching ? exitSearch : onClose}>
      <Animated.View style={[{ flex: 1 }, style]}>
        <SafeAreaView className="flex-1 bg-paper">
          <View className="h-14 flex-row items-center px-2">
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={searching ? "ปิดการค้นหา" : "ย้อนกลับ"}
              onPress={searching ? exitSearch : onClose}
              className="h-11 w-11 items-center justify-center rounded-full hover:bg-chip"
            >
              <ArrowLeft size={24} className="text-ink" />
            </PressableScale>
            <View className="h-14 flex-1">
              <Animated.View pointerEvents={searching ? "none" : "auto"} style={[FILL, browseBar]}>
                <View className="flex-1 flex-row items-center justify-end">
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel="ค้นหาภาษา"
                    onPress={() => setSearching(true)}
                    className="h-11 w-11 items-center justify-center rounded-full hover:bg-chip"
                  >
                    <Search size={24} className="text-ink" />
                  </PressableScale>
                </View>
              </Animated.View>
              <Animated.View pointerEvents={searching ? "auto" : "none"} style={[FILL, searchBar]}>
                <View className="flex-1 flex-row items-center">
                  {searching && (
                    <TextInput
                      autoFocus
                      value={query}
                      onChangeText={setQuery}
                      accessibilityLabel="ค้นหาภาษา"
                      placeholder="ค้นหาภาษา"
                      placeholderClassName="text-muted"
                      className="h-11 flex-1 px-2 font-sans text-input text-ink outline-none"
                    />
                  )}
                  {query.length > 0 && (
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel="ล้างคำค้นหา"
                      onPress={() => setQuery("")}
                      className="h-11 w-11 items-center justify-center rounded-full hover:bg-chip"
                    >
                      <X size={22} className="text-muted" />
                    </PressableScale>
                  )}
                </View>
              </Animated.View>
            </View>
          </View>
          <Animated.View
            style={[{ overflow: "hidden" }, titleRow]}
            accessibilityElementsHidden={searching}
            importantForAccessibility={searching ? "no-hide-descendants" : "auto"}
          >
            <Text accessibilityRole="header" className="px-4 pt-2 font-sans-semibold text-title text-ink">แปลเป็นภาษา</Text>
          </Animated.View>
          <FlatList
            data={results}
            keyExtractor={(code) => code}
            renderItem={row}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="px-2 pb-6"
            ListHeaderComponent={
              searching ? undefined : (
                <>
                  {heading("ภาษาที่ใช้ล่าสุด", true)}
                  {recents.map((lang) => (
                    <View key={lang}>{row({ item: lang })}</View>
                  ))}
                  {heading("ภาษาทั้งหมด")}
                </>
              )
            }
            ListEmptyComponent={
              <Text className="px-4 py-6 font-sans text-body text-muted">ไม่พบภาษาที่ตรงกับ “{query.trim()}”</Text>
            }
          />
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}
