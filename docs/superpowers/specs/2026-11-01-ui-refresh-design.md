# Tranzlator — UI Refresh Spec

ต่อยอดจาก `2026-11-01-tranzlator-design.md` — token สี/ฟอนต์/radius/easing เดิมทั้งหมดยังใช้ (โทนสว่าง ขาว-เทา-ดำ แบบ fastwork)
เอา **โครงและพฤติกรรม** มาจาก Google Translate (เว็บ: translate.google.co.th, Android: รูปใน `Downloads/inspirebygoogle`) — ไม่เอาสีน้ำเงิน/ธีมมืดของ Google

## 1. สิ่งที่เปลี่ยน (สรุป)

1. Header: โลโก้ (mark + wordmark) แทนคำว่า Tranzlator โดดๆ
2. ไม่มี key: ลบปุ่ม "ตั้งค่า" ใหญ่กลางฝั่งผลแปล → แถบคำแนะนำ (suggestion) + จุดบนไอคอนตั้งค่า
3. เว็บ/จอกว้าง: layout แบบ Google Translate เว็บ — แท็บภาษาขีดเส้นใต้ + การ์ดต้นทางขาวมีขอบ + การ์ดผลแปลพื้นเทา
4. Android แนวตั้ง: layout แบบแอป Google Translate — ช่องพิมพ์ตัวใหญ่, ปุ่ม "วาง", แถบล่าง (ภาษา + ปุ่มแปล) อยู่เหนือคีย์บอร์ด, หน้าเลือกภาษาเต็มจอ
5. ปุ่มทุกปุ่มมี press/hover animation เดียวกัน; sheet มีทั้งเข้าและออก; ปุ่มแปลมีสถานะโหลด
6. แจ้งเตือนทั้งหมดผ่านระบบ Toast เดียว + error ฝั่งผลแปลเป็น inline block

## 2. Token เพิ่ม

`tailwind.config.js`:
- `fontSize.source-lg: 28px/36px`, `source-md: 22px/30px`, `source-sm: 17px/26px` (ช่องพิมพ์ขนาดเปลี่ยนตามความยาว)
- `boxShadow.popover: "0 4px 6px rgba(0,0,0,0.10), 0 12px 24px rgba(0,0,0,0.15)"` (จาก dialog ของ fastwork)

`src/ui/motion.ts`:
- `duration.exit: 200`, `duration.toast: 4000`, `duration.toastLong: 6000`, `duration.dots: 1200`
- `press: { scale: 0.97 }`

## 3. Header + โลโก้

```
[mark] tranzlator                                  (ตั้งค่า•)
```

- **Mark** (`src/ui/Logo.tsx`, react-native-svg, 28×28 ที่ viewBox 28): ฟองคำพูดมุมโค้งสองอันซ้อนเหลื่อมแนวทแยง — อันหลังเส้นขอบ `ink` 1.75, อันหน้าทึบ `graphite` — สื่อ "สองเสียง/สองภาษา" อ่านออกที่ 20px, ไม่มีสีอื่น
- **Wordmark**: `tranzlator` ตัวพิมพ์เล็กทั้งคำ, `font-sans-semibold`, 20px เว็บ / 18px มือถือ, `letterSpacing: -0.4`, สี `ink`, ห่างจาก mark 8px
- กดโลโก้ = ล้างข้อความและผลแปล (กลับหน้าเริ่ม) — `accessibilityLabel="tranzlator หน้าแรก"`
- Header เว็บ: สูง 64, ชิดขอบ content (max-width 1200 กลางจอ), เส้นใต้ `line` 1px; มือถือ: สูง 56, ไม่มีเส้นใต้
- ไอคอนตั้งค่า: ปุ่มวงกลม 44; ถ้ายังไม่มี key มีจุด `ink` 8px มุมขวาบนของไอคอน (badge) + `accessibilityLabel="ตั้งค่า (ยังไม่ได้ใส่ API key)"`

## 4. ไม่มี key → Suggestion

ลบ empty-state ปุ่ม "ตั้งค่า" เดิมทิ้ง แทนด้วยแถวคำแนะนำ (ยืมรูปแบบแถว "ทดสอบอะไร / What are you testing? ↖" ของ Google Translate Android):

```
┌───────────────────────────────────────────────┐
│ [KeyRound]  ใส่ API key ของคุณเพื่อเริ่มแปล      [ArrowUpRight] │
│             เลือกผู้ให้บริการและใส่ key ในการตั้งค่า              │
└───────────────────────────────────────────────┘
```

- พื้น `chip`, radius `element`, padding 16, ทั้งแถวกดได้ → เปิดตั้งค่า; ปรากฏด้วย fade + เลื่อนขึ้น 8px (`standard` 300ms)
- ตำแหน่ง: เว็บ = บนสุดในการ์ดผลแปล; มือถือ = ใต้ช่องพิมพ์ เหนือแถบล่าง
- ปุ่ม "แปล" disabled; ถ้ากด Ctrl/Cmd+Enter ตอนไม่มี key → Toast "ใส่ API key ในการตั้งค่าก่อนแปล" + action "ตั้งค่า"

## 5. เว็บ / จอกว้าง (width ≥ 768)

```
┌ header ─────────────────────────────────────────────────────┐
│ [mark] tranzlator                                     (⚙•)  │
└─────────────────────────────────────────────────────────────┘
  ตรวจหาภาษา                         ไทย  อังกฤษ  ญี่ปุ่น  [v]
  ──────                              ────
┌ source (paper, ขอบ line, r16) ─┐ ┌ result (shell, r16) ─────────┐
│ พิมพ์ข้อความที่ต้องการแปล     [x]│ │ คำแปลแต่ละบริบทจะแสดงที่นี่     │
│                                 │ │  การ์ดบริบท (paper)            │
│                                 │ │  การ์ดบริบท                    │
│ 0/2000                  [แปล]  │ │  + เพิ่มบริบท                  │
└─────────────────────────────────┘ └──────────────────────────────┘
```

- พื้นหน้า `paper`, content กว้างสุด 1200 อยู่กลาง, padding ข้าง 24, ระหว่างการ์ด 16
- **แท็บภาษา** (`LanguageTabs`): ข้อความ `body` + `font-sans-medium`; แท็บ active สี `ink` + เส้นใต้ `ink` 2px ที่ **เลื่อนไปหาแท็บใหม่** (translateX + width, `standard` 300ms); แท็บอื่น `muted`, hover → `ink` 125ms
  - ฝั่งต้นทาง: แท็บเดียว "ตรวจหาภาษา"; หลังแปลกลายเป็น "ตรวจพบ: ไทย"
  - ฝั่งปลายทาง: 3 ภาษาล่าสุด (เริ่มต้น อังกฤษ, ไทย, ญี่ปุ่น) + ปุ่ม `ChevronDown` เปิดเมนูภาษา — เลือกภาษาที่ไม่อยู่ใน 3 ตัว → ดันเข้าตำแหน่งแรก ตัดตัวสุดท้ายออก
- **เมนูภาษา (เว็บ)**: popover ใต้แท็บ, `paper`, radius `container`, `shadow-popover`, grid 3 คอลัมน์, ตัวที่เลือกมี `Check`; เข้า: opacity 0→1 + scale .96→1 (`standard` 200ms), ออก 150ms; ปิดด้วย Esc/คลิกนอก
- **การ์ดต้นทาง**: `paper` + ขอบ `line` 1px + radius `container`, min-height 220; ข้อความ `source-md` (22px); ปุ่ม `X` มุมขวาบนเมื่อมีข้อความ (fade 125ms); แถวล่าง: ตัวนับ + ปุ่ม "แปล"
- **การ์ดผลแปล**: พื้น `shell`, radius `container`, padding 16; empty = "คำแปลแต่ละบริบทจะแสดงที่นี่" `source-md` สี `disabled` (แบบ placeholder "คำแปล" ของ Google); การ์ดบริบทด้านในพื้น `paper` (ใช้ animation กางเดิม)
- ทั้งหน้า scroll เป็นหน้าเดียว (ไม่มี scroll ซ้อน)

## 6. Android / มือถือแนวตั้ง (width < 768)

```
┌──────────────────────────────┐
│ [mark] tranzlator       (⚙•) │  header 56
│                              │
│ แปลข้อความ                    │  placeholder 28px สี disabled
│                              │
│ ( [Clipboard] วาง )          │  chip ปรากฏเมื่อช่องว่าง
│                              │
│ ┌ suggestion (ถ้าไม่มี key) ─┐ │
│ └───────────────────────────┘ │
│ ── ผลแปล (การ์ดบริบท) ──       │
│ ...                           │
├──────────────────────────────┤  แถบล่าง (paper, ขอบบน line)
│ [ตรวจหาภาษา]  ⇢  [อังกฤษ  v] │  pill สูง 48, พื้น chip, r16
│ [            แปล           ]  │  pill graphite สูง 52 เต็มกว้าง
└──────────────────────────────┘
```

- **ช่องพิมพ์**: ไม่มีกรอบ, ขนาดตัวอักษรตามความยาว `sourceSize(len)`: ≤ 40 → `source-lg`, ≤ 160 → `source-md`, อื่น → `source-sm`; placeholder "แปลข้อความ"
- **ปุ่ม "วาง"**: chip ทรง pill พื้น `chip`, ไอคอน `ClipboardPaste` + "วาง", แสดงเฉพาะตอนช่องว่าง, อ่านจาก `expo-clipboard` (ตัดเหลือ 2000)
- **แถบล่าง** ติดขอบล่าง เหนือคีย์บอร์ดเสมอ (แบบรูป 58475), เคารพ safe-area ล่าง
  - pill ต้นทาง "ตรวจหาภาษา" (หลังแปล: "ไทย") — กดไม่ได้ (`muted`)
  - ไอคอน `ArrowRight` ระหว่าง pill (ไม่ใช่ swap เพราะต้นทางเป็นอัตโนมัติ)
  - pill ปลายทาง: ชื่อภาษา + `ChevronDown` → เปิด **หน้าเลือกภาษาเต็มจอ**
- **หน้าเลือกภาษา (มือถือ)** แบบรูป 58476 แต่โทนสว่าง: เลื่อนขึ้นจากล่าง (`standard` 300ms, ออก 200ms); ปุ่ม `ArrowLeft` ปิด; หัวข้อ "แปลเป็นภาษา" 28px; หัวข้อย่อย "ภาษาที่ใช้ล่าสุด" / "ภาษาทั้งหมด" (`note`, `muted`, ไม่ใช้ตัวพิมพ์ใหญ่); แถวสูง 56; แถวที่เลือก = พื้น `chip` ทรง pill + `Check`; ปุ่ม back ของ Android ปิดหน้านี้
- หลังแปล: ช่องพิมพ์ย่อเป็น `source-sm` และผลแปลเลื่อนเข้าจอ (scroll ไปที่การ์ดแรก)
- **แนวนอน (Android, width ≥ 768)**: ใช้ layout เว็บ แต่ถ้า height < 500 = compact: header 48, padding 12, การ์ดต้นทาง min-height 140, ข้อความ `source-sm`

## 7. Motion ของปุ่มและองค์ประกอบ

ใช้ component เดียว `PressableScale` (Reanimated) กับทุกปุ่ม/แถวที่กดได้:
- กด: scale 1 → 0.97 + opacity 1 → 0.85, ปล่อย: กลับ — `standard` 125ms
- hover (เว็บ, `(hover: hover)`): พื้นเปลี่ยนเป็นโทนถัดไป (`paper`→`chip`, `graphite`→`ink`) 125ms
- disabled: opacity .4, ไม่มี animation
- focus ring เดิม (2px ink offset 2)

อื่นๆ:
- **ปุ่ม "แปล" ตอนโหลด**: ความกว้างคงที่, ข้อความ cross-fade เป็นจุด 3 จุดกระพริบ (opacity .25↔1, scale .6↔1, รอบ 1200ms, เหลื่อม 160ms — แบบ ai-dots ของ fastwork)
- **คัดลอก**: ไอคอน `Copy` → `Check` แบบ scale .6→1 + fade (125ms) ค้าง 1.5s แล้วกลับ
- **Settings sheet**: เข้า = opacity 0→1 + translateY 16→0 + scale .95→1 (`standard` 300ms); ออก 200ms (ปัจจุบันไม่มี — ต้องเพิ่ม); backdrop `ink` 40% fade
- **แท็บภาษา**: เส้นใต้เลื่อน (ข้อ 5)
- `useReducedMotion()`: ทุกอย่างเหลือ fade 125ms, จุดโหลดไม่กระพริบ (แสดงค้าง)

## 8. แจ้งเตือน (Toast) + Error

**Toast** (`src/ui/Toast.tsx` + `ToastProvider` / `useToast()`):
- กลางล่าง, ห่างขอบล่าง 24 (มือถือ: เหนือแถบล่าง 12), กว้างสุด 480, พื้น `graphite`, ตัวอักษร `paper` `body`, radius `container`, `shadow-popover`, padding 12×16
- ไอคอนนำหน้า 18px: success `CircleCheck`, error `CircleAlert`, info `Info` (สี `paper` ทั้งหมด — โมโนโครม)
- action ตัวเลือก (เช่น "ลองอีกครั้ง", "ตั้งค่า") เป็นข้อความ `font-sans-semibold` ชิดขวา + ปุ่ม `X` ปิด
- เข้า: translateY 16→0 + opacity (`standard` 300ms); ออก 200ms; แสดงทีละอัน (อันใหม่แทนอันเก่า)
- เวลาแสดง: success 4000ms, error/มี action 6000ms; hover (เว็บ) หยุดนับ
- a11y: success/info `accessibilityLiveRegion="polite"`, error `accessibilityRole="alert"`

| เหตุการณ์ | แสดงแบบ | ข้อความ | action |
|---|---|---|---|
| บันทึกตั้งค่า | toast success | บันทึกแล้ว | — |
| คัดลอก | toast success + ไอคอนการ์ดเปลี่ยน | คัดลอกแล้ว | — |
| กดแปลตอนไม่มี key | toast info | ใส่ API key ในการตั้งค่าก่อนแปล | ตั้งค่า |
| เพิ่มบริบทล้มเหลว (ปัจจุบัน error ถูกกลืน — ต้องแก้) | toast error | ข้อความจาก API | ลองอีกครั้ง |
| วางแล้ว clipboard ว่าง | toast info | ไม่มีข้อความในคลิปบอร์ด | — |
| แปลล้มเหลว (401/429/502/network) | **inline** ในการ์ดผลแปล | ข้อความจาก API | ลองอีกครั้ง (+ "ตั้งค่า" เมื่อ 401) |

**Inline error** (ในการ์ดผลแปล): ไอคอน `CircleAlert` สี `danger` 20px + ข้อความ `body` `ink` + ปุ่มข้อความ "ลองอีกครั้ง" (ขีดเส้นใต้เมื่อ hover); fade + เลื่อนขึ้น 8px

**ตัวนับตัวอักษร**: เกิน 2000 → ตัวเลขสี `danger` + "ยาวเกิน 2000 ตัวอักษร" และปุ่มแปล disabled

## 9. ข้อความ UI ใหม่

| ที่ | ข้อความ |
|---|---|
| placeholder มือถือ | แปลข้อความ |
| placeholder เว็บ | พิมพ์ข้อความที่ต้องการแปล |
| ปุ่มวาง | วาง |
| แท็บต้นทาง | ตรวจหาภาษา / ตรวจพบ: {ภาษา} |
| หน้าเลือกภาษา | แปลเป็นภาษา / ภาษาที่ใช้ล่าสุด / ภาษาทั้งหมด |
| suggestion | ใส่ API key ของคุณเพื่อเริ่มแปล / เลือกผู้ให้บริการและใส่ key ในการตั้งค่า |
| เกินความยาว | ยาวเกิน 2000 ตัวอักษร |

## 10. ไม่ทำ

ธีมมืด, เสียงอ่าน, ไมค์/กล้อง, ประวัติ, ปุ่มสลับภาษา (ต้นทางเป็นอัตโนมัติ), เปลี่ยน API/worker
