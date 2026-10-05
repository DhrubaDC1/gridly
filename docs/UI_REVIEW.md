# Gridly UI review

Date: 2026-10-02. Evidence: 27 Android screenshots (`docs/ui-audit/`, Expo Go, 1264×2736 @ 476dpi, about 425×920 dp), plus a read of every file in `app/`, `src/ui/`, `src/ui/components/`. Expo Go's floating gear is ignored. **iOS was not captured. Everything iOS-specific below is inferred from code and marked _(iOS unverified)_.**

## 0. The five things that matter most

1. **Pause and Game Over overlays are broken at the root, not just visually.** `PauseMenu.js:89` and `GameOver.js:386` spread `StyleSheet.absoluteFillObject`. In React Native 0.88 that export no longer exists. `node_modules/react-native/Libraries/StyleSheet/StyleSheetExports.js` exports only `absoluteFill`. Spreading `undefined` adds nothing, so the "overlay" is laid out as an ordinary flex child of `GameScreen`'s `space-between` column. That is why the board jumps up, the scrim is a narrow rectangle, the sheet falls off the bottom, and the tray is not dimmed (screenshots 25 and 26). Game Over uses the identical style, so **the Game Over screen is almost certainly broken the same way** (not captured).
2. **The palette is too dusty and too flat to sell the game.** Empty cells sit at 1.12:1 against the well (light) and 1.22:1 (dark), so the eye reads 64 grey tiles, not an empty board. Blocks are low-chroma (Sage on well is 2.15:1, Heather on an empty cell is 2.25:1). Next to Block Blast-style store screenshots, Gridly reads as a washed-out settings app. "Clean minimal" is not the problem. **Low chroma and no depth are.**
3. **Dark mode primary buttons fail contrast badly:** white text on `#8FA7E0` is **2.39:1** (Home "Play Classic", Resume, Play again, Next level). Light `inkMuted` on `bg` is **4.18:1**, which fails AA for the 14pt "best 3,143". `Segmented` already works around this; the rest of the app needs an `onAccent` token.
4. **There is no iconography and no brand.** The app ships the default Expo icon (`assets/icon.png` is the Expo "A" on a blueprint grid). Home is seven text pills with no game imagery. The pause button is the `⏸` character, which Android renders as an **orange color emoji** (that is the "orange pause" bug). Back buttons are text glyphs (`‹` vs native `←`).
5. **The board has no signature moment yet.** The clear wave is correct but invisible as a brand asset: cells shrink and fade with no light, no ring, and no score popup. The ghost preview is also missing the line-clear highlight that AGENTS §10 requires. The fix is "Glaze" (§3): glazed ceramic tiles, debossed sockets, and a **glint wave** that sweeps light outward from where you played.

---

## 1. Evidence and coverage

Captured (light and dark unless noted): Home, Classic (resumed), Blitz (new), Adventure map, Adventure L1, Adventure L15, Settings, Stats, Achievements, Leaderboards (placeholder), Profile (placeholder), Classic mid-game, Pause, tray refill (dark only).

**Missing. Not judged from pixels, only from code:**
- Game Over (Classic, Blitz `timeUp`), the Adventure result card (complete and failed)
- Clear wave mid-animation, Perfect Clear pulse, combo label, score ticker mid-count
- Drag states: lift, ghost, invalid spring-back; hold slot holding a piece, and swap
- Gem and lock cells (hp 2 and hp 1)
- Blitz low-time and Blitz pause
- Achievement toast; onboarding board and hand hint
- Colorblind glyphs; Reduce Motion on; Theme forced to Light/Dark
- Achievements and Adventure map scrolled to the bottom
- Small screen (iPhone SE size) and **all of iOS**

Capture these after the P0 fixes land, especially Game Over.

---

## 2. Bugs (fix first)

| # | Bug | Root cause | Fix |
|---|---|---|---|
| B1 | Pause sheet cut off, narrow scrim, board shifts, tray not dimmed (25, 26) | `...StyleSheet.absoluteFillObject` is `undefined` on RN 0.88, so the overlay is a flex child | Render `PauseMenu` and `GameOver` inside RN `<Modal transparent animationType="none" statusBarTranslucent navigationBarTranslucent>`. This covers the native header and tray too. Use `StyleSheet.absoluteFill` for the scrim. No new dependency. |
| B2 | Game Over overlay (predicted, same bug) | Same style in `GameOver.js:386` | Same as B1 |
| B3 | 1×5 / 5×1 piece overflows its tray card (27, 12) | `TraySlot`/`HoldSlot` hard-code rest scale 0.55. 5 cells × 44.5 + gaps = 234.5 dp × 0.55 = 129 dp, but the slot is 90×96 dp | Per-piece rest scale `min(0.55, (slotW − 16) / pieceW, (slotH − 16) / pieceH)`. Replace every `0.55` literal in both files with it. Lift still goes to 1.0. This needs a one-line AGENTS §9 amendment ("55%, or less if the piece would not fit its slot"). |
| B4 | Pause button is orange | `GameScreen.js:335` renders `⏸` (U+23F8). Android draws it as a color emoji and ignores `color`. _(iOS unverified, also likely emoji)_ | Draw it as a Skia icon (two 3×12 rounded bars) in `theme.ink`. See the icon system in §5.6. |
| B5 | `‹` back on Stats and Achievements, `←` elsewhere | Custom `headerLeft` text glyph in `app/stats.js:91`, `app/achievements.js:35` | One `BackButton` (Skia arrow-left icon, 44×44, same `canGoBack` fallback) set globally in `app/_layout.js` `screenOptions.headerLeft`. Delete the per-screen copies. |
| B6 | A deep link opens a locked level (11, 12) | `app/adventure/[level].js` has no guard | `const unlocked = useProgress(s => s.adventure?.unlocked ?? 1)`. If the id is not in `levels.json` or `> unlocked`, return `<Redirect href="/adventure" />`. **Wait for persist hydration** (`useProgress.persist.hasHydrated()` plus `onFinishHydration`) and render `null` until then, or a cold deep link will redirect before the save loads. |
| B7 | White on accent in dark: 2.39:1 | Hard-coded `#FFFFFF` in `app/index.js:214`, `PauseMenu.js:123`, `GameOver.js:443` | New `onAccent` token (§5.1): light `#FFFFFF` (6.57:1), dark `#0E1218` (8.22:1) |
| B8 | Hold slot has a drop shadow in light mode only (03, 05) | `elevation: 1` on the slot wrapper's idle state (`HoldSlot.js:289`) draws an Android shadow | `elevation: isDragging ? 9999 : 0` in both `HoldSlot` and `TraySlot` |
| B9 | Ghost preview has no line-clear highlight | Not implemented. AGENTS §10 requires it | Task T14 (UI-thread bitmask, no React state per frame) |
| B10 | Leaderboards and Profile say "arriving in Phase 4" | Dev language in user-facing copy | "Coming soon" chip plus one inviting line (§4) |
| B11 | Header titles left-aligned on Adventure, Settings, Leaderboards, Profile, centered on game, Stats, Achievements | Android default `headerTitleAlign: 'left'`, overridden only on some screens | Set `headerTitleAlign: 'center'` once in `_layout.js` `screenOptions` |

---

## 3. Critique, screen by screen

### Home (01, 02)
- **Hierarchy:** one strong button, then six equal-weight pills. Leaderboards, Achievements, Stats, Settings, and Profile are the same size as Blitz and Adventure, so everything feels like a menu with nothing to want.
- **No game on the home screen of a game.** No blocks, no board, no "continue your 12,480 run". The first impression is a form.
- **Copy:** "Endless relaxing puzzle" and "90 seconds fast clears" are generic and lack articles. Mode cards show no personal data (best score, current level, stars).
- **Dark:** "Play Classic" is white on lilac at 2.39:1 (B7). The pastel periwinkle slab is the most saturated thing in the app and looks like a disabled state.
- **Space:** the bottom 35% of the screen is empty on a 920 dp phone, while the content is crammed at the top.
- **Typography:** sizes 13, 15, and 18 are all off the §9 scale.

### Game: Classic and Blitz (03–06, 23, 24, 27)
- **Top bar:** a native stack header with an orange emoji (B4). The title is plain Figtree 16; fine but anonymous.
- **Vertical rhythm:** `space-between` creates a dead band of about 200 dp between "best" and the board (03: y≈430→635 of 2000). It looks accidental, not airy.
- **Score:** Unbounded 56 is the right call, but "best 3,143" is 4.18:1 in light (fails AA at 14pt) and lowercase with no visual tie to the score.
- **Board:** the well and the empty cells are nearly the same value (1.12:1 / 1.22:1), so the grid of 64 grey tiles is the loudest thing on the board. Empty cells should *recede* (sockets); they currently read as *objects*. The bevel spec (1px highlight plus 2px darker edge) is implemented but too small to read at phone distance. Blocks look like flat stickers.
- **Block colors:** Harbor, Sage, Heather, and Lagoon are all mid-value and low-chroma, and Heather and Sage go muddy in light. Ochre is the only color with life. In dark mode the lifted colors look pastel and chalky.
- **Tray:** white cards (light) and slate cards (dark) behind the pieces are as bright as the board, so they compete with it. Empty tray cards after placement (23) are big blank white boxes. The 1×5 overflows (B3). Pieces are not vertically centered consistently (the T-shape in 05 sits top-heavy).
- **Hold:** the dashed box with "Hold" inside works, but it is the only element with a shadow (B8) and it reads as a disabled button.
- **Blitz:** the timer is a 4 dp hairline under the header, detached from the score, with "85s" in muted text. In a 90-second mode the clock should be the second-loudest element. There is no low-time state.

### Adventure map (07, 08)
- The title is duplicated: native header "Adventure" (left-aligned) plus an in-page Unbounded "Adventure".
- It is a 4×13 grid of identical squares, a spreadsheet, not a journey. Locked levels at 35% opacity leave stars invisible and numbers at roughly 1.5:1. Completed and current look almost the same: only a 2 dp outline marks "you are here". No chapters, though the progression in AGENTS §6 has clear acts (basics, locks, mixed).
- The `★` text glyph is used for stars. It renders differently per font _(iOS unverified)_.

### Adventure level (09–12)
- Goal chips are a good idea, but "Reach 1097" gives no progress and no thousands separator. "34 moves" is styled as muted, the same as a hint, though it is a resource. The red at ≤3 is a hard-coded `#E05D5D` (not a token, contrast not checked).
- Level 15 tray: two vertical 1×5s overflow upward out of their cards (B3).
- The score of 0 at 56pt dominates a level whose goal is not the score. When the goal is lines or gems, the goal should be the hero.

### Settings (13, 14)
- The card is vertically centered (`justifyContent: 'center'`), leaving a 150 dp hole under the header. The title is duplicated (header plus in-card).
- No grouping (Feedback / Display / Accessibility), no icons, no descriptions ("Colorblind mode" never says what it does). The `Switch` off-state thumb in dark is grey on grey.
- "Unlock all levels" sits in the main card. It is `__DEV__`-only, which is fine, but put it under a "Developer" heading so screenshots never confuse it with a feature.

### Stats (15, 16)
- Ten identical tiles, no hierarchy. Classic best and Blitz best deserve hero treatment; "Current day streak: 1" does not deserve the same weight.
- "Average Classic score —" next to "Games played 4" reads as broken. Show "Finish a Classic game" in muted text instead of an em dash.
- The title is duplicated (header plus in-page) and the back glyph is `‹` (B5).

### Achievements (17, 18)
- No badges or icons. Unlocked shows a `✓` text glyph, and locked is the whole card at 45% opacity, which drops description text well below AA. Locked achievements are goals; they should look aspirational, not disabled.
- There is no per-achievement progress ("32 / 50 holds"), so nothing pulls the player back.

### Leaderboards and Profile (19–22)
- A card vertically centered in a void, with "Phase 4" dev copy (B10). The duplicated title again.

### Pause (25, 26)
- Broken (B1). Even when fixed: the board drops to 0.08 opacity while the tray stays fully visible (in Blitz you can still plan with the tray). "Quit to home" is a third full-width row; it should be a quiet text button.

### Game Over and Adventure result (not captured)
- From code: the same broken overlay (B2). White on accent in dark (B7). No staging: the card appears 250 ms after the last move with no "board settles to grey" beat, so losing feels abrupt. The highlight line is good per spec. "New best" is plain 14pt accent text, and the best moment in the game gets the smallest type on the card.

---

## 4. Cross-cutting issues

- **Palette.** Six desaturated mid-tones on a cool grey fog. Everything sits in a narrow value band (L* about 45–65), so nothing pops and colorblind users lose even more. The block colors are tasteful in a swatch and dull on a board. **Challenge to AGENTS §9:** "calm" does not require low chroma. Calm comes from *fewer competing elements*, generous space, and soft motion. Keep the restraint in layout and raise the chroma of the blocks.
- **Board and blocks.** Flat fill plus a 1px line plus a 2px edge is invisible at arm's length. No depth separates well, socket, and tile. The board should read as three layers: a **recessed well**, **debossed sockets** that recede, and **raised glazed tiles** that catch light.
- **Typefaces.** Unbounded is a great, ownable choice, and it is currently used well only for the score. Page titles mix 24 and 28 (24 is off-scale), and nav and buttons use 13/15/18 (off-scale). Unbounded's wide 700 at 56 with `letterSpacing: -1` is heavy; `-0.5` keeps the digits from kissing. Verify `fontVariant: ['tabular-nums']` actually applies to Unbounded (the Google Fonts build may lack `tnum`). If digits jitter during the count-up, render fixed-width digit cells.
- **Iconography.** None. Text glyphs (`⏸ ‹ ★ ✓`) render inconsistently per platform and font. The fix (§5.6) is a Skia icon component with no new dependency.
- **Buttons and cards.** One radius (14) and one surface color for everything: mode cards, nav pills, tray cards, stat tiles, achievement rows. Nothing says "tap me" versus "read me". Pressed feedback is an opacity change only.
- **Backgrounds.** Flat `bg` everywhere. The "quiet table" brief begs for a soft pool of light behind the board.
- **Light versus dark.** Dark is the better of the two today (blocks pop more), but its accent is pastel and fails with white text. **Store screenshots should be dark** for this genre.
- **Overlays use opacity hacks** (board at 0.08) instead of a real scrim layer.
- **Hard-coded colors outside the theme:** `#E05D5D`, `#FFFFFF` (×6), lock ink `#E7EAF0`/`#1D2433` in `Cell.js:172`, and the HandHint white. All of these should become tokens.
- **First impression and store screenshot.** Today a store thumbnail shows a pale grey grid, an orange emoji, and white boxes. Compared with competitors it reads as unfinished, not as minimal.
- _(iOS unverified)_: `Switch`, the native header, and shadow rendering (`ComboLabel`/`Toast` `shadow*` props draw on iOS only), emoji glyphs, and safe-area spacing under the Dynamic Island all need a pass on a real iPhone or the simulator.

---

## 5. Three directions

### A. Glaze _(recommended)_
**Concept.** Gridly's blocks are glazed ceramic tiles set into a stone tray on a quiet, warm table. Everything around the board stays hushed; the tiles are rich, glossy, and catch the light, and every clear sends a glint of light rippling out from your move.

| token | Light | Dark |
|---|---|---|
| bg | `#F4F1EC` porcelain | `#0E1218` night slate |
| surface | `#FFFFFF` | `#171C25` |
| well | `#CFC6B6` stone | `#0A0D12` |
| cellEmpty | `#DCD5C8` | `#1A1F29` |
| ink / inkMuted | `#1B1F2A` / `#5C6372` | `#ECEFF5` / `#97A1B4` |
| accent / onAccent | `#3751C8` / `#FFFFFF` | `#3751C8` / `#FFFFFF` (text/outlines use `accentInk` `#8797DE`) |

Glazes: Cobalt `#3D6FE0`, Jade `#2FA87A`, Persimmon `#F06A4D`, Saffron `#F2B33D`, Iris `#8B6CF0`, Lagoon `#1FB0C2`. Dark lifts are in §6.1.
- **Type:** Unbounded 700 for the score and wordmark, 600 for titles, mode names, and big numbers. Figtree for everything else.
- **Board:** recessed stone well with an inner shadow, debossed sockets, raised tiles with a top-to-base gradient, a sheen band, and one tiny specular glint.
- **Mood:** Monument Valley calm meets a well-made mahjong set. Tactile and premium.
- **Risks:** more saturated colors can tip toward toy-like if the UI around the board is not kept muted. Gradients cost a little draw time (mitigated in §6.2). The warm light theme is a departure from the current cool fog.

### B. Night arcade
**Concept.** A deep-navy stage where jewel-bright blocks glow, built to beat Block Blast at its own game. Clears bloom with light and the combo meter burns hotter as you chain.

| token | Light | Dark |
|---|---|---|
| bg | `#EEF0FF` | `#0B0F2A` |
| surface | `#FFFFFF` | `#151A3D` |
| well | `#1A1F4A` (dark board in both themes) | `#070A1F` |
| cellEmpty | `#232A5C` | `#1A2050` |
| ink / inkMuted | `#12153A` / `#545C8C` | `#F2F4FF` / `#9AA3D6` |
| accent | `#5B3DF5` | `#FFD23F` |

Blocks: `#FF4D6D #FFB627 #3DDC97 #2EC4F1 #7B61FF #FF7AE0`.
- **Type:** Unbounded everywhere large, with glow text shadows on the score.
- **Board:** inner glow on blocks, an additive bloom on clear, and a neon outline ghost.
- **Mood:** loud, energetic, competitive.
- **Risks:** this is the genre's default look, so Gridly becomes another clone. It contradicts "calm, precise". Bloom and blur are the most expensive things to draw in Skia on mid-range Android. A light theme is barely meaningful.

### C. Paper cut
**Concept.** Bold, flat risograph colors with 2 px ink outlines and hard offset shadows, like cut-paper tiles on a desk. Playful, graphic, and instantly recognizable in a thumbnail.

| token | Light | Dark |
|---|---|---|
| bg | `#F6F0E4` paper | `#1C1A17` |
| surface | `#FFFDF8` | `#262320` |
| well | `#EDE4D2` | `#141210` |
| cellEmpty | `#E3D8C3` | `#2E2A25` |
| ink / inkMuted | `#1E1A16` / `#6A6054` | `#F4EEE2` / `#ABA192` |
| accent | `#E2482F` | `#FF6A4D` |

Blocks: `#E2482F #F4B400 #2F6FEB #1F9D6B #8A4FFF #FF8FB1`, with a 2 px `ink` outline and a 3 px hard offset shadow.
- **Type:** Unbounded 700 at large sizes with tight tracking, plus Figtree 600 labels.
- **Board:** flat tiles, thick outlines, and stepped "stamp" animations.
- **Mood:** indie, witty, poster-like.
- **Risks:** trend-dated (neo-brutalism). Thick outlines eat cell area at 44 dp. It fights the calm brief, and the hard shadows look wrong in dark mode.

### Recommendation: A, Glaze
It is the only direction that keeps AGENTS' "calm, precise, tactile" *and* fixes why the app looks bland. B wins on loudness but loses identity. C is distinctive but off-brief and trendy. Glaze makes the board the hero by giving it **material** (tiles, stone, light), not by adding chrome. The "clean minimal" rule should stay for *layout* (few elements, generous space, one accent) and be **dropped for the tiles themselves**, which should be the richest-rendered object on screen.

---

## 6. Implementation plan (Glaze)

### 6.1 `src/ui/theme.js`: complete tokens

```js
export const lightColors = {
  bg: '#F4F1EC',          // porcelain
  bgDeep: '#EAE5DC',      // bottom of background gradient
  spotlight: '#FBF9F5',   // radial light pool behind board
  surface: '#FFFFFF',     // cards, sheets
  surfaceSunken: '#E9E4DB', // tray sockets, chips, segmented track
  line: '#E0D9CD',        // hairlines
  well: '#CFC6B6',        // board tray (stone)
  wellShadow: 'rgba(60,45,25,0.22)',
  cellEmpty: '#DCD5C8',   // socket
  socketTop: '#C9C0B0',   // 1px inner top (deboss)
  socketBottom: '#E8E2D7',// 1px inner bottom lip
  ink: '#1B1F2A',         // 14.6:1 on bg
  inkMuted: '#5C6372',    // 5.35:1 on bg, 6.03 on surface, 4.76 on surfaceSunken
  accent: '#2E52CC',      // 5.83:1 on bg
  onAccent: '#FFFFFF',    // 6.57:1 on accent
  accentSoft: '#DCE3F8',
  danger: '#C8372D',      // 4.61:1 on bg
  success: '#1E8A5F',
  star: '#F2B33D',
  starEmpty: '#D6CFC2',
  scrim: 'rgba(14,18,24,0.55)',
};

export const darkColors = {
  bg: '#0E1218',
  bgDeep: '#0A0D12',
  spotlight: '#161C26',
  surface: '#171C25',
  surfaceSunken: '#12161D',
  line: '#232A36',
  well: '#0A0D12',
  wellShadow: 'rgba(0,0,0,0.5)',
  cellEmpty: '#1A1F29',
  socketTop: '#12161D',
  socketBottom: '#222834',
  ink: '#ECEFF5',         // 16.3:1
  inkMuted: '#97A1B4',    // 7.22:1 on bg, 6.57 on surface
  accent: '#8EA8FF',      // 8.22:1 on bg
  onAccent: '#0E1218',    // 8.22:1 on accent
  accentSoft: '#1E2740',
  danger: '#FF7A6E',      // 7.39:1
  success: '#4CD39A',
  star: '#FFC452',
  starEmpty: '#2A303C',
  scrim: 'rgba(0,0,0,0.6)',
};

// base / top (gradient start) / edge (bottom bevel, >=3:1 vs light cellEmpty) / glyph ink
export const glazes = [
  { name: 'Cobalt',    glyph: 'dot',      light: { base: '#3D6FE0', top: '#5A88F0', edge: '#2448A8' }, dark: { base: '#5B8AF0', top: '#7BA3FF', edge: '#3360C8' }, glyphInk: 'rgba(255,255,255,0.55)' },
  { name: 'Jade',      glyph: 'ring',     light: { base: '#2FA87A', top: '#4DC294', edge: '#1B7655' }, dark: { base: '#3DC08E', top: '#5FD7A6', edge: '#23885F' }, glyphInk: 'rgba(14,18,24,0.45)' },
  { name: 'Persimmon', glyph: 'bar',      light: { base: '#F06A4D', top: '#FF8A6E', edge: '#B4402A' }, dark: { base: '#FF7D5E', top: '#FF9C82', edge: '#C24A31' }, glyphInk: 'rgba(255,255,255,0.55)' },
  { name: 'Saffron',   glyph: 'cross',    light: { base: '#F2B33D', top: '#FFCB62', edge: '#96660F' }, dark: { base: '#FFC452', top: '#FFD67E', edge: '#B07A1C' }, glyphInk: 'rgba(14,18,24,0.45)' },
  { name: 'Iris',      glyph: 'triangle', light: { base: '#8B6CF0', top: '#A48BFA', edge: '#5A40C0' }, dark: { base: '#A08AF7', top: '#B8A6FF', edge: '#6B50D6' }, glyphInk: 'rgba(255,255,255,0.55)' },
  { name: 'Lagoon',    glyph: 'diamond',  light: { base: '#1FB0C2', top: '#45C8D7', edge: '#137F8D' }, dark: { base: '#33C4D6', top: '#5FD8E6', edge: '#188F9E' }, glyphInk: 'rgba(14,18,24,0.45)' },
];
export const glazeFx = { sheenFrom: 'rgba(255,255,255,0.22)', sheenTo: 'rgba(255,255,255,0)', glint: 'rgba(255,255,255,0.55)', flash: '#FFFFFF' };
```

- `resolveTheme` keeps exposing `blocks` (= `glazes.map(g => g[scheme].base)`) for backward compatibility, and adds `glaze` (= the per-scheme objects), `onAccent`, and the new tokens.
- Radius: board 20, cells `s × 0.16` (≈7 at 44 dp), buttons 14, cards 18, sheets 24, chips 999.
- Type scale is unchanged (12/14/16/20/28/40/56); snap every off-scale size to it.
- Saffron's edge is darkened from a naive −25% to `#96660F` so the tile outline stays at or above 3:1 against light sockets (WCAG 1.4.11 for UI shapes). The colorblind glyph ink switches to dark on the three light glazes, because white glyphs on Saffron are 1.86:1. **This needs an AGENTS §9 amendment:** the palette, glyph opacity 45–55% instead of 35%, and the tray scale from B3.

### 6.2 Board and blocks in Skia (`Board.js`, `Cell.js`, `Piece.js`, `boardLayout.js`)
`s` = cellSize (≈44.5 dp on a 393 dp board). `e` = edge = `max(2, round(s × 0.06))`. `r` = `s × 0.16`.

**Well:** `RoundedRect r=20 color=well` with a child `<Shadow dx={0} dy={1.5} blur={3} color={wellShadow} inner />`.

**Sockets (empty cells):** fill `cellEmpty`, plus a 1 px line at the inner top in `socketTop` (shadow, reads as recessed) and a 1 px line at the inner bottom in `socketBottom`.

**Perf:** the well and 64 sockets never change during play. Record them once with `createPicture` (Skia `PictureRecorder`), memoized on `[boardSize, isDark]`, and draw as one `<Picture>`. That takes about 130 nodes off every reconcile.

**Tiles (normal):**
1. `RoundedRect(x, y, s, s, r)` filled with `edge` (this is the bottom bevel)
2. `RoundedRect(x, y, s, s − e, r)` with `<LinearGradient start={{x, y}} end={{x, y: y + s − e}} colors={[top, base]} />`
3. Sheen: `RoundedRect(x + 2, y + 2, s − 4, (s − e) × 0.45, r − 2)` with a gradient from `sheenFrom` to `sheenTo`
4. Glint: `RoundedRect(x + s × 0.14, y + s × 0.12, s × 0.22, s × 0.07, s × 0.035)` in `glint`

That is 4 nodes per tile, no blur. All colors come from `theme.glaze[i]`; delete the per-render `adjustBrightness()` calls in `Cell.js:153`.

**Ghost:** fill `base` at 0.28, plus a 2 px stroke in `top` at 0.8, with no sheen or glint so it reads as a projection.

**Gem:** keep the glaze tile. On top, a diamond of side `s × 0.42` built from four facet triangles in white at 0.95 / 0.75 / 0.55 / 0.80 (top-left, top-right, bottom-right, bottom-left), with a 1 px outline in `edge`. Add a 4-point sparkle path (`s × 0.12`) at the diamond's top-right. Its opacity comes from **one** board-level shared value `twinkle` (`withRepeat(withTiming(1, 1200), -1, true)`), mapped to 0.3→0.9. One animation drives every gem.
- Reduce Motion: no twinkle, sparkle fixed at 0.6.

**Lock hp 2:** the tile base is mixed 50% toward `#8A8F99` (precompute `lockBase` per glaze in theme.js). Add an inset frame (`RoundedRect` inset 2, stroke 2.5, white 0.85 light / `#E9ECF2` 0.9 dark) and a centered padlock icon path (Lucide `lock`, scaled to `s × 0.45`) in white 0.9.

**Lock hp 1:** the normal glaze, no padlock, plus a crack: a zigzag path from (0.22s, 0.18s) → (0.48s, 0.46s) → (0.40s, 0.62s) → (0.78s, 0.84s), with a branch at (0.48s, 0.46s) → (0.70s, 0.36s). Stroke 1.5, white 0.7.
- On `lockCracked`, animate the crack path's `end` 0→1 over 160 ms and shake the tile ±2 px for 120 ms.
- Reduce Motion: the crack appears instantly, no shake.

**Colorblind:** draw the glyph with `glyphInk`. Keep the existing shapes.

**Performance notes:**
- Everything above is retained-mode. The board re-renders only on placement, never per frame.
- Per-frame work happens only in: the clear overlay (cleared cells only), the gem twinkle (one shared value), the line-preview bands (16 rects driven by a shared value), and the ring.
- No `Blur`/`Shadow` on tiles. The only blur is the static inner shadow inside the cached picture.
- Profile with the Android GPU overlay and the Perf Monitor on a mid-range device. Target: no frame over 16 ms during a 4-line clear.

### 6.3 Screen-by-screen

**Home (`app/index.js`, new `src/ui/components/MiniBoard.js`, `Icon.js`)**
- The top row holds a Profile icon button (left) and a Settings gear (right), 44×44, `inkMuted`.
- Brand: a 32 dp mark (three glazed tiles in an L: Cobalt, Saffron, Persimmon) over the Unbounded 700 40 wordmark "Gridly". Drop the subtitle or make it 14 `inkMuted`: "A calm block puzzle".
- Hero card (surface, radius 18, padding 16):
  - If `inProgress.classic` exists: a `MiniBoard` (8×8 at 112 dp, real board state, static Skia) on the left, and "Continue Classic" (Figtree 600 16) plus the score in Unbounded 600 28 on the right, with a full-width accent button "Continue".
  - Otherwise: a MiniBoard with a decorative sample pattern and the accent button "Play Classic".
- Two side-by-side mode tiles (radius 18, min height 112):
  - **Blitz:** timer icon, Unbounded 600 20 "Blitz", and meta "Best 418" in 14 `inkMuted`.
  - **Adventure:** map icon, "Adventure", and meta "Level 4 · 5 stars".
- A bottom row of three icon buttons with labels (Leaderboards, Achievements "2/25", Stats). Each is 64 dp tall with a 24 dp icon and a 12pt label.
- The background gets the spotlight (§6.5).

**Game top bar (`src/ui/GameScreen.js`, `_layout.js`)**
- Native header kept. Global centered title. `headerLeft` = BackButton icon. `headerRight` = a 40 dp circular `surfaceSunken` button holding the pause icon (2 bars of 3×12, radius 1.5, gap 4, `ink`) with a 44 dp hit target.
- Layout: wrap the score block in `flex: 1, justifyContent: 'center'`. Anchor the board and tray to the bottom with a fixed 20 dp gap between board and tray and the existing bottom inset. The dead band becomes a centered score.
- "best" becomes a chip: `surfaceSunken`, radius 999, padding 4/10, with a 12 dp trophy icon plus "Best 3,143" (Figtree 500 14, `inkMuted`). Sentence case.
- ScoreTicker `letterSpacing: -0.5`.

**Tray and hold (`Tray.js`, `TraySlot.js`, `HoldSlot.js`, `GameScreen.js`)**
- Remove the opaque slot cards. Each slot becomes a socket: `surfaceSunken` at 60% opacity in light / 100% in dark, radius 16, no border. An empty slot is just the faint socket.
- Per-piece fit scale (B3). Idle `elevation: 0` (B8).
- Hold: same socket plus a 1.5 dp dashed `line` border. Show a 20 dp swap icon (`arrow-left-right`) and "Hold" (12, `inkMuted`) under the socket instead of inside it, freeing the full socket for the piece.
  - Locked (used this turn): the socket at 40% opacity plus a small lock icon. Keep `accessibilityLabel` "Hold slot, locked".
  - Hovered: accent border 2 dp plus `accentSoft` fill (exists; keep).

**Pause (`PauseMenu.js`)**
- `<Modal transparent>` (B1). The scrim uses `scrim`. Set the board opacity to 0 while paused, and the tray too, so Blitz pause cannot be used to plan.
- The sheet is bottom-anchored on phones: radius 24 top corners, padding 24, safe-area bottom inset.
- Contents: "Paused" (Unbounded 600 20); "Resume" (accent fill, `onAccent`, 52 dp); "Restart" (`surfaceSunken`, `ink`, 52 dp); "Quit to home" (text button, `inkMuted`, 44 dp).
- In Blitz, add a line under the title: "Timer paused at 0:42".
- Enter: sheet translateY 24→0 plus fade, 220 ms. Reduce Motion: fade 110 ms.

**Game Over (`GameOver.js`)**
- `<Modal>` (B2).
- Sequence: (1) the board greys out row by row from top to bottom, each row at 60 ms, tiles lerp to `cellEmpty` + 10% over 180 ms; (2) the sheet rises; (3) the score counts 0→final over 800 ms ease-out; (4) if it is a new best, a "New best" chip (accent fill, `onAccent`, Figtree 600 14) pops in with a spring and gets one glint sweep.
- The highlight line is unchanged ("Best combo this game: ×6"). "Play again" is primary, "Home" is a text button.
- Reduce Motion: the grey-out is one 150 ms fade, the count-up is 400 ms, there is no spring.
- Adventure complete: StarRow uses Skia stars (§6.6) at 36 dp that fill one by one at 180 ms each, with a soft haptic per star. Reduce Motion: all filled at once.

**Blitz timer (`GameScreen.js`)**
- Move the timer directly above the board, full board width, 8 dp tall, radius 4, track `surfaceSunken`, fill `accent`.
- Seconds go on the left in Unbounded 600 20 tabular ("0:42"). The score stays the hero above.
- At ≤10 s the fill and digits switch to `danger`, and the digits pulse to scale 1.06 once per second. Reduce Motion: color change only.
- On a line clear, a "+2s" label (Figtree 600 14, `success`) floats from the bar end, rising 12 dp and fading over 600 ms.

**Adventure level (`GameScreen.js`, `src/game/adventureProgress.js` for text only)**
- Goal chips show progress: "Lines 1 / 3", "Score 412 / 1,097" (thousands separators), and "Gems 2 / 4" with a gem icon. Each chip has a hairline progress fill in `accentSoft` behind the text. On completion: a check icon, `success` text, and a 1.0→1.1→1.0 pop (Reduce Motion: none).
- Moves become their own pill with a footprints or hash icon and Figtree 600. At ≤3 moves, `danger` text and border (token, not `#E05D5D`).
- When the goal type is not `score`, drop the score to Unbounded 600 28 and make the goal chips Figtree 600 16.

**Adventure map (`app/adventure/index.js`)**
- No in-page title (or no header title; pick one). The header shows "Adventure" centered and the in-page header is just the star total: a Skia star plus "5 / 150" in Unbounded 600 20.
- Chapters with headings (Figtree 600 16): "Basics" (1–10), "Locks" (11–20), "Mixed" (21–50).
- Trail layout: a 4-column snake. Rows alternate direction, and a 4 dp `line`-colored connector joins consecutive nodes (Views, no Skia needed).
- Node 64 dp, radius 18:
  - **Completed:** chapter glaze fill (Cobalt / Jade / Iris) with `onAccent`-style white number and stars below in `star`.
  - **Current:** `surface` fill, 2 dp accent ring, plus an outer pulsing ring (scale 1→1.15, opacity 0.5→0, 1600 ms loop). Reduce Motion: static ring.
  - **Locked:** `surfaceSunken`, lock icon 18 dp `inkMuted`, no opacity hack (number hidden, label "Level 12, locked").
- Auto-scroll to the current level on mount.

**Settings (`app/settings.js`)**
- Top-aligned, not centered. Drop the in-card title (keep the header title).
- Three groups, each a `surface` card radius 18 with `line` hairlines between rows:
  - **Feedback:** Sound (volume icon), Haptics (vibrate icon)
  - **Display:** Theme segmented
  - **Accessibility:** Colorblind mode (eye icon), with the subline "Adds a shape to each color" in 14 `inkMuted` and a live 6-tile preview row showing the glyphs; Reduce motion segmented
- Section labels: Figtree 600 14 `inkMuted`, sentence case, outside the cards.
- Dev "Unlock all levels" goes under a "Developer" group shown only when `__DEV__`.
- Switch: `trackColor.false = line`, `thumbColor = surface` (both themes). _(iOS unverified)_

**Stats (`app/stats.js`)**
- Hero row: two tall tiles for "Classic best" and "Blitz best" (Unbounded 600 28, trophy icon).
- The rest is a single grouped list card: icon (20 dp) plus label (Figtree 500 16) plus value right-aligned (Unbounded 600 16).
- Average with no Classic games: "Finish a Classic game" (14 `inkMuted`).
- Combo shows as "×2" everywhere (also fix `ComboLabel`'s `x2` to `×2`).

**Achievements (`app/achievements.js`)**
- Rows: a 44 dp badge on the left, a hexagon or rounded-square glaze tile with an icon (combo = zap, perfect = sparkles, mono = palette, score = trophy, adventure = map, streak = flame, games = grid, lines = rows, hold = arrow-left-right).
- Unlocked: glaze fill plus a white icon, the date in 12 `inkMuted`.
- Locked: `surfaceSunken` badge with an `inkMuted` icon, full-contrast title and description (no opacity), and a progress line "32 / 50" with a 4 dp bar where there is a numeric stat. The thresholds come from the engine table, read-only.
- The header progress bar stays and gets a count chip.

**Leaderboards and Profile placeholders:** an icon (trophy / user) at 40 dp, the title, and one line: "Weekly and all-time rankings for Classic and Blitz." plus a "Coming soon" chip (`accentSoft` / `accent`). Top-aligned, no Phase copy. Better still, hide them from Home until Phase 4 ships.

### 6.4 Motion and juice (all on the UI thread; Reduce Motion fallback in brackets)
| Moment | Spec | Reduce Motion |
|---|---|---|
| Placement land | Placed cells pop 0.92→1.0, spring (damping 14, stiffness 260) about 160 ms, via a small overlay like `ClearingWaveOverlay` driven by the `placed` event | none |
| Glint wave (signature) | §6.7 | flash only, no ring, no stagger |
| Score popup | "+300" Figtree 600 16 (`ink`) at the clear centroid, rises 24 dp and fades over 600 ms. Mono bonus in Saffron, perfect in accent | fade only |
| Combo label | Moves to the clear centroid. Unbounded 600 28 "×3". Color steps: ×2 `accent`, ×3–4 Saffron, ×5+ Persimmon. Spring in, hold 700 ms, fade 200 ms (exists) | fade, 350 ms hold |
| Tray refill | New pieces scale 0.6→1.0 with a spring, staggered 40 ms left to right | fade 100 ms |
| Invalid drop | Existing 220 ms spring-back, plus a 1-cycle ±3 dp horizontal shake at the slot | no shake |
| Hold swap | Pieces cross-fade, with the incoming one scaling 0.8→1 over 140 ms | fade |
| Game over | Row-by-row grey-out (60 ms/row), then the sheet | one 150 ms fade |
| New best | Chip spring plus one glint sweep | static chip |
| Blitz ≤10 s | Digits pulse 1.06 at 1 Hz, `danger` | color only |
| Achievement toast | Badge tile on the left. Slides down 250 ms, holds 2.5 s (exists), success haptic | fade |
| Adventure stars | Fill one by one at 180 ms, with a light haptic each | all at once |

All durations are halved under Reduce Motion where motion remains (AGENTS §10). `useReduceMotion` already exists; pass it down instead of each component re-subscribing.

### 6.5 Backgrounds and atmosphere
- Game and Home get a static "light pool": a full-screen gradient from `bg` (top) to `bgDeep` (bottom), plus a radial `spotlight` centered behind the board (radius 0.7 × screen width, from `spotlight` to transparent).
- Implement it as **one static Skia `<Canvas>`** absolutely positioned behind the content. It never re-renders and is drawn once.
  - Or use RN's `experimental_backgroundImage` linear/radial gradients if they work on 0.88 Fabric. Check that first, because it saves the extra surface.
- No patterns, no particles. The table is quiet so the tiles can be loud.
- Card separation stays tonal (`surface` on `bg`), per AGENTS. No drop shadows except the toast and the dragged piece.
- The dragged piece is the one exception: a soft shadow under the lifted piece (an RN `boxShadow` style on Fabric, `0 8 16 rgba(0,0,0,0.18)`) so it visibly floats.

### 6.6 Iconography, with no new dependency
- New `src/ui/components/Icon.js`: `<Icon name size color strokeWidth={2} />` renders a `Canvas` (size × size) with a Skia `Path` (`style="stroke"`, `strokeCap="round"`, `strokeJoin="round"`), scaled from a 24-unit viewBox.
- Path data is copied from **Lucide** (ISC license; add it to CREDITS.md) into `src/ui/icons.js` as `{ name: 'svg path d' }`. Parse each once at module load with `Skia.Path.MakeFromSVGString`.
- Needed: `arrow-left`, `pause`, `play`, `rotate-ccw`, `house`, `trophy`, `award`, `chart-column`, `settings`, `user`, `star`, `lock`, `check`, `timer`, `map`, `volume-2`, `vibrate`, `eye`, `sparkles`, `zap`, `flame`, `palette`, `grid-3x3`, `rows-3`, `arrow-left-right`, `gem`, `footprints`. About 27 paths, ~4 KB.
- Stars become a filled Skia path instead of the `★` glyph, in StarRow.
- Cost: 0 dependencies, ~4 KB JS. One extra Canvas per visible icon (at most about 10 per screen).
- If Skia canvases per icon ever show up in profiling, the single dependency worth adding is **`react-native-svg`** (an Expo-SDK-pinned native module, about 1 MB native and 0 JS fonts) with the same Lucide paths. `@expo/vector-icons` is **not** recommended: it ships icon fonts (Feather ~60 KB, Material Community ~1 MB+), and font icons do not support stroke-weight tuning.

### 6.7 Signature moment: the glint wave
When lines clear:
1. The existing distance-staggered wave (18 ms per Chebyshev step from the placed piece's center) is kept.
2. **New:** before each cell shrinks, it *flashes*. A white (`glazeFx.flash`) overlay on the tile rises from 0 to 0.7 over the first 50 ms of its slot, then falls as the cell scales from 1 to 0 and fades (220 ms total, unchanged).
3. **New:** a single stroked ring (`Circle`, 3 dp, `glazeFx.flash` at 0.35) expands from the placement center to the board diagonal over `maxDelay + 220` ms, fading out and clipped to the board's rounded rect.
4. **Perfect Clear:** after the wave, a diagonal light band (a `LinearGradient` rect rotated 30°, white at 0→0.35→0) sweeps the empty board top-left to bottom-right in 500 ms, with a "Clean sweep" label (Unbounded 600 28) springing in at center. This replaces the plain 0.25 white pulse.
5. Combined with the score popup and the escalating combo color, this is the 3-second loop for the store video and screenshots: drop a piece, the tiles flash, light ripples out, "+600 ×3".
- Reduce Motion: flash only (a fade, so allowed), no stagger, no ring, no sweep. Durations halved.
- Cost: +1 RoundedRect per cleared cell (≤15 for a 1+1 clear, ≤64 worst case) and +1 Circle. All driven by the existing `waveTime` shared value, with no new React state.

### 6.8 App icon and splash
- **Icon:** a night-slate square (`#0E1218`) holding a 2×2 arrangement inside a debossed well. Three glazed tiles (Cobalt top-left, Saffron top-right, Persimmon bottom-left), each with the sheen and glint from §6.2, and an empty socket at bottom-right. It reads as "the move you're about to make". No text.
  - Android adaptive: foreground = the tiles (inside the 66% safe zone), background = solid `#0E1218`, monochrome = the tile silhouettes.
  - iOS: one 1024 px PNG. Also make the iOS 18 dark/tinted variants _(iOS unverified)_.
- Update `app.json`: `android.adaptiveIcon.backgroundColor` from `#E6F4FE` to `#0E1218`.
- **Splash:** `bg` per scheme (`#F4F1EC` / `#0E1218`) with the same three-tile mark at 96 dp, no text. Configure via `expo-splash-screen` config in `app.json` (it ships with `expo`; no new dependency). On launch, a 300 ms fade into Home, where the Home brand mark sits at the same spot (continuity).
- **Store screenshots (dark):** (1) mid-game with the glint wave and "×3"; (2) Home with the Continue card; (3) the Adventure trail; (4) a Blitz board at 0:09 in `danger`; (5) the achievements grid. Short captions in Figtree 600 ("Clear lines. Feel every one.").

---

## 7. Ranked by impact and effort

### Top 10 quick wins (S = under 1 hour each)
1. Fix the Pause and Game Over overlays with `Modal` (B1, B2). **Critical, S**
2. Glaze tokens in `theme.js` (palette, `onAccent`, `inkMuted`, `danger`). **Huge visual change, S**
3. Replace hard-coded `#FFFFFF` on accent with `onAccent` (B7). **S**
4. Pause icon replacing the `⏸` emoji (B4). **S** (uses the inline 2-bar View if the Icon system is not ready)
5. Per-piece tray scale for 1×5 (B3) and idle `elevation: 0` (B8). **S**
6. Global header: centered titles, one BackButton, remove duplicate in-page titles (B5, B11). **S**
7. Debossed sockets plus inset well (empty cells recede). **S/M**
8. Tray: remove the opaque cards, use subtle sockets. **S**
9. Game layout: score centered in the top space, board and tray anchored, best chip. **S**
10. Deep-link guard with hydration (B6), and "Coming soon" copy replacing "Phase 4" (B10). **S**

### Bigger changes (in order)
11. Glazed tile renderer, gem, and lock (§6.2). **M, high impact**
12. Glint wave, ring, score popups, and combo color (§6.7, §6.4). **M, signature**
13. Icon system (§6.6), then sweep all screens. **M**
14. Line-clear preview bands, required by spec (B9). **M**
15. Home redesign with the Continue card and MiniBoard. **M, first impression**
16. Game Over sequence and result screens. **M**
17. App icon, splash, store screenshots. **M (asset work)**
18. Blitz timer redesign and low-time state. **S/M**
19. Adventure trail map with chapters. **M/L**
20. Stats hero and list, Achievements badges and progress, Settings groups. **M**
21. Background light pool. **S/M**
22. Tray refill, placement land, invalid shake, hold swap motion. **S each**

---

## 8. Tasks for a smaller model (one prompt each)

Every task: JS only, no new dependencies, no edits under `src/engine/`, sentence case, works in light and dark, respects `useReduceMotion()`, `npm test` passes (update snapshots and tests that assert old colors or labels). "Check on phone" means Expo Go on Android; repeat on iOS when available.

**T01: Overlays use Modal.** Files: `src/ui/components/PauseMenu.js`, `GameOver.js`, `src/ui/GameScreen.js`.
- Wrap each overlay root in `<Modal visible transparent animationType="none" statusBarTranslucent navigationBarTranslucent onRequestClose={onResume / onHome}>`.
- Replace `...StyleSheet.absoluteFillObject` with `StyleSheet.absoluteFill`. Scrim = `theme.scrim`, or `rgba(0,0,0,0.55)` until T02.
- In GameScreen, while paused set the board and tray opacity to 0.
- Check on phone: pause in Classic and Blitz. The scrim covers the whole screen including the header and status bar. The sheet is fully visible with all three buttons. Nothing behind it shifts. The Android back button resumes. Game Over shows a full-screen scrim with the whole card visible.

**T02: Glaze tokens.** Files: `src/ui/theme.js` (and any tests asserting old hex values).
- Paste §6.1 exactly. `resolveTheme` returns all new tokens plus `glaze` (per-scheme array) and `onAccent`. Keep `blocks` = base colors for compatibility.
- Check on phone: blocks are vivid cobalt, jade, persimmon, saffron, iris, lagoon. The light background is warm porcelain, the dark one near-black slate. "best" text is clearly readable.

**T03: onAccent everywhere.** Files: `app/index.js`, `PauseMenu.js`, `GameOver.js`, `Segmented.js`, `HandHint.js`.
- Every text or icon on an `accent` fill uses `theme.onAccent`, and the primary button sub-label uses `onAccent` at 0.8 opacity. Replace `#E05D5D` with `theme.danger`.
- Check on phone (dark): "Play Classic", "Resume", and "Play again" are dark text on periwinkle, crisp.

**T04: Icon component.** Files: new `src/ui/icons.js`, new `src/ui/components/Icon.js`, `CREDITS.md`.
- Lucide paths for the 27 names in §6.6. Parse each once with `Skia.Path.MakeFromSVGString`. Props `name, size=24, color, strokeWidth=2`. Fill mode for `star`.
- Each icon is wrapped in a View with `accessible={false}`; the parent carries the label.
- Check on phone: a temporary dev row renders all icons crisply in both themes. Remove it before merging.

**T05: Pause icon and BackButton.** Files: `src/ui/GameScreen.js`, `app/_layout.js`, new `src/ui/components/BackButton.js`, `app/stats.js`, `app/achievements.js`.
- Pause: a 40 dp circle in `surfaceSunken` with Icon `pause` at 20 dp in `ink`, hit area 44.
- BackButton: Icon `arrow-left` 24 in `ink`, 44×44, `router.canGoBack() ? back() : replace('/')`.
- In `_layout` `screenOptions`, set `headerTitleAlign: 'center'` and `headerLeft: () => <BackButton />` (Home has `headerShown: false`). Delete the custom headerLeft code in stats and achievements.
- Check on phone: every screen has the same arrow and centered titles. The pause button is ink-colored, not orange.

**T06: Tray fit and elevation.** Files: `TraySlot.js`, `HoldSlot.js`.
- `const restScale = Math.min(0.55, (slotWidth - 16) / pieceWidth, (slotHeight - 16) / pieceHeight)`. Use it everywhere 0.55 appears, including the lift lerp `restScale + (1 - restScale) * liftProgress`.
- Idle `elevation: 0`.
- Check on phone: 1×5 and 5×1 sit fully inside their slot. Drag still lifts to full size, with the bottom edge one cell above the finger. Hold has no shadow.

**T07: Tray sockets.** Files: `TraySlot.js`, `HoldSlot.js`, `GameScreen.js`.
- Slot background is `surfaceSunken` (light at opacity 0.6), radius 16.
- Hold: a 1.5 dp dashed `line` border. The "Hold" label (12, `inkMuted`) moves below the socket with a 4 dp gap. The `arrow-left-right` icon (18, `inkMuted`) is centered when empty.
- Locked: 0.4 opacity plus a 14 dp `lock` icon top-right.
- Check on phone: the tray no longer shows white boxes, the pieces float, and Hold reads as distinct.

**T08: Game layout and best chip.** Files: `src/ui/GameScreen.js`, `ScoreTicker.js`.
- Score block wrapper `flex: 1, justifyContent: 'center'`. Board and tray in a bottom group with a 20 dp gap.
- Best chip: `surfaceSunken`, radius 999, paddingVertical 4, paddingHorizontal 10, Icon `trophy` 12 plus "Best 3,143" Figtree_500Medium 14 `inkMuted`.
- ScoreTicker `letterSpacing: -0.5`.
- Check on phone: no big empty band between score and board, and the score looks centered in the space above the board on tall and small screens.

**T09: Board sockets and well.** Files: `src/ui/components/Board.js`, `src/ui/boardLayout.js`.
- Well: RoundedRect r 20 in `well` plus `<Shadow dx={0} dy={1.5} blur={3} color={wellShadow} inner />`.
- Each socket: fill `cellEmpty`, a 1 px top line in `socketTop` inset by the radius, a 1 px bottom line in `socketBottom`.
- Record the well and sockets once with `createPicture`, memoized on `[boardSize, theme.isDark]`, and draw them as `<Picture>`. Cell radius = `cellSize × 0.16`.
- Check on phone: empty cells look pressed into the board and fade into the background. Placed blocks stand out clearly. No frame drops while dragging.

**T10: Glazed tiles.** Files: `src/ui/components/Cell.js`.
- Implement the four layers from §6.2 using `theme.glaze[color]`. Ghost per §6.2. Delete the `adjustBrightness` calls in the render path.
- Colorblind glyph color = `glaze.glyphInk`.
- Check on phone: blocks look like glossy tiles with a darker bottom lip and a small highlight top-left, in both themes. The ghost is translucent with no highlight. Colorblind glyphs are visible on yellow tiles.

**T11: Gem and lock.** Files: `Cell.js`, `Board.js`, `theme.js` (add `lockBase` per glaze).
- Gem facets and the twinkle shared value (one, board-level). Lock hp 2 frame plus padlock. Lock hp 1 crack. Crack draw-on animation on the `lockCracked` event via `subscribe`. Values per §6.2.
- Check on phone: open a level with gems and locks (11+). Gems sparkle softly; with Reduce Motion on they are static. hp 2 shows a padlock and frame. After one clear it shows a crack instead.

**T12: Glint wave and ring.** Files: `Board.js` (`ClearingCell`, `ClearingWaveOverlay`).
- Flash overlay per cell: `opacity = elapsed < 50 ? 0.7 * elapsed / 50 : 0.7 * (1 - (elapsed - 50) / 170)`, clamped to 0..0.7.
- Ring: `Circle` stroke 3, color white 0.35 × (1 − t). Radius = `t × boardDiagonal`, where `t = waveTime / totalDuration`. Clip to the board rect.
- Perfect clear: a diagonal sweep rect, 500 ms, white peak 0.35. It replaces the 0.25 pulse.
- Reduce Motion: flash only, stagger 0, no ring or sweep.
- Check on phone: clearing a line flashes white rippling outward from the drop point with a faint ring. A perfect clear sweeps light diagonally.

**T13: Score popup and combo upgrade.** Files: new `src/ui/components/ScorePopup.js`, `ComboLabel.js`, `GameScreen.js`.
- Popup listens to `scored` and `cleared` via `subscribe` and shows "+delta" at the cleared-cells centroid (board-relative). Rises 24 dp and fades over 600 ms.
- Combo: text `×N`. Unbounded_600SemiBold 28. Color ×2 `accent`, ×3–4 Saffron base, ×5+ Persimmon base. Positioned at the centroid offset −40 dp.
- Check on phone: each clear shows "+100" or more floating up from the cleared area. Combos show "×3" in saffron near the clear.

**T14: Line-clear preview.** Files: `TraySlot.js`, `HoldSlot.js`, `GameScreen.js`, `Board.js`.
- In `checkPlacementJS`, when valid, compute `findClears(placePiece(board, piece, row, col, piece.color))` (imports from `src/engine/board.js`, read-only use). Encode it as a 16-bit mask: rows in bits 0–7, cols in bits 8–15. Write it to a shared value `previewMask` passed via the `ghost` object, and set it to 0 when invalid or on drop.
- Board draws 8 row bands and 8 col bands (`RoundedRect` over the row or column, r = cellRadius) with `opacity = useDerivedValue(() => (previewMask.value >> i) & 1 ? 0.22 : 0)`, color white in dark and the glaze top of the dragged piece at 0.25 in light.
- No React state.
- Check on phone: hovering a piece where it would complete a row softly lights that row (and column). Moving away removes it instantly. Dragging stays smooth.

**T15: Home redesign.** Files: `app/index.js`, new `src/ui/components/MiniBoard.js`, `BrandMark.js`.
- Per §6.3. MiniBoard is a static Skia 8×8 at 112 dp, reusing the `Cell` glaze drawing at a small size (no sheen below 14 dp cells), reading `useProgress(s => s.inProgress.classic)` for the board. Mode tiles show `bestScore.blitz` and `adventure.unlocked` plus the total stars.
- Every pressable is ≥44 dp and has an `accessibilityLabel`.
- Check on phone: Home shows the brand mark, a Continue card with your real board and score (or Play Classic), two mode tiles with your stats, and three icon buttons. No empty bottom half.

**T16: Pause and Game Over visual pass.** Files: `PauseMenu.js`, `GameOver.js`, `Board.js` (grey-out).
- Bottom sheet per §6.3, enter 220 ms. Game over sequence per §6.3: the grey-out drives a `gameOverT` shared value in Board, where each row lerps toward `cellEmpty` when `t > row × 60`. Score count-up over 800 ms. New best chip.
- Check on phone: on losing, the board greys top-down, then the card rises and the score counts up. With Reduce Motion it is a simple fade.

**T17: Blitz timer.** Files: `GameScreen.js`.
- Per §6.3: an 8 dp bar above the board, "0:42" in Unbounded_600SemiBold 20 on the left, `danger` at ≤10 s with a 1 Hz pulse, and "+2s" floating on clears (listen for `cleared` events).
- Check on phone: the timer is obvious. Under 10 s it turns red and pulses. Clears show "+2s".

**T18: Adventure goal chips and level guard.** Files: `GameScreen.js`, `src/game/adventureProgress.js` (text formatting only), `app/adventure/[level].js`.
- Progress text and the hairline fill per §6.3, `toLocaleString` numbers, a separate moves pill using `danger` at ≤3.
- Guard per B6 with a hydration check.
- Check on phone: chips read "Score 412 / 1,097" and fill as you play. `adb shell am start -d "gridly:///adventure/30"` on a fresh save lands on the map.

**T19: Adventure trail map.** Files: `app/adventure/index.js`.
- Per §6.3: chapters, a snake layout, connectors, three node states, a pulsing current ring, auto-scroll to the current level with `scrollTo` on layout.
- Check on phone: the map reads as a path. The current level is unmistakable. Locked levels show a lock, not a faded number.

**T20: Settings, Stats, Achievements, placeholders.** Files: `app/settings.js`, `app/stats.js`, `app/achievements.js`, `app/leaderboards.js`, `app/profile.js`.
- Per §6.3: grouped settings with icons and the colorblind preview row; stats hero plus list; achievement badges plus progress (use exported thresholds from the achievements table if present, otherwise show no progress); "Coming soon" placeholders.
- No duplicate titles. Content is top-aligned.
- Check on phone: no screen has a big empty top gap, every list row has an icon, and locked achievements are readable.

**T21: Background light pool.** Files: new `src/ui/components/Backdrop.js`, `GameScreen.js`, `app/index.js`.
- Static Skia canvas per §6.5, `pointerEvents="none"`, rendered once.
- Check on phone: a soft brighter area behind the board, invisible as a "feature" but making the board feel lit. No FPS change.

**T22: Small motion pass.** Files: `TraySlot.js`, `Tray.js`, `Board.js`.
- Tray refill stagger, placement land pop, invalid-drop shake, hold swap per the §6.4 table.
- Check on phone: refills pop in left to right, drops feel weighty, and invalid drops wiggle back.

**T23: App icon and splash.** Files: `assets/icon.png`, `assets/android-icon-*.png`, `assets/splash-icon.png`, `app.json`.
- Per §6.8. Export at 1024 px (icon), 432 px (adaptive layers), and 288 px (splash mark).
- Check on phone: the launcher shows the three-tile slate icon, and the splash matches the theme with no flash of white in dark.

---

## 9. AGENTS.md changes this plan needs (ask before applying)
- §9 Color: replace the block palette and light/dark tokens with the Glaze set. Add `onAccent`, `surfaceSunken`, `line`, `danger`, `success`, `scrim`, `spotlight`, `bgDeep`, `star`.
- §9 Blocks: "gradient body, sheen, glint, 2–3 px darker bottom lip". Glyph opacity becomes 45–55% with per-color ink.
- §9 Tray: "55%, or smaller if the piece would not fit its slot".
- §9 Shape: cell radius `0.16 × cell`, card radius 18.
- §10: add the glint flash, ring, score popup, and game-over grey-out to the feel requirements, with their Reduce Motion fallbacks.
- §11 Phase 5: icon and splash concept per §6.8.
