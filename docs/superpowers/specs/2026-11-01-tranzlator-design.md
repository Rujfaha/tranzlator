# Tranzlator — Design Spec

แอปแปลภาษาที่แสดงคำแปล "แยกตามบริบท" เป็นตัวเลือก แล้วให้ผู้ใช้เพิ่มบริบทเองได้
ใช้ได้ทั้งเว็บ (responsive ทุกขนาดจอ) และ Android APK (แนวตั้ง/แนวนอน)

## 1. ขอบเขต (เอาแค่นี้)

0. ผู้ใช้เลือก AI provider จาก dropdown + ใส่ API key ของตัวเอง (หน้าตั้งค่า) — ระบบไม่มี key กลาง ผู้ดูแลโปรเจกต์ไม่มีค่าใช้จ่าย AI
1. ผู้ใช้กรอกข้อความ + เลือกภาษาปลายทาง → กด "แปล" (หรือ Ctrl/Cmd+Enter)
2. ได้การ์ดคำแปล 3–4 ใบ แต่ละใบ = 1 บริบทที่ AI เลือกให้เหมาะกับข้อความนั้น
3. ผู้ใช้พิมพ์บริบทที่ต้องการเพิ่ม → ได้การ์ดใหม่ต่อท้าย
4. กดคัดลอกคำแปลจากการ์ดใดก็ได้

ไม่ทำในรอบนี้: login, ประวัติ, dark mode, แปลเสียง/ภาพ, offline

## 2. ระบบ

```
[เว็บ / Android APK (Expo)] ──(key ของผู้ใช้ใน header)──► Cloudflare Worker ──► D1
   key เก็บในเครื่องผู้ใช้                                     │
                                                              └─► Anthropic / Google Gemini / OpenAI / OpenRouter
```

- Worker ตัวเดียว: เสิร์ฟไฟล์เว็บ (static assets จาก `dist/`) + `/api/*`
- D1: cache คำแปลเฉพาะบริบทที่ AI เลือก (สูงสุด 6) — บริบทที่ผู้ใช้เพิ่มเองไม่เก็บลง D1 ส่งกลับเฉพาะผู้ขอ แอปถือไว้ใน state (กัน cache poisoning)
- Worker ส่ง key ต่อให้ provider แล้วทิ้ง — ไม่บันทึก ไม่ log ไม่ผ่าน AI Gateway
- Worker เรียกได้เฉพาะ base URL ที่ hardcode ของ 4 provider (ผู้ใช้กำหนด URL เองไม่ได้)

### API

| Method | Path | Body | 200 |
|---|---|---|---|
| POST | `/api/translate` | `{ text, target }` | `{ id, sourceLang, results: Result[] }` |
| POST | `/api/translate/:id/contexts` | `{ context }` | `Result` |

`Result = { context: string, text: string, note: string, custom: boolean }`

- ทุก request ต้องมี header `X-AI-Provider` ∈ `anthropic gemini openai openrouter`, `X-AI-Key` (ไม่ว่าง), `X-AI-Model` (ไม่ว่าง, ≤ 100 ตัวอักษร)
- `text` 1–2000 ตัวอักษร (หลัง trim), `context` 1–200, `target` ∈ `th en ja zh ko vi id`
- Error: 400 input/header ผิด, 401 provider ปฏิเสธ key, 404 ไม่พบ id, 429 เกิน rate limit ของเราหรือโควตา key หมด, 502 AI ล้ม/ตอบ JSON ผิด — body `{ error: string }` ข้อความภาษาไทย บอกวิธีแก้
- `id` = SHA-256 hex ของ `model + "\n" + target + "\n" + text.trim()` → เจอใน D1 คืนทันที ไม่เรียก AI (ยังต้องมี header ครบ)
- Rate limit ต่อ IP: 20 ครั้ง/นาที (Workers Rate Limiting binding)

### D1

```
translations(id TEXT PK, source_text TEXT, source_lang TEXT, target_lang TEXT, created_at INTEGER)
results(id INTEGER PK AUTOINCREMENT, translation_id TEXT REFERENCES translations(id),
        context TEXT, text TEXT, note TEXT, is_custom INTEGER, created_at INTEGER)
```

## 3. การเชื่อม AI provider

ตัดสินใจ: **ผู้ใช้ใส่ key ของตัวเอง (BYOK)** เลือก provider จาก dropdown — โปรเจกต์ open source และฟรีสำหรับผู้ดูแล

| Provider (dropdown) | รูปแบบ API | Base URL (hardcode) |
|---|---|---|
| Anthropic (Claude) | Messages API | `https://api.anthropic.com/v1/messages` |
| Google Gemini | generateContent | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` |
| OpenAI | Chat Completions | `https://api.openai.com/v1/chat/completions` |
| OpenRouter | Chat Completions (เหมือน OpenAI) | `https://openrouter.ai/api/v1/chat/completions` |

- 3 adapter (anthropic, gemini, openai-compatible) — OpenRouter ใช้ adapter เดียวกับ OpenAI ต่างแค่ URL
- แต่ละ provider มี model เริ่มต้นใน `src/providers.ts` (Anthropic = `claude-sonnet-5-5`; ของ provider อื่นตรวจชื่อรุ่นล่าสุดตอน implement) ผู้ใช้แก้ชื่อ model ได้
- หน้าตั้งค่ามีลิงก์ "ขอ API key" ไปหน้า console ของแต่ละ provider
- โค้ดเรียก AI อยู่ไฟล์เดียว (`worker/ai.ts`)

Prompt: ระบบสั่งให้ตอบ JSON เท่านั้น, ให้ AI เลือก 3–4 บริบทที่เข้ากับข้อความ, `note` สั้น ≤ 1 ประโยคภาษาไทย บอกว่าใช้ในสถานการณ์ไหน ฝั่ง Worker validate JSON ทุกครั้ง

## 4. Visual design

แรงบันดาลใจ: โครงสองฝั่งแบบ Google Translate (ข้อความต้นทาง | ผลแปล) + ภาษาภาพของ fastwork.com
(โทนขาว-เทา-ดำ, panel ขาวลอยบนพื้นเทา, ปุ่มทรง pill สีเข้ม, การ์ดเงาสองชั้น, easing แบบสปริง)
ไม่ใช้ emoji — ไอคอนเส้นจาก `lucide-react-native`

### Tokens (`tailwind.config.js` ผ่าน NativeWind; easing/duration ใน `src/ui/motion.ts`)

| ชื่อ | ค่า | ใช้กับ |
|---|---|---|
| `ink` | `#171717` | ตัวอักษรหลัก, ขอบการ์ดที่เลือก |
| `graphite` | `#262626` | ปุ่มหลัก, chip บริบทที่เลือก |
| `muted` | `#737373` | ข้อความรอง, note |
| `disabled` | `#A3A3A3` | ปุ่ม/ข้อความ disabled |
| `line` | `#EBEBEB` | เส้นแบ่ง, ขอบ input |
| `chip` | `#F1F1F1` | พื้น chip บริบท, segmented control |
| `shell` | `#F5F5F5` | พื้นหลังแอป |
| `paper` | `#FFFFFF` | panel, การ์ด |
| `danger` | `#E33F4A` | ข้อความ error เท่านั้น |

- Radius: `inner 6`, `element 12`, `container 16`, `panel 20`, `full 9999`
- Spacing: `6 12 16 24 32 48`
- เงาการ์ด: `0 2 4 rgba(0,0,0,.05)` + `0 4 8 rgba(0,0,0,.10)`
- Easing: `standard cubic-bezier(.24,1,.4,1)` 125ms (hover/press), `fan cubic-bezier(.22,1,.36,1)` 560ms (การ์ด)
- ฟอนต์: **Anuphan** (Google Fonts, รองรับไทย+ละติน, หัวไม่มีหัว ดูทันสมัยเข้ากับ Google Sans) น้ำหนัก 400/500/600
- Type scale: 13 note · 15 body · 17 input · 22 คำแปลบนการ์ด · 28 ชื่อแอป(web กว้าง) — sentence case, ไม่ใช้ตัวพิมพ์ใหญ่ทั้งคำ

### Layout

```
กว้าง ≥ 768 (เว็บ, แท็บเล็ต, มือถือแนวนอน)          แคบ < 768 (มือถือแนวตั้ง)
┌ shell #F5F5F5 ───────────────────────────────┐   ┌ paper ────────────────┐
│ Tranzlator                                   │   │ Tranzlator            │
│┌ panel ขาว r20 ─────────────────────────────┐│   │ ตรวจภาษาอัตโนมัติ      │
││ ตรวจภาษาอัตโนมัติ  │ (EN)(TH)(JA)(ZH)...    ││   │ (EN)(TH)(JA) ...  ⇠เลื่อน│
││────────────────────┼───────────────────────││   │ ┌ input ───────────┐  │
││ input สูงเต็ม pane │ การ์ดบริบท (เลื่อนได้) ││   │ │                  │  │
││                    │ การ์ด                  ││   │ └ 0/2000   [แปล] ┘  │
││ 0/2000  [x] [แปล]  │ + เพิ่มบริบท           ││   │ การ์ด / การ์ด / ...   │
│└────────────────────┴───────────────────────┘│   │ + เพิ่มบริบท           │
└──────────────────────────────────────────────┘   └───────────────────────┘
```

- กว้าง: panel ขาวลอยบนพื้นเทา ห่างขอบ 12, สองคอลัมน์ 1:1, แต่ละฝั่ง scroll แยก
- แคบ: panel เต็มจอไม่มี radius, คอลัมน์เดียว scroll ทั้งหน้า, ปุ่ม "แปล" อยู่ใต้ input
- ภาษาปลายทาง: segmented control ทรง pill เลื่อนแนวนอนได้
- ชิดซ้ายทั้งหมด (อ่านง่ายสำหรับข้อความหลายภาษา), ความกว้างข้อความบนการ์ด ≤ 70ch
- Android: `orientation: "default"`, ใช้ safe-area, คีย์บอร์ดไม่บัง input

### การ์ดบริบท (จุดเด่นจุดเดียวของงานนี้)

```
┌───────────────────────────────────────┐
│ (ทางการ)                        [copy] │  ← chip เทา; การ์ดที่เลือก chip เป็น graphite ตัวขาว
│ Could you please send me the file?     │  ← 22px ink
│ เหมาะกับอีเมลงานหรือคุยกับลูกค้า         │  ← 13px muted
└───────────────────────────────────────┘
```

- **ช่วงเดียวที่มี motion อัตโนมัติ:** ผลแปลมาถึง → การ์ดเริ่มซ้อนกันเป็นสำรับเอียงเล็กน้อย (0°, 1°, 2°…) แล้ว "กาง" ลงมาเป็นรายการ ด้วย `fan` easing 560ms เหลื่อมกันใบละ 60ms (แบบการ์ด fan ของ fastwork)
- ระหว่างรอ: การ์ด skeleton 3 ใบซ้อนกัน หายใจช้าๆ (opacity .4↔1)
- แตะการ์ด = เลือก (chip เข้ม, ขอบ ink 1px) — ไม่มี hover effect ทุกการ์ด มีแค่เงาเพิ่มเล็กน้อยบน `(hover: hover)`
- คัดลอกแล้ว: ไอคอน copy เปลี่ยนเป็น check 1.5 วินาที + ข้อความ "คัดลอกแล้ว" สำหรับ screen reader
- "เพิ่มบริบท" เป็นการ์ดสุดท้าย: ขอบเส้นประ `line`, input + ปุ่ม "เพิ่ม" → การ์ดใหม่ slide เข้ามาแทนที่ แล้วการ์ดเพิ่มบริบทเลื่อนลง
- `prefers-reduced-motion` / Android "remove animations": ไม่เอียง ไม่กาง ใช้ fade 125ms อย่างเดียว

### หน้าตั้งค่า (sheet)

เปิดจากไอคอน `Settings` มุมขวาบนของ header — จอกว้างเป็น dialog กลางจอ (r16), จอแคบเป็น bottom sheet (r20 มุมบน) เลื่อนขึ้นด้วย `standard` easing 300ms

```
┌ ตั้งค่า AI ───────────────────────── [x] ┐
│ ผู้ให้บริการ   [ Anthropic (Claude)  ▾ ] │
│ API key        [ ••••••••••••   ][แสดง] │
│ โมเดล          [ claude-sonnet-5-5     ] │
│ ขอ API key ได้ที่ console.anthropic.com   │
│ key เก็บในเครื่องนี้เท่านั้น               │
│                              [ บันทึก ] │
└──────────────────────────────────────────┘
```

- เปลี่ยน provider → ช่องโมเดลเปลี่ยนเป็นค่าเริ่มต้นของ provider นั้น
- ยังไม่มี key: ฝั่งผลแปลแสดง "ใส่ API key ในหน้าตั้งค่าเพื่อเริ่มแปล" + ปุ่ม "ตั้งค่า" และปุ่ม "แปล" disabled
- เก็บ key: Android ใช้ `expo-secure-store`, เว็บใช้ `localStorage` (แจ้งในหน้าตั้งค่าว่า key เก็บในเบราว์เซอร์นี้)

### ข้อความใน UI

| ที่ | ข้อความ |
|---|---|
| placeholder input | พิมพ์ข้อความที่ต้องการแปล |
| ปุ่มหลัก | แปล |
| สถานะว่างฝั่งผล | คำแปลแต่ละบริบทจะแสดงที่นี่ |
| placeholder เพิ่มบริบท | เช่น ข้อความขอลาหัวหน้าคนญี่ปุ่น |
| ปุ่มเพิ่ม | เพิ่ม |
| error 429 | ส่งคำขอถี่เกินไป ลองใหม่ในอีก 1 นาที |
| error 502 | แปลไม่สำเร็จ กดแปลอีกครั้ง |
| error network | เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วลองใหม่ |
| error 401 | API key ไม่ถูกต้อง ตรวจ key ในหน้าตั้งค่า |
| error 429 (โควตา key) | โควตาของ API key นี้หมด ตรวจที่ผู้ให้บริการของคุณ |
| ยังไม่มี key | ใส่ API key ในหน้าตั้งค่าเพื่อเริ่มแปล |
| ปุ่มบันทึกตั้งค่า / toast | บันทึก / บันทึกแล้ว |

### คุณภาพขั้นต่ำ

focus ring มองเห็นได้ (2px ink, offset 2), พื้นที่แตะ ≥ 44×44, contrast ข้อความ ≥ 4.5:1 (`muted` บน `paper` = 4.7:1), ปุ่มมี accessibilityLabel
