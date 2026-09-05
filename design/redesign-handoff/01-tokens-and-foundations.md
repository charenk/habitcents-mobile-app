# 01 · Tokens and foundations

## 1. Colors — replace `constants/theme.ts` lightTheme values
```ts
// brand
primary:        '#4CAF82'  // sage — CTA, kept number, active tab, skip confirm ONLY
primaryDark:    '#2E7D55'  // hover/pressed, small sage text links
primaryLight:   '#E8F5EE'  // kept band, selected chips, coach slots, tinted cards
// neutrals (carry ~90% of UI)
ink:            '#1A1D23'  // primary text
slate:          '#4A5568'  // secondary text
mist:           '#8898AA'  // tertiary text, placeholder, spend bars fill
cloud:          '#E8EDF2'  // hairline borders, slip dot fill, disabled fill
snow:           '#F7F9FC'  // page background (never pure white pages)
white:          '#FFFFFF'  // cards, sheets, tab bar
hairlineSubtle: '#F1F4F8'  // row separators inside cards
// semantic
lavender:       '#8E7CF3'  // habit arc, chapter pills, milestones, premium
amber:          '#F5A623'  // upcoming bills, 3-payment flags (bg rgba(245,166,35,.14), text #B26A00)
coral:          '#F05A5A'  // destructive only (delete, stop breaking, undo import)
// category colors (12% alpha tile behind emoji)
food:'#FF6B6B' groceries:'#FF9F43' transport:'#4A90D9' housing:'#8E7CF3'
entertainment:'#F5A623' shopping:'#EC4899' subscriptions:'#06B6D4' health:'#34C39A'
```
Rules: spend bars are ALWAYS mist-on-snow (spend is not a win). No gradients anywhere except `linear-gradient(135deg,#8E7CF3,#4CAF82)` on the premium upsell card. Dark theme: out of scope for this pass; keep the existing dark palette wired but do not restyle it.

## 2. Typography
- **Display: Instrument Serif** (expo-google-fonts `InstrumentSerif_400Regular`). Used for: screen titles ("Today.", "Money.", "Insights.", habit names ending with a period), ALL hero/stat currency numbers, keypad amount display, reveal number. Never for body/buttons.
- **UI: Inter** (`Inter_400Regular/500/600/700`). Everything else.
- Numbers: `fontVariant: ['tabular-nums']` on every currency/count.
- Scale: screen title 34–36 serif · kept hero 40–44 serif · stat cards 20–24 serif · reveal 64 serif · body 14–15 · secondary 13 slate · caption 12–12.5 mist · eyebrow 11/600/uppercase/letterSpacing 0.88 (`.08em`) mist or sage-dark — the ONLY all-caps.

## 3. Icons
Replace Ionicons with **lucide-react-native**, 1.5px stroke, sizes 14/16/18/20/22 only. Mapping: tabs sun/wallet/trending-up · settings-2 (gear) · chevron-right/left · arrow-left (back) · check · minus (slip) · plus · repeat · store · sprout (brand/coach) · timer, pie-chart (value props) · file-text (csv chips) · rotate-ccw (reset). Category identifiers are EMOJI in tinted tiles (see §5), not icons.

## 4. Shape, depth, motion
- Radius: buttons/inputs/keypad keys 10 · list cards & chips 14 · feature cards & sheets 20 · phone-frame-level 28. Pills 999.
- Borders: 1px cloud on all cards (`#E8EDF2`); inner row separators `#F1F4F8`.
- Shadows (ink-based, soft): cards at rest none-or-`0 4px 8px rgba(26,29,35,.04)`; sheets `0 -8px 32px rgba(26,29,35,.16)`; toast `0 8px 24px rgba(26,29,35,.3)`. No pure-black shadows.
- Motion: 120ms tap feedback, 220ms sheets/toasts, 360ms screen transitions; easing `cubic-bezier(0.22,1,0.36,1)`; entrances = 8–12px translateY + fade. ONE playful motion allowed: 1→1.04→1 scale pulse (280ms) on skip confirmation. No confetti, no bounce. Respect reduced-motion: swap to opacity-only.

## 5. Core primitives (new shared components)
**EmojiTile** — emoji centered in a square tile, `borderRadius:10–14`, bg = category color at 12% alpha (`rgba(255,107,107,.12)` for food). Sizes 36 (rows), 40 (cards), 44–48 (pickers). Emoji never floats outside a tile.

**AmountDisplay** — the shared amount-first input look: `$` prefix (mist, ~60% of number size) + serif tabular number over a 1.5px bottom underline; underline cloud at rest, sage when focused/active. Used by: quick log, log sheet, edit expense, partial slip, skip-value edit, pick-one, add-upcoming.

**Keypad** — 4×3 grid (1-9, ., 0, ⌫), keys min-height 44–52, radius 10–12, bg snow, border cloud, 17–20px/600 ink. Logic: one decimal point max, 2 decimals max, 6 digits max.

**Toast (NEW component — shipped app has none)**
- Dark ink pill: bg `#1A1D23`, white text 13.5/600, radius 12, padding 12×18, centered horizontally, bottom-anchored at `tabBarHeight + inset + lift + 24` (Toast.tsx; `lift` is Today's dock height via useToastLift, 0 elsewhere, ADR 0038), shadow above.
- Enter: 220ms translateY(8)→0 + fade, ease-out. Auto-dismiss 2.5s. New toast replaces current.
- Optional action link (e.g. "Undo"): color `#7FD4A8`, 700 weight, right of message with 14 gap.
- Every mutating action fires one: "Logged." · "Saved." · "Deleted." + Undo · "Restored." · "Added to upcoming." · "+$6.50 kept. 4 of 5 days this week." · "Yesterday counted. +$6.50 kept." · "Stopped. Your history is kept." · "Trial started. 14 days free." · "Signed out. Your data stays on this device." · "Prototype reset." (dev only)
- Implement as context/provider (`ToastProvider` + `useToast()`), rendered above the tab navigator.

**Buttons** — primary: sage bg, white 15–16/600, min-height 48–52, radius 10; pressed = sage-dark (no scale). Secondary: white bg, cloud border, ink text. Tertiary: bare slate 14/600 text, min-height 44. TertiaryBrand: bare sage 14/600 text, min-height 44, empty-state CTAs only (ADR 0038). Destructive: coral text (bare) or coral bg in confirm sheets. Disabled: cloud bg, white text.

**Sheets** — bottom sheets (not pageSheet modals): white, radius 20 top corners, grab handle 36×5 cloud, scrim `rgba(26,29,35,.4)`, slide-up 220ms.
