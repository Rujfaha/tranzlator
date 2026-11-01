import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView, Linking, Modal, Platform, Pressable, ScrollView, Text, TextInput, useWindowDimensions, View,
} from "react-native";
import Animated, {
  ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from "react-native-reanimated";
import { type AiSettings, PROVIDER_INFO, type Provider } from "../providers";
import { Check, ChevronDown, X } from "./icons";
import { isWide } from "./layout";
import { motion } from "./motion";

type Props = {
  open: boolean;
  initial: AiSettings | null;
  onClose: () => void;
  onSave: (settings: AiSettings) => void;
};

const PROVIDERS = Object.keys(PROVIDER_INFO) as Provider[];

export function SettingsSheet({ open, initial, onClose, onSave }: Props) {
  // The form mounts only while open, so it re-initialises from `initial` on every open.
  return (
    <Modal visible={open} transparent animationType="none" onRequestClose={onClose}>
      {open && <Form initial={initial} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function Form({ initial, onClose, onSave }: Omit<Props, "open">) {
  const { width, height } = useWindowDimensions();
  const wide = isWide(width);
  const reduceMotion = useReducedMotion();
  const [provider, setProvider] = useState<Provider>(initial?.provider ?? "anthropic");
  const [key, setKey] = useState(initial?.key ?? "");
  const [model, setModel] = useState(initial?.model ?? PROVIDER_INFO[provider].defaultModel);
  const [showKey, setShowKey] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  // Narrow: bottom sheet slides up. Wide dialog and reduced motion: fade only.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reduceMotion ? motion.duration.fast : motion.duration.sheet,
      easing: motion.ease.standard,
      reduceMotion: ReduceMotion.Never, // we handle reduced motion ourselves: fade only
    });
  }, [progress, reduceMotion]);
  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: wide || reduceMotion ? 0 : (1 - progress.value) * height }],
  }));

  const info = PROVIDER_INFO[provider];
  const canSave = key.trim().length > 0 && model.trim().length > 0;

  return (
    <View className={`flex-1 bg-ink/40 ${wide ? "items-center justify-center p-3" : "justify-end"}`}>
      <Pressable accessibilityLabel="ปิด" onPress={onClose} className="absolute inset-0" />
      <KeyboardAvoidingView behavior="height" className={wide ? "w-full max-w-md" : "w-full"}>
        {/* className is not applied to Animated.* on web, so the animated wrapper only animates. */}
        <Animated.View style={animated}>
          <View style={{ maxHeight: height * 0.9 }} className={`overflow-hidden bg-paper ${wide ? "rounded-container" : "rounded-t-panel"}`}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-4">
            <View className="flex-row items-center">
              <Text accessibilityRole="header" className="flex-1 font-sans-semibold text-translation text-ink">ตั้งค่า AI</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="ปิด" onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full active:opacity-70">
                <X size={22} className="text-ink" />
              </Pressable>
            </View>

            <View className="gap-1.5">
              <Text className="font-sans-medium text-note text-muted">ผู้ให้บริการ</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`ผู้ให้บริการ ${info.label}`}
                accessibilityState={{ expanded: listOpen }}
                onPress={() => setListOpen(!listOpen)}
                className="min-h-11 flex-row items-center rounded-element border border-line px-3 active:opacity-80"
              >
                <Text className="flex-1 font-sans text-body text-ink">{info.label}</Text>
                <ChevronDown size={18} className="text-muted" />
              </Pressable>
              {listOpen && (
                <View className="overflow-hidden rounded-element border border-line">
                  {PROVIDERS.map((p) => (
                    <Pressable
                      key={p}
                      accessibilityRole="button"
                      accessibilityState={{ selected: p === provider }}
                      onPress={() => {
                        setProvider(p);
                        setModel(PROVIDER_INFO[p].defaultModel);
                        setListOpen(false);
                      }}
                      className="min-h-11 flex-row items-center px-3 active:bg-chip"
                    >
                      <Text className="flex-1 font-sans text-body text-ink">{PROVIDER_INFO[p].label}</Text>
                      {p === provider && <Check size={18} className="text-ink" />}
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View className="gap-1.5">
              <Text className="font-sans-medium text-note text-muted">API key</Text>
              <View className="min-h-11 flex-row items-center rounded-element border border-line pl-3">
                <TextInput
                  value={key}
                  onChangeText={setKey}
                  secureTextEntry={!showKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  accessibilityLabel="API key"
                  className="min-h-11 flex-1 font-sans text-body text-ink"
                />
                <Pressable accessibilityRole="button" onPress={() => setShowKey(!showKey)} className="min-h-11 justify-center px-3 active:opacity-70">
                  <Text className="font-sans-medium text-body text-ink">{showKey ? "ซ่อน" : "แสดง"}</Text>
                </Pressable>
              </View>
            </View>

            <View className="gap-1.5">
              <Text className="font-sans-medium text-note text-muted">โมเดล</Text>
              <TextInput
                value={model}
                onChangeText={setModel}
                autoCapitalize="none"
                autoCorrect={false}
                spellCheck={false}
                accessibilityLabel="โมเดล"
                className="min-h-11 rounded-element border border-line px-3 font-sans text-body text-ink"
              />
            </View>

            <View className="gap-1.5">
              <Pressable accessibilityRole="link" onPress={() => Linking.openURL(info.keyUrl)} className="min-h-11 justify-center">
                <Text className="font-sans text-body text-ink underline">ขอ API key ได้ที่ {new URL(info.keyUrl).host}</Text>
              </Pressable>
              <Text className="font-sans text-note text-muted">
                {Platform.OS === "web" ? "key เก็บในเบราว์เซอร์นี้เท่านั้น" : "key เก็บในเครื่องนี้เท่านั้น"}
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={() => onSave({ provider, key: key.trim(), model: model.trim() })}
              className={`min-h-11 items-center justify-center self-end rounded-full px-6 ${canSave ? "bg-graphite active:opacity-80" : "bg-disabled"}`}
            >
              <Text className="font-sans-semibold text-body text-paper">บันทึก</Text>
            </Pressable>
          </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
