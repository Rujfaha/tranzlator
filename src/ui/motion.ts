import { Easing } from "react-native-reanimated";
import { TOAST_LONG_MS, TOAST_MS } from "./text";

// The only place easing/duration values live (ms).
export const motion = {
  ease: {
    standard: Easing.bezier(0.24, 1, 0.4, 1),
    fan: Easing.bezier(0.22, 1, 0.36, 1),
  },
  duration: { fast: 125, sheet: 300, fan: 560, exit: 200, toast: TOAST_MS, toastLong: TOAST_LONG_MS, dots: 1200 },
  press: { scale: 0.97 },
  stagger: 60,
};
