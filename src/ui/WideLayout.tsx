import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";

type Props = {
  compact: boolean; // short landscape window: tighter paddings
  header: ReactNode;
  tabs: { source: ReactNode; target: ReactNode };
  source: ReactNode;
  results: ReactNode;
};

// Google Translate web: language tabs over two cards (white bordered source, grey result). One page scroll.
export function WideLayout({ compact, header, tabs, source, results }: Props) {
  return (
    <ScrollView keyboardShouldPersistTaps="handled" className="flex-1 bg-paper" contentContainerClassName="flex-grow">
      {header}
      <View style={{ maxWidth: 1200 }} className={`w-full self-center ${compact ? "gap-2 px-3 pb-3 pt-1" : "gap-3 px-6 pb-6 pt-3"}`}>
        <View className="flex-row gap-4">
          <View className="flex-1">{tabs.source}</View>
          <View className="flex-1">{tabs.target}</View>
        </View>
        <View className="flex-row items-stretch gap-4">
          <View className="flex-1">{source}</View>
          <View className="flex-1 gap-3 rounded-container bg-shell p-4">{results}</View>
        </View>
      </View>
    </ScrollView>
  );
}
