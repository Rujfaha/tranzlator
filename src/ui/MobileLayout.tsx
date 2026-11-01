import { type ComponentRef, type ReactNode, useEffect, useRef } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  header: ReactNode;
  source: ReactNode;
  paste: ReactNode; // the paste chip, only while the input is empty
  results: ReactNode;
  dock: ReactNode;
  scrollKey: number; // bump to scroll the results into view (a new translation arrived)
  onScroll?: () => void; // the header scrolls with the page, so the key tip re-measures its anchor
};

// Android-app style: a white sheet with curved bottom corners holds the header, the big borderless input and the results;
// the language + translate dock sits below it on the grey shell, pinned above the keyboard.
export function MobileLayout({ header, source, paste, results, dock, scrollKey, onScroll }: Props) {
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets(); // the sheet reaches under the status bar, so it pads itself instead of the page
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const resultsY = useRef(0);
  const pending = useRef(false);

  useEffect(() => {
    if (scrollKey > 0) pending.current = true;
  }, [scrollKey]);

  return (
    <View className="flex-1 bg-shell">
      {/* Two views: the outer one carries the shadow, the inner one clips the scrolling content to the curve. */}
      <View style={{ paddingTop: insets.top }} className="flex-1 rounded-b-sheet bg-paper shadow-card">
        <View className="flex-1 overflow-hidden rounded-b-sheet">
      <ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" className="flex-1" contentContainerClassName="pb-10">
        {header}
        {source}
        {paste && <View className="px-4 pt-2">{paste}</View>}
        <View
          onLayout={(e) => {
            resultsY.current = e.nativeEvent.layout.y;
            if (pending.current) {
              pending.current = false;
              scroll.current?.scrollTo({ y: resultsY.current, animated: !reduceMotion });
            }
          }}
          className="gap-3 px-4 pt-4"
        >
          {results}
        </View>
      </ScrollView>
        </View>
        {/* Decorative grab handle, as on the Google app's sheet. */}
        <View pointerEvents="none" className="absolute bottom-2 left-1/2 -ml-5 h-1 w-10 rounded-full bg-line" />
      </View>
      <KeyboardAvoidingView behavior="padding">{dock}</KeyboardAvoidingView>
    </View>
  );
}
