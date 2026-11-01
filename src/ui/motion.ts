import { Easing } from "react-native-reanimated";

// The only place easing/duration values live (ms).
export const motion = {
  ease: {
    standard: Easing.bezier(0.24, 1, 0.4, 1),
    fan: Easing.bezier(0.22, 1, 0.36, 1),
  },
  duration: { fast: 125, sheet: 300, fan: 560 },
  stagger: 60,
};
