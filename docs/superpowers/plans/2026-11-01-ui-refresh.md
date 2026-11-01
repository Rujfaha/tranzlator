# UI Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ปรับ UI ให้มีโครง/พฤติกรรมแบบ Google Translate (เว็บ + Android) แต่คงสไตล์โมโนโครมแบบ fastwork ของเรา, เพิ่มโลโก้, เปลี่ยนปุ่มใส่ key เป็น suggestion, ทำ motion ของปุ่มและระบบ Toast ให้ลื่นและเป็นมืออาชีพ

**Architecture:** แก้เฉพาะฝั่งแอป (`src/`) — Worker/API ไม่แตะ เพิ่ม primitive กลาง 2 ตัว (`PressableScale`, `ToastProvider`) แล้วให้ทุก component ใช้ แยก layout เป็น `WideLayout` / `MobileLayout` ที่ใช้ component ชุดเดียวกัน

**Tech Stack:** ของเดิม (Expo SDK 58, Expo Router ที่ `src/app/`, NativeWind 4.2.7 + Tailwind 3.4, Reanimated 4, lucide-react-native, react-native-svg, expo-clipboard) — ห้ามเพิ่ม dependency

**Spec:** `docs/superpowers/specs/2026-11-01-ui-refresh-design.md` (ต่อยอด `docs/superpowers/specs/2026-11-01-tranzlator-design.md`)

## Global Constraints

- คง token เดิมใน `tailwind.config.js` / `src/ui/motion.ts`; เพิ่มได้เฉพาะที่ spec §2 ระบุ; ห้าม hex/arbitrary value ใน `.tsx`
- โทนสว่างเท่านั้น ห้ามใช้สีน้ำเงิน/ธีมมืดจาก Google
- ไม่มี emoji; ไอคอน lucide ผ่าน `src/ui/icons.ts`
- ทุกปุ่ม/แถวที่กดได้ใช้ `PressableScale`; ทุก animation เคารพ `useReducedMotion()` (เหลือ fade 125ms)
- ข้อความ UI ตาม spec §8–§9 ตรงตัว
- ไม่แตะ `worker/`, `migrations/`, `wrangler.jsonc` และเทสต์ฝั่ง worker ต้องผ่านเหมือนเดิม
- พื้นที่แตะ ≥ 44, focus ring เดิม, ไม่มี horizontal scroll ที่ทุก viewport

## Review Focus

1. คีย์บอร์ด Android เปิดตอนแนวตั้ง → แถบล่าง (ภาษา + แปล) อยู่เหนือคีย์บอร์ด ไม่โดนบัง (Task 4 manual / web: ตรวจ layout ไม่ทับ)
2. เปลี่ยนภาษาปลายทางระหว่างกำลังแปล → ไม่ crash, ผลที่ได้แสดงตามคำขอเดิม, ปุ่มแปลยัง single-flight (Task 5)
3. Toast ซ้อนเร็วๆ (คัดลอก 3 ครั้งติด) → เหลืออันเดียว ไม่มี timer เก่าปิด toast ใหม่ (Task 1 test)
4. วางข้อความยาวกว่า 2000 จาก clipboard → ตัดเหลือ 2000 (Task 4 test ของ helper)
5. Reduced motion → ไม่มี scale/translate ใดๆ เหลือแค่ fade (Task 6 manual)

---

### Task 1: Motion primitives, Toast, helpers

**Files:**
- Modify: `tailwind.config.js`, `src/ui/motion.ts`, `src/ui/icons.ts`
- Create: `src/ui/PressableScale.tsx`, `src/ui/Toast.tsx`, `src/ui/text.ts`
- Modify: `src/app/_layout.tsx` (ห่อด้วย `ToastProvider`)
- Test: `test/ui-helpers.test.ts`

**Interfaces:**
- Produces:
  - token ตาม spec §2 (`source-lg/md/sm`, `shadow-popover`, `motion.duration.{exit,toast,toastLong,dots}`, `motion.press.scale`)
  - `sourceSize(length: number): "source-lg" | "source-md" | "source-sm"` — ≤40 lg, ≤160 md, อื่น sm (`src/ui/text.ts`)
  - `clampPaste(s: string): string` — ตัดเหลือ 2000 ตัวอักษร (`src/ui/text.ts`)
  - `pushRecent(recents: Lang[], lang: Lang): Lang[]` — ถ้าอยู่แล้วคืนเดิม, ไม่อยู่ → ใส่หน้า ตัดให้เหลือ 3 (`src/ui/text.ts`)
  - `toastDuration(kind: "success" | "error" | "info", hasAction: boolean): number` — success ไม่มี action 4000, อื่น 6000
  - `<PressableScale className? disabled? onPress accessibilityLabel? accessibilityRole? hoverClassName? children>` — press scale/opacity ตาม spec §7, `hoverClassName` ใช้ตอน hover บนเว็บ
  - `useToast(): { show(t: { kind: "success"|"error"|"info"; message: string; action?: { label: string; onPress(): void } }): void; hide(): void }` — แสดงทีละอัน, อันใหม่แทนอันเก่าและล้าง timer เก่า

- [ ] **Step 1: Write the failing tests**

```ts
it("sourceSize thresholds", () => {
  expect(sourceSize(40)).toBe("source-lg");
  expect(sourceSize(41)).toBe("source-md");
  expect(sourceSize(160)).toBe("source-md");
  expect(sourceSize(161)).toBe("source-sm");
});
it("clampPaste cuts to 2000", () => expect(clampPaste("ก".repeat(2500))).toHaveLength(2000));
it("pushRecent keeps existing order", () => expect(pushRecent(["en","th","ja"], "th")).toEqual(["en","th","ja"]));
it("pushRecent prepends and drops last", () => expect(pushRecent(["en","th","ja"], "ko")).toEqual(["ko","en","th"]));
it("toastDuration", () => {
  expect(toastDuration("success", false)).toBe(4000);
  expect(toastDuration("success", true)).toBe(6000);
  expect(toastDuration("error", false)).toBe(6000);
});
```

- [ ] **Step 2: Run** `npx vitest run test/ui-helpers.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** ตาม Interfaces; Toast ตาม spec §8 (Reanimated entering/exiting, timer อยู่ใน ref, hover หยุดนับบนเว็บ)
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` — Expected: PASS ทั้งหมด
- [ ] **Step 5: Commit** `feat(ui): press motion, toast system and text helpers`

---

### Task 2: Header โลโก้ + suggestion แทนปุ่มใส่ key

**Files:**
- Create: `src/ui/Logo.tsx`, `src/ui/Header.tsx`, `src/ui/KeySuggestion.tsx`
- Modify: `src/app/index.tsx`

**Interfaces:**
- Consumes: `PressableScale`, `useToast`
- Produces:
  - `<Logo size?: number>` — mark SVG + wordmark ตาม spec §3
  - `<Header compact: boolean wide: boolean needsKey: boolean onHome() onSettings()>` — badge จุดเมื่อ `needsKey`
  - `<KeySuggestion onPress()>` — spec §4

- [ ] **Step 1: Implement** — ลบ empty-state ปุ่ม "ตั้งค่า" เดิมใน `index.tsx`; `onHome` ล้าง `text`, `data`, `error`, `selected`; Ctrl/Cmd+Enter ตอนไม่มี key → toast info + action "ตั้งค่า"
- [ ] **Step 2: Verify** — `npx expo export -p web` + `npx wrangler dev`, เปิด 1440×900 และ 360×800: โลโก้คมที่ทั้งสองขนาด, จุด badge มีตอนไม่มี key และหายหลังบันทึก, suggestion กดแล้วเปิดตั้งค่า, ไม่มีปุ่ม "ตั้งค่า" ใหญ่เหลืออยู่
- [ ] **Step 3: Commit** `feat(ui): logo header and API key suggestion`

---

### Task 3: Layout เว็บ/จอกว้างแบบ Google Translate

**Files:**
- Create: `src/ui/LanguageTabs.tsx`, `src/ui/LanguageMenu.tsx`, `src/ui/WideLayout.tsx`
- Modify: `src/ui/SourcePane.tsx`, `src/ui/ContextDeck.tsx`, `src/app/index.tsx`
- Delete: `src/ui/LanguageBar.tsx` (ถูกแทนที่)

**Interfaces:**
- Consumes: `pushRecent`, `PressableScale`, `Header`, `KeySuggestion`
- Produces:
  - `<LanguageTabs items: { key: string; label: string }[] active: string onSelect(key) trailing?: ReactNode>` — เส้นใต้เลื่อน (วัด `onLayout` ของแต่ละแท็บ)
  - `<LanguageMenu open anchor? selected: Lang onSelect(l: Lang) onClose()>` — popover เว็บ ตาม spec §5
  - `<WideLayout compact: boolean header source results tabs>` — ประกอบ layout spec §5 (max-width 1200, การ์ดซ้าย/ขวา)
  - state `recents: Lang[]` ใน `index.tsx` เริ่ม `["en","th","ja"]`
  - `SourcePane` props เพิ่ม `variant: "card" | "bare"` และ `sizeClass` (มือถือใช้ `sourceSize`)

- [ ] **Step 1: Implement** ตาม spec §5 รวม compact (height < 500)
- [ ] **Step 2: Verify** ที่ 1440×900, 1024×768, 768×1024, 800×360 (compact): ไม่มี horizontal scroll, เส้นใต้เลื่อนลื่นตอนสลับภาษา, เมนูภาษาเปิด/ปิด (Esc, คลิกนอก), ภาษาจากเมนูเข้าไปเป็นแท็บแรก
- [ ] **Step 3: Commit** `feat(ui): google-translate style wide layout with language tabs`

---

### Task 4: Layout มือถือแนวตั้งแบบแอป Google Translate

**Files:**
- Create: `src/ui/MobileLayout.tsx`, `src/ui/BottomDock.tsx`, `src/ui/LanguageSheet.tsx`, `src/ui/PasteChip.tsx`
- Modify: `src/app/index.tsx`, `src/ui/SourcePane.tsx`

**Interfaces:**
- Consumes: `sourceSize`, `clampPaste`, `pushRecent`, `PressableScale`, `useToast`
- Produces:
  - `<BottomDock detected?: string target: Lang onOpenLanguages() onTranslate() canTranslate loading>` — spec §6, อยู่เหนือคีย์บอร์ด (`KeyboardAvoidingView` เฉพาะ dock หรือ `useAnimatedKeyboard` ของ Reanimated) + safe-area ล่าง
  - `<LanguageSheet open recents selected onSelect onClose>` — เต็มจอ, Android back ปิด (`BackHandler`)
  - `<PasteChip onPaste(text: string)>` — clipboard ว่าง → toast info "ไม่มีข้อความในคลิปบอร์ด"
  - หลังแปลสำเร็จ: scroll ไปการ์ดแรก

- [ ] **Step 1: Implement** ตาม spec §6
- [ ] **Step 2: Verify** ที่ 360×800 และ 412×915: placeholder 28px, ขนาดตัวอักษรย่อตามความยาว, ปุ่มวางใช้ได้, dock ติดล่าง, หน้าเลือกภาษาเลื่อนขึ้น/ลงลื่น, แถวที่เลือกเป็น pill มี check; `npx expo export -p android` bundle ผ่าน
- [ ] **Step 3: Commit** `feat(ui): mobile layout with bottom dock and language sheet`

---

### Task 5: Alerts + motion ของปุ่ม

**Files:**
- Modify: `src/ui/ContextDeck.tsx`, `src/ui/ContextCard.tsx`, `src/ui/AddContextCard.tsx`, `src/ui/SettingsSheet.tsx`, `src/ui/SourcePane.tsx`, `src/app/index.tsx`
- Create: `src/ui/LoadingDots.tsx`, `src/ui/InlineError.tsx`

**Interfaces:**
- Consumes: `useToast`, `PressableScale`, `motion`
- Produces:
  - `<LoadingDots>` — spec §7
  - `<InlineError message onRetry onSettings?>` — spec §8; `onSettings` แสดงเมื่อ error มาจาก 401 (ให้ `api.ts` throw error ที่มี `status` — เพิ่ม field `status?: number` ใน Error ที่ throw อยู่แล้ว ไม่เปลี่ยนข้อความ)

- [ ] **Step 1: Write the failing test** ใน `test/api.test.ts`: `it("401 error carries status 401", ...)`
- [ ] **Step 2: Run** `npx vitest run test/api.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** — ทุกปุ่มเปลี่ยนเป็น `PressableScale`; ปุ่มแปลแสดง `LoadingDots` (ความกว้างคงที่); copy pop + toast "คัดลอกแล้ว"; save → toast "บันทึกแล้ว" (ลบ toast เดิมใน `index.tsx`); `add()` จับ error → toast error + action "ลองอีกครั้ง"; SettingsSheet เพิ่ม exit animation 200ms (render ค้างจนจบ animation แล้วค่อย unmount); ตัวนับเกิน 2000 ตาม spec §8
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` — Expected: PASS
- [ ] **Step 5: Commit** `feat(ui): professional toasts, inline errors and smooth button motion`

---

### Task 6: ตรวจรวม

- [ ] **Step 1:** `npx vitest run`, `npx tsc --noEmit`, `npx tsc -p tsconfig.worker.json`, `npx expo export -p web`, `npx expo export -p android` — ผ่านทั้งหมด
- [ ] **Step 2:** `grep -rnE "#[0-9a-fA-F]{3,6}|-\[" src --include=*.tsx` ว่าง; ไม่มี emoji; ทุก `Pressable` เหลือเฉพาะใน `PressableScale.tsx`
- [ ] **Step 3:** เปิดใน Chrome (fetch stub เหมือนรอบก่อน — ห้ามเรียก provider จริง) ที่ 360×800, 412×915, 800×360, 768×1024, 1440×900 ทั้งสถานะ: ไม่มี key / มี key ว่าง / กำลังโหลด / มีผล / error 401 / error network / reduced motion — บันทึก screenshot ไว้ที่ `docs/screenshots/ui-refresh/` (ชื่อ `<viewport>-<state>.png`) เพื่อให้ผู้ใช้ดู
- [ ] **Step 4: Commit** `chore(ui): refresh verification screenshots`
