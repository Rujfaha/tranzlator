import { type ComponentRef, type ReactNode, useEffect, useRef } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

type Props = {
  header: ReactNode;
  source: ReactNode;
  paste: ReactNode; // the paste chip, only while the input is empty
  results: ReactNode;
  dock: ReactNode;
  scrollKey: number; // bump to scroll the results into view (a new translation arrived)
  onScroll?: () => void; // the header scrolls with the page, so the key tip re-measures its anchor
};

// Android-app style: big borderless input on top, language + translate dock pinned above the keyboard.
export function MobileLayout({ header, source, paste, results, dock, scrollKey, onScroll }: Props) {
  const reduceMotion = useReducedMotion();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const resultsY = useRef(0);
  const pending = useRef(false);

  useEffect(() => {
    if (scrollKey > 0) pending.current = true;
  }, [scrollKey]);

  return (
    <View className="flex-1">
      <ScrollView ref={scroll} onScroll={onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled" className="flex-1" contentContainerClassName="pb-6">
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
      <KeyboardAvoidingView behavior="padding">{dock}</KeyboardAvoidingView>
    </View>
  );
}
