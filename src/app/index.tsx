import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addContext, type Lang, translate, type TranslateResponse } from "../api";
import type { AiSettings } from "../providers";
import { loadSettings, saveSettings } from "../settings";
import { Settings } from "../ui/icons";
import { ContextDeck } from "../ui/ContextDeck";
import { isWide } from "../ui/layout";
import { LanguageBar } from "../ui/LanguageBar";
import { SettingsSheet } from "../ui/SettingsSheet";
import { SourcePane } from "../ui/SourcePane";

// 24 (p-3 x2) + 36 (title) + 12 (gap-3) + 320 (panel min-h-80): below this the wide page scrolls.
const WIDE_MIN_HEIGHT = 392;

export default function Index() {
  const wide = isWide(useWindowDimensions().width);
  const [text, setText] = useState("");
  const [target, setTarget] = useState<Lang>("en");
  const [ai, setAi] = useState<AiSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TranslateResponse | null>(null);
  const [batch, setBatch] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [viewHeight, setViewHeight] = useState(0);
  // State lags a render behind, so rapid repeats (double click, held Ctrl+Enter) need a ref to stay single-flight.
  const translating = useRef(false);
  const addingNow = useRef(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setAi(s);
      setSettingsLoaded(true);
    });
  }, []);
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [saved]);

  async function submit() {
    if (!ai || translating.current) return;
    translating.current = true;
    setLoading(true);
    setError(null);
    setData(null);
    setSelected(null);
    try {
      setData(await translate(ai, text.trim(), target));
      setBatch((b) => b + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      translating.current = false;
      setLoading(false);
    }
  }

  // Custom cards live only in this client state: the server never stores them (shared cache).
  async function add(context: string) {
    if (!ai || !data || addingNow.current) return;
    addingNow.current = true;
    setAdding(true);
    try {
      const result = await addContext(ai, data.id, context);
      setData((d) => d && { ...d, results: [...d.results, result] });
    } finally {
      addingNow.current = false;
      setAdding(false);
    }
  }

  const header = (
    <View className="flex-row items-center">
      <Text accessibilityRole="header" className="flex-1 font-sans-semibold text-input text-ink wide:text-title">Tranzlator</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="ตั้งค่า"
        onPress={() => setSettingsOpen(true)}
        className="h-11 w-11 items-center justify-center rounded-full active:opacity-70"
      >
        <Settings size={22} className="text-ink" />
      </Pressable>
    </View>
  );
  const source = <SourcePane value={text} onChange={setText} onSubmit={submit} loading={loading} disabled={!ai} />;
  const results =
    settingsLoaded && !ai ? (
      <View className="items-start gap-3">
        <Text className="font-sans text-body text-muted">ใส่ API key ในหน้าตั้งค่าเพื่อเริ่มแปล</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setSettingsOpen(true)}
          className="min-h-11 items-center justify-center rounded-full bg-graphite px-6 active:opacity-80"
        >
          <Text className="font-sans-semibold text-body text-paper">ตั้งค่า</Text>
        </Pressable>
      </View>
    ) : data || loading || error ? (
      <ContextDeck
        results={data?.results ?? []}
        batch={batch}
        loading={loading}
        error={error}
        selected={selected}
        onSelect={setSelected}
        onRetry={submit}
        onAdd={add}
        adding={adding}
      />
    ) : (
      <Text className="font-sans text-body text-muted">คำแปลแต่ละบริบทจะแสดงที่นี่</Text>
    );

  return (
    <SafeAreaView className={`flex-1 ${wide ? "bg-shell" : "bg-paper"}`}>
      <KeyboardAvoidingView behavior="height" className="flex-1">
        {wide ? (
          // Scrolls as a page when the viewport is too short (landscape phone + keyboard).
          <ScrollView
            keyboardShouldPersistTaps="handled"
            onLayout={(e) => setViewHeight(e.nativeEvent.layout.height)}
            contentContainerStyle={{ height: Math.max(viewHeight, WIDE_MIN_HEIGHT) }}
          >
            <View className="flex-1 gap-3 p-3">
              {header}
              <View className="min-h-80 flex-1 overflow-hidden rounded-panel bg-paper">
                <LanguageBar target={target} onChange={setTarget} detected={data?.sourceLang} />
                <View className="flex-1 flex-row">
                  <View className="flex-1 border-r border-line">{source}</View>
                  <ScrollView nestedScrollEnabled className="flex-1" contentContainerClassName="gap-3 p-4">{results}</ScrollView>
                </View>
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="pt-4">
            <View className="px-4 pb-2">{header}</View>
            <LanguageBar target={target} onChange={setTarget} detected={data?.sourceLang} />
            {source}
            <View className="gap-3 border-t border-line p-4">{results}</View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <SettingsSheet
        open={settingsOpen}
        initial={ai}
        onClose={() => setSettingsOpen(false)}
        onSave={(s) => {
          setAi(s);
          setSettingsOpen(false);
          setSaved(true);
          saveSettings(s);
        }}
      />
      {saved && (
        <View pointerEvents="none" className="absolute inset-x-0 bottom-6 items-center">
          <View className="rounded-full bg-graphite px-4 py-3">
            <Text accessibilityLiveRegion="polite" className="font-sans-medium text-body text-paper">บันทึกแล้ว</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
