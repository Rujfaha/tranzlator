import { type ComponentRef, useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addContext, type Lang, translate, type TranslateResponse } from "../api";
import type { AiSettings } from "../providers";
import { loadSettings, saveSettings } from "../settings";
import { ContextDeck } from "../ui/ContextDeck";
import { Header } from "../ui/Header";
import { KeySuggestion } from "../ui/KeySuggestion";
import { ChevronDown } from "../ui/icons";
import { isWide } from "../ui/layout";
import { LanguageMenu } from "../ui/LanguageMenu";
import { LanguageTabs } from "../ui/LanguageTabs";
import { PressableScale } from "../ui/PressableScale";
import { SettingsSheet } from "../ui/SettingsSheet";
import { SourcePane } from "../ui/SourcePane";
import { LANG_LABEL, pushRecent } from "../ui/text";
import { useToast } from "../ui/Toast";
import { WideLayout } from "../ui/WideLayout";

export default function Index() {
  const { width, height } = useWindowDimensions();
  const wide = isWide(width);
  const compact = wide && height < 500; // landscape phone
  const toast = useToast();
  const [text, setText] = useState("");
  const [target, setTarget] = useState<Lang>("en");
  const [recents, setRecents] = useState<Lang[]>(["en", "th", "ja"]); // the target tabs, most recent first
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number }>();
  const targetRow = useRef<ComponentRef<typeof View>>(null);
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
    if (!ai) {
      if (settingsLoaded) {
        toast.show({ kind: "info", message: "ใส่ API key ในการตั้งค่าก่อนแปล", action: { label: "ตั้งค่า", onPress: () => setSettingsOpen(true) } });
      }
      return;
    }
    if (translating.current) return;
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

  const needsKey = settingsLoaded && !ai;
  const header = (
    <Header
      compact={compact}
      wide={wide}
      needsKey={needsKey}
      onHome={() => {
        setText("");
        setData(null);
        setError(null);
        setSelected(null);
      }}
      onSettings={() => setSettingsOpen(true)}
    />
  );
  const source = (
    <SourcePane
      variant="card"
      size={compact ? "source-sm" : "source-md"}
      compact={compact}
      value={text}
      onChange={setText}
      onSubmit={submit}
      loading={loading}
      disabled={!ai}
    />
  );
  const tabs = {
    source: (
      <LanguageTabs
        active="auto"
        items={[{ key: "auto", label: data ? `ตรวจพบ: ${LANG_LABEL[data.sourceLang as Lang] ?? data.sourceLang}` : "ตรวจหาภาษา" }]}
      />
    ),
    target: (
      <View ref={targetRow} collapsable={false}>
        <LanguageTabs
          active={target}
          items={recents.map((l) => ({ key: l, label: LANG_LABEL[l] }))}
          onSelect={(k) => setTarget(k as Lang)}
          trailing={
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="เลือกภาษาอื่น"
              accessibilityState={{ expanded: menuOpen }}
              onPress={() =>
                targetRow.current?.measureInWindow((x, y, width, height) => {
                  setAnchor({ x, y, width, height });
                  setMenuOpen(true);
                })
              }
              className="h-11 w-11 items-center justify-center rounded-full hover:bg-chip"
            >
              <ChevronDown size={20} className="text-ink" />
            </PressableScale>
          }
        />
      </View>
    ),
  };
  const results =
    needsKey ? (
      <View className="gap-3">
        <KeySuggestion onShell onPress={() => setSettingsOpen(true)} />
        <Text className="font-sans text-source-md text-disabled">คำแปลแต่ละบริบทจะแสดงที่นี่</Text>
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
      <Text className="font-sans text-source-md text-disabled">คำแปลแต่ละบริบทจะแสดงที่นี่</Text>
    );

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <KeyboardAvoidingView behavior="height" className="flex-1">
        {wide ? (
          <WideLayout compact={compact} header={header} tabs={tabs} source={source} results={results} />
        ) : (
          // Stopgap until the mobile layout: the same pieces, stacked.
          <ScrollView keyboardShouldPersistTaps="handled" className="flex-1">
            {header}
            <View className="gap-3 px-4 pb-6">
              {tabs.source}
              {tabs.target}
              {source}
              <View className="gap-3 rounded-container bg-shell p-4">{results}</View>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <LanguageMenu
        open={menuOpen}
        anchor={anchor}
        selected={target}
        onSelect={(lang) => {
          setRecents((r) => pushRecent(r, lang));
          setTarget(lang);
          setMenuOpen(false);
        }}
        onClose={() => setMenuOpen(false)}
      />
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
