# Tranzlator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แอปแปลภาษาที่คืนคำแปลแยกตามบริบทเป็นการ์ด และให้ผู้ใช้เพิ่มบริบทเองได้ — บนเว็บ (Cloudflare) และ Android APK

**Architecture:** Expo (React Native + react-native-web) โค้ดชุดเดียว export เป็นเว็บไปไว้ใน `dist/` ซึ่ง Cloudflare Worker ตัวเดียวเสิร์ฟพร้อม `/api/*` Worker เก็บ cache ใน D1 และเรียก AI provider ที่ผู้ใช้เลือก ด้วย API key ของผู้ใช้ที่ส่งมาใน header (BYOK) APK เรียก Worker URL เดียวกัน

**Tech Stack:** Expo SDK ล่าสุด + Expo Router, NativeWind (Tailwind สำหรับ React Native — ใช้คู่เวอร์ชัน NativeWind/Tailwind ตามเอกสาร NativeWind ตอน implement), react-native-reanimated, lucide-react-native, @expo-google-fonts/anuphan, expo-secure-store, Cloudflare Workers + D1 + Rate Limiting binding, Wrangler, Vitest + @cloudflare/vitest-pool-workers, EAS Build

**Spec:** `docs/superpowers/specs/2026-11-01-tranzlator-design.md`

## Global Constraints

- ห้ามใช้ emoji ใน UI ทั้งหมด ไอคอนใช้ `lucide-react-native` เท่านั้น
- สไตล์เขียนด้วย class ของ NativeWind (`className`) เป็นหลัก; สี/radius/spacing/ฟอนต์ประกาศใน `tailwind.config.js` เท่านั้น ใช้ชื่อ token (`bg-paper`, `text-ink`, `rounded-panel`) ห้าม hardcode hex หรือ arbitrary value (`bg-[#...]`) ใน component
- ค่า easing/duration สำหรับ Reanimated อยู่ใน `src/ui/motion.ts` เท่านั้น
- animation ใช้ Reanimated (ไม่ใช้ animation จาก CDN — ใช้ไม่ได้บน Android native)
- ฟอนต์ Anuphan 400/500/600; ข้อความ UI ภาษาไทยตามตาราง "ข้อความใน UI" ใน spec ตรงตัว
- Breakpoint เดียว: กว้าง ≥ 768 = สองคอลัมน์, < 768 = คอลัมน์เดียว
- `text` 1–2000 (หลัง trim), `context` 1–200, `target` ∈ `th en ja zh ko vi id`
- Rate limit 20 ครั้ง/นาที/IP
- BYOK: header `X-AI-Provider` ∈ `anthropic gemini openai openrouter`, `X-AI-Key`, `X-AI-Model` — Worker ห้ามเก็บ/log/echo key ใน response หรือ error ใดๆ และเรียกได้เฉพาะ base URL ที่ hardcode ใน spec §3
- ไม่มี API key ของโปรเจกต์อยู่ที่ใดเลย (ไม่มี Worker secret สำหรับ AI)
- Android `app.json`: `"orientation": "default"`; `prefers-reduced-motion` ต้องปิดการเอียง/กางการ์ด

## Review Focus

1. ข้อความมีแต่ช่องว่าง → 400 และปุ่ม "แปล" disabled (Task 1 test, Task 5 manual)
2. ข้อความเดียวกันต่างแค่ช่องว่างหัวท้าย → cache hit ไม่เรียก AI ซ้ำ (Task 3 test)
3. AI ตอบ JSON ห่อด้วย ```` ```json ```` → ยัง parse ได้ (Task 2 test)
4. กด "แปล" ซ้ำระหว่างโหลด → ส่ง request เดียว (Task 6 manual: ปุ่ม disabled ระหว่าง loading)
5. Android แนวนอนตอนคีย์บอร์ดเปิด → input ยังมองเห็นและพิมพ์ได้ (Task 7 manual)
6. Provider ตอบ error ที่มี key อยู่ในข้อความ → response ของเราต้องไม่มี key (Task 3 test)
7. key ผิด → 401 พร้อมข้อความไทยให้ไปแก้ในหน้าตั้งค่า ไม่ใช่ 502 (Task 3 test)

---

### Task 1: Scaffold + Worker skeleton + validation + D1 schema

**Files:**
- Create: Expo project ที่ root (`npx create-expo-app@latest . --template default`), ลบหน้าตัวอย่างใน `app/` ทิ้ง
- Create: `wrangler.jsonc`, `migrations/0001_init.sql`, `worker/index.ts`, `worker/validate.ts`, `worker/env.ts`, `vitest.config.ts`
- Test: `test/worker.test.ts`

**Interfaces:**
- Produces:
  - `type Env = { DB: D1Database; RATE_LIMITER: RateLimit; ASSETS: Fetcher }` (`worker/env.ts`)
  - `type AiConfig = { provider: Provider; key: string; model: string }`
  - `type AskModel = (cfg: AiConfig, system: string, user: string) => Promise<string>` (`worker/env.ts`)
  - `createHandler(ask: AskModel): ExportedHandler<Env>` (`worker/index.ts`); `export default createHandler(askModel)`
  - `validateAi(headers: Headers): AiConfig | string`, `validateTranslate(body: unknown): { text: string; target: Lang } | string`, `validateContext(body: unknown): { context: string } | string` — string = ข้อความ error ภาษาไทย (`worker/validate.ts`)
  - `const LANGS = ["th","en","ja","zh","ko","vi","id"] as const; type Lang`
  - `const PROVIDERS = ["anthropic","gemini","openai","openrouter"] as const; type Provider`

`wrangler.jsonc`: `main: "worker/index.ts"`, `assets: { directory: "./dist", binding: "ASSETS", run_worker_first: ["/api/*"] }`, `d1_databases: [{ binding: "DB", database_name: "tranzlator", migrations_dir: "migrations" }]`, `ratelimits: [{ name: "RATE_LIMITER", namespace_id: "1001", simple: { limit: 20, period: 60 } }]`. ตรวจชื่อ key ของ `ratelimits`/`assets` กับเอกสาร Wrangler ปัจจุบันก่อน

`migrations/0001_init.sql`: สองตารางตาม spec §2 + `CREATE INDEX results_translation ON results(translation_id)`

- [ ] **Step 1: Write the failing tests** — ใช้ `env` จาก `cloudflare:test` + `applyD1Migrations` ใน `beforeAll`, fake `ask` ที่ throw ถ้าถูกเรียก, fake `RATE_LIMITER` `{ limit: async () => ({ success: true }) }`

```ts
it("400 when text is whitespace", async () => {
  const res = await post("/api/translate", { text: "   ", target: "en" });
  expect(res.status).toBe(400);
  expect((await res.json()).error).toBeTypeOf("string");
});
it("400 when text > 2000 chars", ...)            // "ก".repeat(2001)
it("400 when target not in LANGS", ...)          // target: "fr"
it("400 when body is not JSON", ...)
it("400 when X-AI-Provider missing or not in PROVIDERS", ...)
it("400 when X-AI-Key empty", ...)
it("404 for unknown /api route", ...)            // POST /api/nope
```

helper `post(path, body, headers = { "X-AI-Provider": "anthropic", "X-AI-Key": "test-key", "X-AI-Model": "m" })`

- [ ] **Step 2: Run** `npx vitest run test/worker.test.ts` — Expected: FAIL (module not found)
- [ ] **Step 3: Implement** router ใน `worker/index.ts` (match `POST /api/translate` และ `POST /api/translate/:id/contexts` ด้วย `URL` + regex, อื่นๆ ใต้ `/api` → 404, ที่เหลือ `env.ASSETS.fetch`) และ `validate.ts`; route translate ยังคืน 501 หลังผ่าน validation
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS 7 tests
- [ ] **Step 5: Commit** `git commit -m "feat: worker skeleton with input validation and D1 schema"`

---

### Task 2: AI module — 3 adapters + prompts + response parsing

**Files:**
- Create: `worker/ai.ts`
- Test: `test/ai.test.ts`

**Interfaces:**
- Consumes: `AiConfig`, `AskModel`, `Lang`, `Provider` (Task 1)
- Produces:
  - `askModel: AskModel` — เลือก adapter ตาม `cfg.provider`, `max_tokens`/`maxOutputTokens` 1024:
    - `anthropic`: `POST https://api.anthropic.com/v1/messages`, headers `x-api-key`, `anthropic-version: 2023-06-01`, body `{ model, max_tokens, system, messages: [{ role: "user", content: user }] }` → `content[0].text`
    - `gemini`: `POST https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, header `x-goog-api-key`, body `{ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: [{ text: user }] }] }` → `candidates[0].content.parts[0].text`
    - `openai` / `openrouter`: `POST` URL ตาม spec §3, header `Authorization: Bearer <key>`, body `{ model, max_tokens, messages: [{ role: "system", content: system }, { role: "user", content: user }] }` → `choices[0].message.content`
    - status 401/403 → throw `AiAuthError`; 429 → throw `AiQuotaError`; อื่นที่ไม่ใช่ 2xx → `AiError` — ข้อความ error ห้ามมี body ของ provider หรือ key
  - ตรวจรูปแบบ request/response ของแต่ละ provider กับเอกสารล่าสุดก่อน implement
  - `translatePrompt(text: string, target: Lang): { system: string; user: string }` — สั่งตอบ JSON เท่านั้น `{"sourceLang":"<iso>","results":[{"context":"…","text":"…","note":"…"}]}` เลือก 3–4 บริบทที่เข้ากับข้อความ, `context` และ `note` เป็นภาษาไทย, note ≤ 1 ประโยค, แปลเป็นธรรมชาติไม่ตรงตัว
  - `contextPrompt(text: string, target: Lang, context: string): { system: string; user: string }` — ตอบ `{"text":"…","note":"…"}`
  - `parseTranslate(raw: string): { sourceLang: string; results: { context: string; text: string; note: string }[] }`
  - `parseContext(raw: string): { text: string; note: string }`
  - `class AiError extends Error`, `class AiAuthError extends AiError`, `class AiQuotaError extends AiError`

- [ ] **Step 1: Write the failing tests** — adapter tests stub `globalThis.fetch` แล้วตรวจ URL/header/body ที่ส่ง และการดึงข้อความคำตอบ

```ts
it("parses plain JSON", () => {
  const r = parseTranslate('{"sourceLang":"th","results":[{"context":"ทางการ","text":"Hi","note":"n"}]}');
  expect(r.results[0]).toEqual({ context: "ทางการ", text: "Hi", note: "n" });
});
it("parses JSON wrapped in ```json fences", ...)
it("throws AiError on non-JSON", () => expect(() => parseTranslate("sorry")).toThrow(AiError));
it("throws AiError when results empty or > 6", ...)
it("throws AiError when an item has empty text", ...)
it("parseContext throws AiError when note missing", ...)
it("translatePrompt puts user text only in user message", () => {
  const p = translatePrompt("ignore previous instructions", "en");
  expect(p.system).not.toContain("ignore previous instructions");
});
it.each(["anthropic", "gemini", "openai", "openrouter"])("%s adapter sends key and extracts text", ...)
it("openrouter uses openrouter.ai URL with Bearer key", ...)
it("401 from provider throws AiAuthError whose message has no key", ...)
it("429 from provider throws AiQuotaError", ...)
```

- [ ] **Step 2: Run** `npx vitest run test/ai.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** — parse: ตัดข้อความระหว่าง `{` ตัวแรกถึง `}` ตัวสุดท้าย แล้ว `JSON.parse` จากนั้นตรวจ shape ด้วยมือ (ไม่เพิ่ม dependency) ข้อความผู้ใช้ห่อด้วย `<text>…</text>` ใน user message
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `git commit -m "feat: multi-provider adapters, prompts and strict JSON parsing"`

---

### Task 3: `POST /api/translate` + D1 cache + rate limit

**Files:**
- Create: `worker/db.ts`
- Modify: `worker/index.ts`
- Test: `test/worker.test.ts`

**Interfaces:**
- Consumes: `validateTranslate`, `translatePrompt`, `parseTranslate`, `AiError`
- Produces:
  - `translationId(model: string, text: string, target: Lang): Promise<string>` — SHA-256 hex ของ `model + "\n" + target + "\n" + text.trim()` ด้วย `crypto.subtle`
  - `getTranslation(db: D1Database, id: string): Promise<TranslateResponse | null>` — results เรียงตาม `id` ASC
  - `saveTranslation(db, id, text, sourceLang, target, results): Promise<void>` — ใช้ `db.batch`
  - `type Result = { context: string; text: string; note: string; custom: boolean }`
  - `type TranslateResponse = { id: string; sourceLang: string; results: Result[] }`

- [ ] **Step 1: Write the failing tests** — fake ask นับจำนวนครั้งที่ถูกเรียก คืน JSON 3 บริบท

```ts
it("returns results from AI and stores them", async () => {
  const res = await post("/api/translate", { text: "ส่งไฟล์ให้หน่อย", target: "en" });
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.results).toHaveLength(3);
  expect(body.results.every((r) => r.custom === false)).toBe(true);
  expect(calls).toBe(1);
});
it("second identical request (extra whitespace) is a cache hit", async () => {
  await post("/api/translate", { text: "  ส่งไฟล์ให้หน่อย ", target: "en" });
  expect(calls).toBe(1);
});
it("same text, different target calls AI again", ...)           // calls === 2
it("502 with Thai error when AI returns garbage, nothing stored", ...)
it("429 when RATE_LIMITER.limit returns success:false", ...)
it("same text, different X-AI-Model calls AI again", ...)
it("401 with Thai message when ask throws AiAuthError", ...)
it("429 with quota message when ask throws AiQuotaError", ...)
it("no response body ever contains the X-AI-Key value", ...)   // ตรวจทุก response ในไฟล์ test
```

- [ ] **Step 2: Run** — Expected: FAIL (501)
- [ ] **Step 3: Implement** — ลำดับ: rate limit (key = `CF-Connecting-IP`) → validateAi → validate body → id → cache → ask → parse → save → 200; `AiAuthError` → 401 `"API key ไม่ถูกต้อง ตรวจ key ในหน้าตั้งค่า"`; `AiQuotaError` → 429 `"โควตาของ API key นี้หมด ตรวจที่ผู้ให้บริการของคุณ"`; `AiError`/fetch error อื่น → 502 `"แปลไม่สำเร็จ กดแปลอีกครั้ง"`; rate limit → 429 `"ส่งคำขอถี่เกินไป ลองใหม่ในอีก 1 นาที"`; ห้าม `console.log` headers
- [ ] **Step 4: Run** `npx vitest run` — Expected: PASS ทั้งหมด
- [ ] **Step 5: Commit** `git commit -m "feat: translate endpoint with D1 cache and rate limit"`

---

### Task 4: `POST /api/translate/:id/contexts`

**Files:**
- Modify: `worker/index.ts`, `worker/db.ts`
- Test: `test/worker.test.ts`

**Interfaces:**
- Consumes: `validateContext`, `contextPrompt`, `parseContext`, `getTranslation`
- Produces: `addResult(db: D1Database, translationId: string, r: Result): Promise<void>`; response = `Result` ที่ `custom: true`

- [ ] **Step 1: Write the failing tests**

```ts
it("404 for unknown id", ...)
it("400 for empty context / > 200 chars", ...)
it("appends custom result; later translate cache hit includes it last", async () => {
  const { id } = await (await post("/api/translate", { text: "ขอบคุณ", target: "ja" })).json();
  const r = await post(`/api/translate/${id}/contexts`, { context: "ขอบคุณหัวหน้าคนญี่ปุ่น" });
  expect(await r.json()).toMatchObject({ context: "ขอบคุณหัวหน้าคนญี่ปุ่น", custom: true });
  const again = await (await post("/api/translate", { text: "ขอบคุณ", target: "ja" })).json();
  expect(again.results.at(-1).custom).toBe(true);
});
```

- [ ] **Step 2: Run** — Expected: FAIL
- [ ] **Step 3: Implement** — rate limit, validateAi และการแปลง error เหมือน Task 3; `context` ที่ได้คืนคือข้อความที่ผู้ใช้พิมพ์ (trim แล้ว) ไม่ใช่ที่ AI ตั้ง
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** `git commit -m "feat: add custom context endpoint"`

---

### Task 5: App shell — NativeWind, tokens, fonts, responsive layout, language bar, source pane

**Files:**
- Create: `tailwind.config.js`, `global.css`, `metro.config.js`, `babel.config.js` (ตามขั้นตอนติดตั้ง NativeWind), `nativewind-env.d.ts`
- Create: `src/ui/motion.ts`, `src/ui/layout.ts`, `src/ui/LanguageBar.tsx`, `src/ui/SourcePane.tsx`, `src/api.ts`
- Modify: `app/_layout.tsx`, `app/index.tsx`, `app.json`
- Test: `test/layout.test.ts`

**Interfaces:**
- Consumes: response types จาก Task 3–4 (copy type ไว้ใน `src/api.ts`, ไม่ import ข้าม worker)
- Produces:
  - `tailwind.config.js` `theme.extend` — ค่าตาม spec §4 Tokens ตรงตัว: `colors.{ink,graphite,muted,disabled,line,chip,shell,paper,danger}`, `borderRadius.{inner:6,element:12,container:16,panel:20}` (`full` มีอยู่แล้ว), `fontFamily.{sans: Anuphan_400Regular, medium: Anuphan_500Medium, semibold: Anuphan_600SemiBold}`, `screens.wide: "768px"`
  - `motion` (`src/ui/motion.ts`) — `ease.{standard,fan}` เป็น `Easing.bezier(...)` ตาม spec, `duration.{fast:125,sheet:300,fan:560}`, `stagger: 60`
  - `isWide(width: number): boolean` — `width >= 768`
  - `translate(ai: AiSettings, text: string, target: Lang): Promise<TranslateResponse>` และ `addContext(ai: AiSettings, id: string, context: string): Promise<Result>` — ส่ง `X-AI-Provider`/`X-AI-Key`/`X-AI-Model`; base URL จาก `process.env.EXPO_PUBLIC_API_URL ?? ""` (เว็บใช้ relative path), error → throw `Error(message)` ด้วยข้อความไทยจาก body หรือ `"เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่"`
  - `<LanguageBar target onChange detected?>` — label ซ้าย `"ตรวจภาษาอัตโนมัติ"` (หรือชื่อภาษาที่ตรวจได้), segmented pill เลื่อนแนวนอน
  - `<SourcePane value onChange onSubmit loading>` — counter `n/2000`, ปุ่มล้าง (ไอคอน `X`), ปุ่ม "แปล" graphite pill, disabled เมื่อ trim ว่าง/เกิน 2000/loading, Ctrl/Cmd+Enter submit บนเว็บ

- [ ] **Step 1: Write the failing test**

```ts
it("isWide breakpoint", () => {
  expect(isWide(767)).toBe(false);
  expect(isWide(768)).toBe(true);
});
```

- [ ] **Step 2: Run** `npx vitest run test/layout.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** — ติดตั้ง NativeWind ตามเอกสาร (Expo guide) + `npx expo install react-native-reanimated lucide-react-native react-native-svg @expo-google-fonts/anuphan expo-font expo-clipboard react-native-safe-area-context`; `_layout.tsx` import `global.css`, โหลดฟอนต์ + `SafeAreaProvider`; จะใช้ prefix `wide:` ของ NativeWind หรือ `isWide()` ก็ได้ แต่ห้ามใช้ breakpoint อื่น; `index.tsx` ใช้ `useWindowDimensions` + `isWide` เลือกโครงตาม wireframe spec §4 (ฝั่งขวายังเป็น empty state `"คำแปลแต่ละบริบทจะแสดงที่นี่"`); `app.json` `orientation: "default"`, `web.output: "single"`; `KeyboardAvoidingView` บน Android
- [ ] **Step 4: Verify** — `npx vitest run` PASS; `npx expo start --web` แล้วดูที่ 360×800, 800×360, 768×1024, 1440×900: ไม่มี scroll แนวนอน, สองคอลัมน์ที่ ≥768, focus ring เห็นเมื่อกด Tab
- [ ] **Step 5: Commit** `git commit -m "feat: responsive app shell with language bar and source pane"`

---

### Task 5b: หน้าตั้งค่า AI (provider dropdown + API key)

**Files:**
- Create: `src/providers.ts`, `src/settings.ts`, `src/ui/SettingsSheet.tsx`
- Modify: `app/index.tsx` (ไอคอน `Settings` ใน header, empty state เมื่อไม่มี key)
- Test: `test/providers.test.ts`

**Interfaces:**
- Produces:
  - `PROVIDER_INFO: Record<Provider, { label: string; defaultModel: string; keyUrl: string }>` — label: `Anthropic (Claude)`, `Google Gemini`, `OpenAI`, `OpenRouter`; Anthropic `defaultModel: "claude-sonnet-5-5"`, `keyUrl: "https://console.anthropic.com/"`; อีกสามตัวใส่รุ่นล่าสุด/URL console ที่ตรวจแล้วตอน implement
  - `type AiSettings = { provider: Provider; key: string; model: string }`
  - `loadSettings(): Promise<AiSettings | null>`, `saveSettings(s: AiSettings): Promise<void>` — `Platform.OS === "web"` ใช้ `localStorage` (ห่อ try/catch), อื่นใช้ `expo-secure-store`
  - `<SettingsSheet open initial onClose onSave>` — dropdown provider (เปลี่ยนแล้ว model = `defaultModel`), key แบบซ่อน + ปุ่ม "แสดง"/"ซ่อน", ช่อง model, ลิงก์ไป `keyUrl`, ข้อความ "key เก็บในเครื่องนี้เท่านั้น", ปุ่ม "บันทึก" disabled เมื่อ key หรือ model ว่าง; จอกว้าง = dialog, จอแคบ = bottom sheet

- [ ] **Step 1: Write the failing test**

```ts
it("every provider has label, defaultModel and https keyUrl", () => {
  for (const p of PROVIDERS) {
    expect(PROVIDER_INFO[p].defaultModel).not.toBe("");
    expect(PROVIDER_INFO[p].keyUrl.startsWith("https://")).toBe(true);
  }
});
```

- [ ] **Step 2: Run** `npx vitest run test/providers.test.ts` — Expected: FAIL
- [ ] **Step 3: Implement** ตาม Interfaces; `npx expo install expo-secure-store`
- [ ] **Step 4: Verify** — เปิดแอปครั้งแรกเห็น empty state "ใส่ API key ในหน้าตั้งค่าเพื่อเริ่มแปล" + ปุ่ม "แปล" disabled; บันทึกแล้ว reload ยังอยู่; บน Android key ไม่อยู่ใน AsyncStorage
- [ ] **Step 5: Commit** `git commit -m "feat: BYOK settings with provider dropdown"`

---

### Task 6: Context deck — การ์ด, animation กาง, คัดลอก, เพิ่มบริบท, error

**Files:**
- Create: `src/ui/ContextCard.tsx`, `src/ui/ContextDeck.tsx`, `src/ui/AddContextCard.tsx`
- Modify: `app/index.tsx`

**Interfaces:**
- Consumes: class token จาก `tailwind.config.js`, `motion`, `translate`, `addContext`, `Result`, `AiSettings`
- Produces:
  - `<ContextCard result selected onSelect index>` — chip บริบท (`chip` → `graphite`/ขาวเมื่อ selected), คำแปล 22px, note 13px muted, ปุ่ม copy (`Copy` → `Check` 1.5s, `accessibilityLabel="คัดลอกคำแปล"`, ประกาศ `"คัดลอกแล้ว"`)
  - `<ContextDeck results loading error onAdd>` — loading: skeleton 3 ใบซ้อน; มีผล: animation กาง; error: ข้อความ `danger` + ปุ่ม "ลองอีกครั้ง"
  - `<AddContextCard onSubmit loading>` — ขอบเส้นประ, placeholder `"เช่น ข้อความขอลาหัวหน้าคนญี่ปุ่น"`, ปุ่ม "เพิ่ม"

Animation กาง (Reanimated): การ์ดใบที่ `i` เริ่มที่ `translateY = -(i * cardOffset)`, `rotate = i * 1deg`, `opacity` 0→1 แล้ววิ่งไป `0/0deg` ด้วย `withDelay(i * 60, withTiming(…, { duration: 560, easing: Easing.bezier(.22,1,.36,1) }))` — ถ้า `useReducedMotion()` ให้ fade 125ms อย่างเดียว การ์ดใหม่จาก "เพิ่ม" ใช้ `entering={FadeInDown}` ที่ปรับ easing เดียวกัน animation วิ่งเฉพาะตอนได้ผลชุดใหม่ ไม่ใช่ทุก render

- [ ] **Step 1: Implement** ตาม Interfaces; state ใน `index.tsx`: `{ text, target, loading, error, data, selected, adding }`; ปุ่ม "แปล" disabled ระหว่าง `loading`
- [ ] **Step 2: Verify manually** (worker จริงผ่าน `npx wrangler dev` + `npx expo export -p web`, หรือ `EXPO_PUBLIC_API_URL=http://localhost:8787 npx expo start --web`):
  - แปล "ช่วยส่งไฟล์ให้หน่อย" → EN ได้ 3–4 การ์ดที่กางลงมา
  - กด "แปล" รัวๆ ระหว่างโหลด → Network tab มี request เดียว
  - เพิ่มบริบท "ขอลาหัวหน้าคนญี่ปุ่น" → การ์ดใหม่ต่อท้าย custom
  - copy → clipboard ถูกต้อง, ไอคอนเปลี่ยนเป็น check
  - เปิด reduced motion ใน OS → ไม่มีการเอียง/กาง
  - ปิด worker → ข้อความ `"เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่"`
  - ไม่มี emoji ทั้งหน้า, ไม่มี hex/arbitrary value ใน component (`grep -rnE "#[0-9a-fA-F]{3,6}|-\[" src app --include=*.tsx` ต้องว่าง)
- [ ] **Step 3: Commit** `git commit -m "feat: context deck with fan-out animation and custom contexts"`

---

### Task 7: Deploy — Cloudflare + APK

**Files:**
- Create: `eas.json`
- Modify: `package.json` (scripts), `wrangler.jsonc` (`database_id`)

**Interfaces:**
- Consumes: ทุกอย่างก่อนหน้า
- Produces: scripts `"build:web": "expo export -p web"`, `"deploy": "npm run build:web && wrangler deploy"`, `"db:migrate": "wrangler d1 migrations apply tranzlator --remote"`

ขั้นตอนนี้ผู้ใช้ต้องทำเองบางส่วน (login):

- [ ] **Step 1:** ผู้ใช้รัน `! npx wrangler login`, แล้ว `npx wrangler d1 create tranzlator` ใส่ `database_id`
- [ ] **Step 2:** เพิ่ม `README.md`: วิธี deploy เอง + ส่วน "API key ของคุณ" อธิบายว่า key เก็บในเครื่องและผ่าน Worker โดยไม่ถูกบันทึก + ข้อความที่แปลถูก cache ใน D1
- [ ] **Step 3:** `npm run db:migrate && npm run deploy` — Expected: URL `*.workers.dev`; เปิดแล้วใส่ key ของตัวเอง แปลได้ทั้ง 4 provider ที่มี key ทดสอบ
- [ ] **Step 4:** `eas.json` profile `preview`: `{ "android": { "buildType": "apk" }, "env": { "EXPO_PUBLIC_API_URL": "https://<worker>.workers.dev" } }` → `npx eas build -p android --profile preview` (ผู้ใช้ login Expo เอง)
- [ ] **Step 5: Verify** บนมือถือ Android จริง: แนวตั้ง/แนวนอน, หมุนจอระหว่างมีผลแปลไม่หาย, แนวนอน+คีย์บอร์ดเปิดยังพิมพ์ได้, ปุ่ม back ไม่ปิดแอปกลางคัน
- [ ] **Step 6: Commit** `git commit -m "chore: cloudflare deploy and android apk build config"`
