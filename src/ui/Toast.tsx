import { createContext, type ReactNode, useContext, useMemo, useRef, useSyncExternalStore } from "react";
import { KeyboardAvoidingView, Text, useWindowDimensions, View } from "react-native";
import Animated, { FadeOut, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CircleAlert, CircleCheck, Info, X } from "./icons";
import { DOCK_HEIGHT, isWide } from "./layout";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";
import { Rise } from "./Rise";
import { createToastStore, type ToastInput, type ToastItem } from "./toastStore";

type Api = { show: (t: ToastInput) => void; hide: () => void };
const Ctx = createContext<Api | null>(null);

export function useToast(): Api {
  const api = useContext(Ctx);
  if (!api) throw new Error("useToast must be used inside ToastProvider");
  return api;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const store = useRef(createToastStore()).current;
  const toast = useSyncExternalStore(store.subscribe, store.get);
  const api = useMemo(() => ({ show: store.show, hide: store.hide }), [store]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <Host toast={toast} hide={store.hide} pause={store.pause} resume={store.resume} />
    </Ctx.Provider>
  );
}

const ICON = { success: CircleCheck, error: CircleAlert, info: Info };
// Enter is <Rise>; exit is a plain fade (a built-in animation, so web does not pin the element absolute). ReduceMotion.Never: Reanimated would otherwise skip the fade.
const fadeOut = FadeOut.duration(motion.duration.exit).reduceMotion(ReduceMotion.Never);

function Host({ toast, hide, pause, resume }: { toast: ToastItem | null; hide: () => void; pause: () => void; resume: () => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  // Wide: 24 above the bottom edge. Narrow: 12 above the BottomDock (which the keyboard lifts, so lift the toast too).
  const bottom = insets.bottom + (isWide(width) ? 24 : DOCK_HEIGHT + 12);
  return (
    <KeyboardAvoidingView behavior="padding" pointerEvents="box-none" className="absolute inset-0 justify-end">
      <View pointerEvents="box-none" style={{ marginBottom: bottom }} className="items-center px-4">
        {toast && (
          <Animated.View key={toast.id} exiting={fadeOut} style={{ maxWidth: 480, width: "100%" }}>
            <Rise px={16}>
              <ToastBody toast={toast} hide={hide} pause={pause} resume={resume} />
            </Rise>
          </Animated.View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function ToastBody({ toast, hide, pause, resume }: { toast: ToastItem; hide: () => void; pause: () => void; resume: () => void }) {
  const Icon = ICON[toast.kind];
  return (
    <View
      accessibilityRole={toast.kind === "error" ? "alert" : undefined}
      accessibilityLiveRegion={toast.kind === "error" ? undefined : "polite"}
      onPointerEnter={pause}
      onPointerLeave={resume}
      className="flex-row items-center gap-3 rounded-container bg-graphite py-1 pl-4 pr-1 shadow-popover"
    >
      <Icon size={18} className="text-paper" />
      <Text className="flex-1 py-2.5 font-sans text-body text-paper">{toast.message}</Text>
      {toast.action && (
        <PressableScale
          accessibilityRole="button"
          onPress={() => {
            toast.action?.onPress();
            hide();
          }}
          className="min-h-11 justify-center rounded-full px-3"
        >
          <Text className="font-sans-semibold text-body text-paper">{toast.action.label}</Text>
        </PressableScale>
      )}
      <PressableScale accessibilityRole="button" accessibilityLabel="ปิด" onPress={hide} className="h-11 w-11 items-center justify-center rounded-full">
        <X size={18} className="text-paper" />
      </PressableScale>
    </View>
  );
}
