import { type ComponentRef, useEffect, useRef, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";
import { KeyRound, X } from "./icons";
import { isWide } from "./layout";
import { motion } from "./motion";
import { PressableScale } from "./PressableScale";

export type Rect = { x: number; y: number; width: number; height: number }; // window coordinates

type Props = {
  visible: boolean;
  anchor: Rect | null; // the settings icon; nothing is drawn until it has been measured
  onOpenSettings: () => void;
  onDismiss: () => void;
};

const ARROW = 12;
const GUTTER = 16;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Coach mark pointing at the settings icon. Not a Modal and no backdrop: typing stays possible and only X / the button close it.
export function KeyTip({ visible, anchor, onOpenSettings, onDismiss }: Props) {
  const reduceMotion = useReducedMotion();
  const { width: screen } = useWindowDimensions();
  const box = useRef<ComponentRef<typeof View>>(null);
  const [origin, setOrigin] = useState({ x: 0, y: 0 }); // window position of the overlay, so `anchor` can be made relative to it
  const show = visible && anchor !== null && anchor.y + anchor.height > 0; // an icon scrolled off the top has nothing to point at
  const [mounted, setMounted] = useState(show);
  const progress = useSharedValue(0);

  useEffect(() => {
    // Enter 300ms (pivot at the arrow tip), exit 200ms; unmount only after the exit has played. Reduced motion: fade only.
    const cfg = { easing: motion.ease.standard, reduceMotion: ReduceMotion.Never };
    if (show) {
      setMounted(true);
      progress.value = withTiming(1, { ...cfg, duration: reduceMotion ? motion.duration.fast : motion.duration.sheet });
      return;
    }
    const ms = reduceMotion ? motion.duration.fast : motion.duration.exit;
    progress.value = withTiming(0, { ...cfg, duration: ms });
    const t = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(t);
  }, [show, reduceMotion, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: reduceMotion ? [] : [{ translateY: -4 * (1 - progress.value) }, { scale: 0.96 + 0.04 * progress.value }],
  }));

  if (!mounted || !anchor) return null;
  const width = isWide(screen) ? Math.min(320, screen - 2 * GUTTER) : screen - 2 * GUTTER;
  const iconX = anchor.x - origin.x;
  const left = clamp(iconX + anchor.width - width, GUTTER, screen - GUTTER - width); // right edges line up with the icon
  const arrowLeft = clamp(iconX + anchor.width / 2 - left - ARROW / 2, GUTTER, width - GUTTER - ARROW);
  const top = anchor.y - origin.y + anchor.height + ARROW - 2;

  return (
    <View
      ref={box}
      collapsable={false}
      pointerEvents="box-none"
      onLayout={() => box.current?.measureInWindow((x, y) => setOrigin((o) => (o.x === x && o.y === y ? o : { x, y })))}
      style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
    >
      <Animated.View
        accessibilityRole={show ? "alert" : undefined}
        pointerEvents={show ? "auto" : "none"}
        style={[{ position: "absolute", top, left, width, transformOrigin: [arrowLeft + ARROW / 2, -ARROW / 2, 0] }, style]}
      >
        <View
          style={{ position: "absolute", top: -ARROW / 2, left: arrowLeft, width: ARROW, height: ARROW, transform: [{ rotate: "45deg" }] }}
          className="bg-graphite"
        />
        <View className="gap-3 rounded-container bg-graphite p-4 shadow-popover">
          <View className="flex-row items-start gap-3">
            <KeyRound size={20} className="mt-0.5 text-paper" />
            <View className="flex-1">
              <Text className="font-sans-semibold text-body text-paper">ใส่ API key ของคุณเพื่อเริ่มแปล</Text>
              <Text className="font-sans text-note text-disabled">เลือกผู้ให้บริการและใส่ key ในการตั้งค่า</Text>
            </View>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="ปิดคำแนะนำ"
              onPress={onDismiss}
              className="-mr-3 -mt-3 h-11 w-11 items-center justify-center rounded-full hover:bg-ink"
            >
              <X size={18} className="text-paper" />
            </PressableScale>
          </View>
          <PressableScale
            accessibilityRole="button"
            onPress={onOpenSettings}
            className="min-h-11 items-center justify-center self-end rounded-full bg-paper px-5 hover:bg-chip"
          >
            <Text className="font-sans-semibold text-body text-ink">ไปที่ตั้งค่า</Text>
          </PressableScale>
        </View>
      </Animated.View>
    </View>
  );
}
