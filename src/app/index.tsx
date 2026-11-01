import { type ComponentRef, useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { addContext, ApiError, type Lang, translate, type TranslateResponse } from "../api";
import { langName } from "../../shared/languages";
import type { AiSettings } from "../providers";
import { loadSettings, saveSettings } from "../settings";
import { BottomDock } from "../ui/BottomDock";
import { ContextDeck } from "../ui/ContextDeck";
import { Header } from "../ui/Header";
import { KeyTip, type Rect } from "../ui/KeyTip";
import { ChevronDown } from "../ui/icons";
import { isWide } from "../ui/layout";
import { LanguageMenu } from "../ui/LanguageMenu";
import { LanguageSheet } from "../ui/LanguageSheet";
import { LanguageTabs } from "../ui/LanguageTabs";
import { MobileLayout } from "../ui/MobileLayout";
import { PasteChip } from "../ui/PasteChip";
import { PressableScale } from "../ui/PressableScale";
import { SettingsSheet } from "../ui/SettingsSheet";
import { SourcePane } from "../ui/SourcePane";
import { pushRecent, sourceSize } from "../ui/text";
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
  const [sheetOpen, setSheetOpen] = useState(false); // mobile language page
  const [anchor, setAnchor] = useState<{ x: number; y: number; width: number; height: number }>();
  const targetRow = useRef<ComponentRef<typeof View>>(null);
  const [ai, setAi] = useState<AiSettings | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false); // closed with X this session: no automatic tip, but "แปล" without a key still shows it
  const [tipVisible, setTipVisible] = useState(false);
  const [tipAnchor, setTipAnchor] = useState<Rect | null>(null);
  const settingsIcon = useRef<ComponentRef<typeof View>>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [data, setData] = useState<TranslateResponse | null>(null);
  const [batch, setBatch] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(""); // add-context field
  // State lags a render behind, so rapid repeats (double click, held Ctrl+Enter) need a ref to stay single-flight.
  const translating = useRef(false);
  const addingNow = useRef(false);

  useEffect(() => {
    loadSettings().then((s) => {
      setAi(s);
      setSettingsLoaded(true);
    });
  }, []);

  const needsKey = settingsLoaded && !ai;
  const showTip = tipVisible && needsKey; // saving a key hides it at once
  const requestKey = () => setTipVisible(true);
  const openSettings = () => {
    setTipVisible(false);
    setTipDismissed(true);
    setSettingsOpen(true);
  };
  const measureIcon = () =>
    settingsIcon.current?.measureInWindow((x, y, w, h) =>
      setTipAnchor((a) => (a && a.x === x && a.y === y && a.width === w && a.height === h ? a : { x, y, width: w, height: h })),
    );

  // First visit without a key: show the tip shortly after the first render.
  useEffect(() => {
    if (!needsKey || tipDismissed) return;
    const t = setTimeout(() => setTipVisible(true), 400);
    return () => clearTimeout(t);
  }, [needsKey, tipDismissed]);
  // The icon moves when the window resizes or rotates (and, via onScroll, when the page scrolls).
  useEffect(() => {
    if (showTip) measureIcon();
  }, [showTip, width, height]);

  async function submit() {
    if (!ai) {
      if (settingsLoaded) requestKey();
      return;
    }
    if (translating.current) return;
    translating.current = true;
    Keyboard.dismiss();
    setDraft("");
    setLoading(true);
    setError(null);
    setData(null);
    setSelected(null);
    try {
      setData(await translate(ai, text.trim(), target));
      setBatch((b) => b + 1);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e), status: e instanceof ApiError ? e.status : undefined });
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
      setDraft((d) => (d.trim() === context ? "" : d));
    } catch (e) {
      toast.show({
        kind: "error",
        message: e instanceof Error ? e.message : String(e),
        action: { label: "ลองอีกครั้ง", onPress: () => void add(context) },
      });
    } finally {
      addingNow.current = false;
      setAdding(false);
    }
  }

  const header = (
    <Header
      compact={compact}
      wide={wide}
      needsKey={needsKey}
      onHome={() => {
        setText("");
        setDraft("");
        setData(null);
        setError(null);
        setSelected(null);
      }}
      onSettings={openSettings}
      settingsRef={settingsIcon}
    />
  );
  const source = (
    <SourcePane
      variant={wide ? "card" : "bare"}
      size={wide ? (compact ? "source-sm" : "source-md") : data ? "source-sm" : sourceSize(text.length)}
      compact={compact}
      value={text}
      onChange={setText}
      onSubmit={submit}
      loading={loading}
    />
  );
  const pickLang = (lang: Lang) => {
    setRecents((r) => pushRecent(r, lang));
    setTarget(lang);
    setMenuOpen(false);
    setSheetOpen(false);
  };
  const tabs = {
    source: (
      <LanguageTabs
        active="auto"
        items={[{ key: "auto", label: data ? `ตรวจพบ: ${langName(data.sourceLang)}` : "ตรวจหาภาษา" }]}
      />
    ),
    target: (
      <View ref={targetRow} collapsable={false}>
        <LanguageTabs
          active={target}
          items={recents.map((l) => ({ key: l, label: langName(l) }))}
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
  const deck =
    data || loading || error ? (
      <ContextDeck
        results={data?.results ?? []}
        batch={batch}
        loading={loading}
        error={error?.message ?? null}
        selected={selected}
        onSelect={setSelected}
        onRetry={submit}
        onSettings={error?.status === 401 ? openSettings : undefined}
        onAdd={add}
        adding={adding}
        draft={draft}
        onDraft={setDraft}
      />
    ) : null;
  const placeholder = <Text className="font-sans text-source-md text-disabled">คำแปลแต่ละบริบทจะแสดงที่นี่</Text>;
  const results = deck ?? placeholder;

  return (
    <SafeAreaView edges={wide ? undefined : ["top", "left", "right"]} className="flex-1 bg-paper">
      <KeyboardAvoidingView behavior={wide ? "height" : undefined} className="flex-1">
        {wide ? (
          <WideLayout compact={compact} header={header} tabs={tabs} source={source} results={results} onScroll={measureIcon} />
        ) : (
          <MobileLayout
            header={header}
            source={source}
            paste={text.length === 0 ? <PasteChip onPaste={setText} /> : null}
            results={deck}
            scrollKey={batch}
            onScroll={measureIcon}
            dock={
              <BottomDock
                detected={data ? langName(data.sourceLang) : undefined}
                target={target}
                onOpenLanguages={() => setSheetOpen(true)}
                onTranslate={submit}
                canTranslate={text.trim().length > 0 && text.length <= 2000}
                loading={loading}
              />
            }
          />
        )}
      </KeyboardAvoidingView>
      <KeyTip visible={showTip} anchor={tipAnchor} onOpenSettings={openSettings} onDismiss={() => {
        setTipVisible(false);
        setTipDismissed(true);
      }} />
      <LanguageMenu
        open={menuOpen}
        anchor={anchor}
        selected={target}
        onSelect={pickLang}
        onClose={() => setMenuOpen(false)}
      />
      <LanguageSheet open={sheetOpen} recents={recents} selected={target} onSelect={pickLang} onClose={() => setSheetOpen(false)} />
      <SettingsSheet
        open={settingsOpen}
        initial={ai}
        onClose={() => setSettingsOpen(false)}
        onSave={(s) => {
          setAi(s);
          setSettingsOpen(false);
          toast.show({ kind: "success", message: "บันทึกแล้ว" });
          saveSettings(s);
        }}
      />
    </SafeAreaView>
  );
}
