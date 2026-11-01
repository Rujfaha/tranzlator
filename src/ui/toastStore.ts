import { toastDuration } from "./text";

export type ToastInput = {
  kind: "success" | "error" | "info";
  message: string;
  action?: { label: string; onPress: () => void };
};
export type ToastItem = ToastInput & { id: number };

// One toast at a time. A new one replaces the old and re-arms the single timer, so a stale timer can never close a newer toast.
// Pure (no React) so the timer rules are unit-tested.
export function createToastStore() {
  let current: ToastItem | null = null;
  let id = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const subs = new Set<() => void>();
  const set = (t: ToastItem | null) => {
    current = t;
    subs.forEach((f) => f());
  };
  const arm = () => {
    clearTimeout(timer);
    if (current) timer = setTimeout(() => set(null), toastDuration(current.kind, !!current.action));
  };
  return {
    get: () => current,
    subscribe: (f: () => void) => {
      subs.add(f);
      return () => void subs.delete(f);
    },
    show: (t: ToastInput) => {
      set({ ...t, id: ++id });
      arm();
    },
    hide: () => {
      clearTimeout(timer);
      set(null);
    },
    pause: () => clearTimeout(timer),
    resume: arm,
  };
}
