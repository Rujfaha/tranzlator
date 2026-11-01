import { Pressable, Text, TextInput, View } from "react-native";
import { X } from "./icons";

const MAX = 2000;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  disabled?: boolean; // e.g. no API key yet
};

export function SourcePane({ value, onChange, onSubmit, loading, disabled }: Props) {
  const over = value.length > MAX;
  const ready = value.trim().length > 0 && !over && !loading;
  const canSubmit = ready && !disabled;
  return (
    <View className="wide:flex-1">
      <TextInput
        multiline
        value={value}
        onChangeText={onChange}
        onKeyPress={(e) => {
          const k = e.nativeEvent as unknown as { key: string; ctrlKey?: boolean; metaKey?: boolean };
          if (k.key === "Enter" && (k.ctrlKey || k.metaKey) && ready) onSubmit(); // without a key the page explains why (toast)
        }}
        accessibilityLabel="ข้อความที่ต้องการแปล"
        placeholder="พิมพ์ข้อความที่ต้องการแปล"
        placeholderClassName="text-muted"
        textAlignVertical="top"
        className="min-h-40 px-4 pt-4 font-sans text-input text-ink wide:flex-1"
      />
      <View className="flex-row items-center gap-3 p-4">
        <Text className={`flex-1 font-sans text-note ${over ? "text-danger" : "text-muted"}`}>{value.length}/{MAX}</Text>
        {value.length > 0 && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="ล้างข้อความ"
            onPress={() => onChange("")}
            className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
          >
            <X size={20} className="text-muted" />
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmit }}
          disabled={!canSubmit}
          onPress={onSubmit}
          className={`min-h-11 items-center justify-center rounded-full px-6 ${canSubmit ? "bg-graphite active:opacity-80" : "bg-disabled"}`}
        >
          <Text className="font-sans-semibold text-body text-paper">แปล</Text>
        </Pressable>
      </View>
    </View>
  );
}
