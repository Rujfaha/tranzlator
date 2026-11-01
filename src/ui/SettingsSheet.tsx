import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView, Linking, Modal, Platform, ScrollView, Text, TextInput, useWindowDimensions, View,
} from "react-native";
import Animated, {
  ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming,
} from "react-native-reanimated";
import { type AiSettings, PROVIDER_INFO, type Provider } from "../providers";
import { Check, ChevronDown, X } from "./icons";
import { isWide } from "./layout";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";

type Props = {
  open: boolean;
  initial: AiSettings | null;
  onClose: () => void;
  onSave: (settings: AiSettings) => void;
};

const PROVIDERS = Object.keys(PROVIDER_INFO) as Provider[];

export function SettingsSheet({ open, initial, onClose, onSave }: Props) {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  useEffect(() => {
    // Stay mounted until the exit animation has played.
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), reduceMotion ? motion.duration.fast : motion.duration.exit);
    return () => clearTimeout(t);
  }, [open, reduceMotion]);
  // The form mounts only while shown, so it re-initialises from `initial` on every open.
  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      {mounted && <Form open={open} initial={initial} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function Form({ open, initial, onClose, onSave }: Props) {
  const { width, height } = useWindowDimensions();
  const wide = isWide(width);
  const reduceMotion = useReducedMotion();
  const [provider, setProvider] = useState<Provider>(initial?.provider ?? "anthropic");
  const [key, setKey] = useState(initial?.key ?? "");
  const [model, setModel] = useState(initial?.model ?? PROVIDER_INFO[provider].defaultModel);
  const [showKey, setShowKey] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  // In 300ms / out 200ms. Narrow: the bottom sheet slides. Wide dialog: fade + rise 16 + scale .95 -> 1. Reduced motion: fade only.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: reduceMotion ? motion.duration.fast : open ? motion.duration.sheet : motion.duration.exit,
      easing: motion.ease.standard,
      reduceMotion: ReduceMotion.Never, // we handle reduced motion ourselves: fade only
    });
  }, [open, progress, reduceMotion]);
  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const animated = useAnimatedStyle(() => {
    const away = 1 - progress.value;
    return {
      opacity: progress.value,
      transform: reduceMotion
        ? []
        : wide
          ? [{ translateY: away * 16 }, { scale: 0.95 + 0.05 * progress.value }]
          : [{ translateY: away * height }],
    };
  });

  const info = PROVIDER_INFO[provider];
  const canSave = key.trim().length > 0 && model.trim().length > 0;

  return (
    <View className={`flex-1 ${wide ? "items-center justify-center p-3" : "justify-end"}`}>
      <Animated.View pointerEvents="none" style={[{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }, backdrop]}>
        <View className="flex-1 bg-ink/40" />
      </Animated.View>
      <PressableScale accessibilityLabel="ปิด" onPress={onClose} className="absolute inset-0" />
      <KeyboardAvoidingView behavior="height" className={wide ? "w-full max-w-md" : "w-full"}>
        {/* className is not applied to Animated.* on web, so the animated wrapper only animates. */}
        <Animated.View style={animated}>
          <View style={{ maxHeight: height * 0.9 }} className={`overflow-hidden bg-paper ${wide ? "rounded-container" : "rounded-t-panel"}`}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 p-4">
            <View className="flex-row items-center">
              <Text accessibilityRole="header" className="flex-1 font-sans-semibold text-translation text-ink">ตั้งค่า AI</Text>
              <PressableScale accessibilityRole="button" accessibilityLabel="ปิด" onPress={onClose} className="h-11 w-11 items-center justify-center rounded-full hover:bg-chip">
                <X size={22} className="text-ink" />
              </PressableScale>
            </View>

            <View className="gap-1.5">
              <Text className="font-sans-medium text-note text-muted">ผู้ให้บริการ</Text>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`ผู้ให้บริการ ${info.label}`}
                accessibilityState={{ expanded: listOpen }}
                onPress={() => setListOpen(!listOpen)}
                className="min-h-11 flex-row items-center rounded-element border border-line px-3 hover:bg-chip"
              >
                <Text className="flex-1 font-sans text-body text-ink">{info.label}</Text>
                <ChevronDown size={18} className="text-muted" />
              </PressableScale>
              {listOpen && (
                <View className="overflow-hidden rounded-element border border-line">
                  {PROVIDERS.map((p) => (
                    <PressableScale
                      key={p}
                      accessibilityRole="button"
                      accessibilityState={{ selected: p === provider }}
                      onPress={() => {
                        setProvider(p);
                        setModel(PROVIDER_INFO[p].defaultModel);
                        setListOpen(false);
                      }}
                      className="min-h-11 flex-row items-center px-3 hover:bg-chip"
                    >
                      <Text className="flex-1 font-sans text-body text-ink">{PROVIDER_INFO[p].label}</Text>
                      {p === provider && <Check size={18} className="text-ink" />}
                    </PressableScale>
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
                <PressableScale accessibilityRole="button" onPress={() => setShowKey(!showKey)} className="min-h-11 justify-center rounded-element px-3">
                  <Text className="font-sans-medium text-body text-ink">{showKey ? "ซ่อน" : "แสดง"}</Text>
                </PressableScale>
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
              <PressableScale accessibilityRole="link" onPress={() => Linking.openURL(info.keyUrl)} className="min-h-11 justify-center">
                <Text className="font-sans text-body text-ink underline">ขอ API key ได้ที่ {info.keyUrl.split("/")[2]}</Text>
              </PressableScale>
              <Text className="font-sans text-note text-muted">
                {Platform.OS === "web" ? "key เก็บในเบราว์เซอร์นี้เท่านั้น" : "key เก็บในเครื่องนี้เท่านั้น"}
              </Text>
            </View>

            <PressableScale
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={() => onSave({ provider, key: key.trim(), model: model.trim() })}
              className="min-h-11 items-center justify-center self-end rounded-full bg-graphite px-6 hover:bg-ink"
            >
              <Text className="font-sans-semibold text-body text-paper">บันทึก</Text>
            </PressableScale>
          </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}
