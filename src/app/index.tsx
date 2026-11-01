import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Lang } from "../api";
import { isWide } from "../ui/layout";
import { LanguageBar } from "../ui/LanguageBar";
import { SourcePane } from "../ui/SourcePane";

export default function Index() {
  const wide = isWide(useWindowDimensions().width);
  const [text, setText] = useState("");
  const [target, setTarget] = useState<Lang>("en");

  const header = <Text className="font-sans-semibold text-input text-ink wide:text-title">Tranzlator</Text>;
  const source = <SourcePane value={text} onChange={setText} onSubmit={() => {}} loading={false} />;
  const results = <Text className="font-sans text-body text-muted">คำแปลแต่ละบริบทจะแสดงที่นี่</Text>;

  return (
    <SafeAreaView className={`flex-1 ${wide ? "bg-shell" : "bg-paper"}`}>
      <KeyboardAvoidingView behavior="height" className="flex-1">
        {wide ? (
          // Scrolls as a page when the viewport is too short (landscape phone + keyboard).
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="grow">
            <View className="flex-1 gap-3 p-3">
              {header}
              <View className="min-h-80 flex-1 overflow-hidden rounded-panel bg-paper">
                <LanguageBar target={target} onChange={setTarget} />
                <View className="flex-1 flex-row">
                  <View className="flex-1 border-r border-line">{source}</View>
                  <ScrollView nestedScrollEnabled className="flex-1" contentContainerClassName="gap-3 p-4">{results}</ScrollView>
                </View>
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pt-4">
            <View className="px-4 pb-4">{header}</View>
            <LanguageBar target={target} onChange={setTarget} />
            {source}
            <View className="gap-3 border-t border-line p-4">{results}</View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
