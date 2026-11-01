import { Pressable, ScrollView, Text, View } from "react-native";
import { LANGS, type Lang } from "../api";

const LABEL: Record<Lang, string> = {
  th: "ไทย", en: "อังกฤษ", ja: "ญี่ปุ่น", zh: "จีน", ko: "เกาหลี", vi: "เวียดนาม", id: "อินโดนีเซีย",
};

type Props = { target: Lang; onChange: (lang: Lang) => void; detected?: string };

export function LanguageBar({ target, onChange, detected }: Props) {
  const source = detected ? (LABEL[detected as Lang] ?? detected) : "ตรวจภาษาอัตโนมัติ";
  return (
    <View className="border-b border-line wide:flex-row">
      <View className="justify-center wide:flex-1 wide:border-r wide:border-line">
        <Text className="px-4 py-3 font-sans-medium text-body text-muted">{source}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="wide:flex-1" contentContainerClassName="px-4 py-3">
        <View className="flex-row gap-1.5 rounded-full bg-chip p-1.5">
          {LANGS.map((lang) => {
            const selected = lang === target;
            return (
              <Pressable
                key={lang}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onChange(lang)}
                className={`min-h-11 justify-center rounded-full px-4 active:opacity-80 ${selected ? "bg-graphite" : ""}`}
              >
                <Text className={`font-sans-medium text-body ${selected ? "text-paper" : "text-ink"}`}>{LABEL[lang]}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
