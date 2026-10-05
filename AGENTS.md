# AGENTS.md — Gridly

> Working title: **Gridly**. Rename freely; update `app.json` (`name`, `slug`, `scheme`) and this file together.

Gridly is an open-source block puzzle game for iOS and Android. It is built with Expo and React Native in plain JavaScript. Players drag pieces onto an 8×8 grid, and full rows and columns clear. The look is clean and minimal. The feel (animation, haptics, sound) is the product.

This file is the source of truth. If code and this file disagree, ask before changing either.

---

## UI refresh

`docs/UI_REVIEW.md` is the visual source of truth for the Glaze direction.

---

## 1. Non-negotiable rules

- **JavaScript only.** No TypeScript, no `.ts`/`.tsx` files. Use JSDoc `@typedef` / `@param` in `src/engine/` so shapes stay documented.
- **Expo managed workflow.** Install native packages with `npx expo install <pkg>`, never plain `npm i`, so versions match the SDK. Pure JS packages may use `npm i`.
- **Engine is pure JS.** `src/engine/` must not import React, React Native, Expo, or anything with side effects. There, no `Date.now()` and no `Math.random()`: time and randomness are passed in (seeded RNG). This keeps it deterministic and testable.
- **Engine functions are pure.** They take state and return `{ state, events }`. Never mutate input state.
- **UI renders state and plays events.** The UI never re-derives game rules. It sends actions to the engine and plays feedback (animation, sound, haptics) from the returned `events`.
- **Minimal dependencies.** Only the packages in §3. Adding one requires a one-line justification in the PR/commit message.
- **Open source hygiene.** Never commit secrets. Only `EXPO_PUBLIC_*` values go in the app, and the Supabase service-role key lives only in Edge Function secrets. Keep `.env.example` updated.
- **Accessibility floor.** Respect Reduce Motion, support a colorblind mode, keep touch targets ≥ 44pt, and give interactive elements `accessibilityLabel`.
- Run `npm test` before every commit. Engine changes need tests.

---

## 2. Commands

```bash
npx expo start          # dev server (Expo Go works for phases 0–3)
npm test                # jest (engine tests)
npx expo install <pkg>  # add native/Expo packages
npx expo prebuild --clean   # only if a dev build is needed (phase 4+)
eas build --profile preview --platform android   # APK for GitHub Releases
eas build --profile production --platform ios    # App Store
```

---

## 3. Stack

| Concern | Package |
|---|---|
| Framework | `expo` (latest SDK), `expo-router` |
| Asset loading | `expo-asset` (peer dependency of `expo-audio`) |
| Board rendering | `@shopify/react-native-skia` |
| Gestures & animation | `react-native-gesture-handler`, `react-native-reanimated` (+ `react-native-worklets` if the SDK requires it) |
| State | `zustand` (with `persist` middleware) |
| Local persistence | `@react-native-async-storage/async-storage` |
| Haptics / audio | `expo-haptics`, `expo-audio` |
| Fonts | `expo-font`, `@expo-google-fonts/unbounded`, `@expo-google-fonts/figtree` |
| Splash | `expo-splash-screen` |
| Backend (phase 4) | `@supabase/supabase-js`, `react-native-url-polyfill`, `expo-apple-authentication` |
| Tests | `jest`, `jest-expo` |

Not used, on purpose: TypeScript, Redux, styled-components, Lottie, analytics SDKs, Google Sign-In (it would add a Google Play Services dependency to an open-source APK).

---

## 4. Folder structure

```
app/                        # expo-router screens (thin: layout + wiring only)
  _layout.js                # fonts, theme, gesture root, stack, splash hide, music
  (tabs)/                   # share one BottomNav; URLs unchanged (/, /stats, ...)
    _layout.js              # Tabs with BottomNav as the custom tab bar
    index.js                # Home
    leaderboards.js
    achievements.js
    stats.js
    profile.js              # name, link account, delete account
  classic.js
  blitz.js
  adventure/index.js        # level map
  adventure/[level].js      # play a level
  settings.js
src/
  engine/                   # PURE JS. No React/Expo imports.
    rng.js                  # mulberry32 seeded RNG
    pieces.js               # shape catalog
    board.js                # create, canPlace, place, findClears, clear
    generator.js            # tray generation + difficulty weights
    scoring.js
    game.js                 # createGame, placePiece, holdPiece, tick, isGameOver
    modes/classic.js
    modes/blitz.js
    modes/adventure.js
    achievements.js         # evaluate(events, stats) -> newly unlocked ids
    stats.js                # applyGameResult(stats, result) -> stats
    __tests__/
  game/
    useGameController.js    # engine <-> gestures <-> feedback bridge
  ui/
    theme.js                # tokens from §9 (single source)
    components/             # Board, Piece, Tray, HoldSlot, ScoreTicker, ComboLabel,
                            # Button, Card, Toast, Modal, StarRow,
                            # BrandMark (Home logo), BottomNav, PressableScale,
                            # GoalChip, GemFlight
  store/
    useSettings.js
    useProgress.js          # stats, achievements, adventure, in-progress game
  services/
    feedback.js             # haptics + sounds, reads settings
    music.js                # background loop per screen family, reads settings
    supabase.js
    sync.js                 # cloud save merge
    leaderboard.js          # submit queue + fetch
assets/
  levels/levels.json
  sounds/                   # CC0 only (e.g. Kenney.nl packs); list sources in CREDITS.md
  audio/                    # background music: home.mp3, blitz.mp3, adventure.mp3 (credit in CREDITS.md)
scripts/
  gen-levels.js             # generate candidate levels (seeded)
  verify-levels.js          # greedy bot playtests each level
  gen-icon.py               # renders icon, adaptive layers, favicon, splash mark (Pillow)
supabase/
  migrations/001_init.sql
  functions/submit-score/index.ts   # Edge Functions run on Deno; TS allowed ONLY here
  functions/delete-account/index.ts
```

Screens stay thin. Logic lives in `src/engine`, `src/game`, `src/store`, `src/services`.

---

## 5. Core game rules (engine spec)

### Board
- 8×8, stored as a flat array of 64 cells, index = `row * 8 + col`.
- Cell: `null` or `{ color: 0-5, kind: 'normal' | 'gem' | 'lock', hp: 1 | 2 }`.

### Pieces
- Pieces are never rotated by the player. Each generated piece has one random color, 0–5.
- The catalog lives in `pieces.js` as `{ id, cells: [[r,c],...], weight }`, normalized so the min row and col are 0:
  - Lines: 1×1, 1×2, 2×1, 1×3, 3×1, 1×4, 4×1, 1×5, 5×1
  - Squares: 2×2, 3×3
  - Rectangles: 2×3, 3×2
  - Small L (3 cells, 2×2 minus one): 4 orientations
  - Big L (5 cells, 3×3 corner): 4 orientations
  - L-tetromino and J-tetromino: 4 orientations each
  - T: 4 orientations
  - S, Z: 2 orientations each

### Turn flow
1. The tray holds 3 pieces. The player drags one onto the board.
2. Placement is valid if every cell is in bounds and empty.
3. After placement, find every full row and column (cells present regardless of kind). Clear them simultaneously. A cell on both a cleared row and column is cleared once.
4. Clearing: `normal` and `gem` cells are removed (a gem cleared → `gemCollected` event). `lock` cells with `hp: 2` drop to `hp: 1` and stay. With `hp: 1` they are removed.
5. When all 3 tray pieces are placed, generate 3 new ones.
6. **Game over** when no tray piece and no held piece fits anywhere.

### Hold slot
- One slot. Dragging a tray piece onto the Hold slot stores it. If the slot is occupied, the pieces swap.
- The held piece can be dragged from the slot onto the board.
- Hold can be used **once per placement**: after holding or swapping, the player must place a piece before holding again.
- A held piece does not count toward the "all 3 placed" refill condition. The tray refills when the tray itself is empty. This also applies after a hold: holding the last tray piece into an empty slot refills the tray at once.

### Scoring (`scoring.js`)
- Placement: **+1 per cell** placed.
- Line clears (`L` = lines cleared in one placement): `L=1: 100`, `L=2: 300`, `L=3: 600`, `L=4: 1000`, `L≥5: 1000 + 500 × (L−4)`.
- **Mono line bonus:** +500 per cleared line whose 8 cells were all the same color before clearing.
- **Combo:** the combo counter increments on each placement that clears at least one line. It resets to 0 after **3 consecutive placements with no clear**. The clear score (lines + mono) is multiplied by `1 + 0.5 × (combo − 1)`.
- **Perfect Clear:** board fully empty after a clear → **+2000** (not multiplied).
- All values live as named constants at the top of `scoring.js` for tuning.

### Piece generation (`generator.js`)
- Seeded RNG only.
- Weighted random from the catalog. Weights shift toward larger pieces as score rises (difficulty curve defined as a small table of score thresholds → weight multipliers).
- **Fairness guarantee:** at least 1 of the 3 new pieces must fit the current board. Resample up to 20 times. If none works, force the smallest fitting piece into one slot.
- **Early mercy:** below 1500 points, prefer sets where all 3 pieces can be placed in some order (check with a quick search; give up after 20 tries).

### Events
Engine actions return `events` in order. The UI plays them. Minimum set:

```
placed        { pieceId, cells, color }
cleared       { rows, cols, cells, mono: [lineIds], linesCount }
gemCollected  { index }
lockCracked   { index }
combo         { count, multiplier }
perfectClear  {}
scored        { delta, total, breakdown }
trayRefilled  { pieces }
held          { piece, swappedOut }
gameOver      { reason: 'noMoves' | 'timeUp' | 'outOfMoves' }
goalCompleted { index, goal }   // Adventure: a goal flipped to met this placement
levelComplete { stars }
achievement   { id }   // emitted by the store layer, not the engine
```

---

## 6. Modes

### Classic (endless)
The core rules with no limits. The game can be resumed after the app is closed: the full game state is serialized to the store after every placement. It gets weekly and all-time leaderboards.

### Blitz
- Timer starts at **90s**. Each cleared line adds **+2s**, capped at 120s remaining.
- **Speed bonus:** a placement within 1.5s of the previous one gets +50% on that placement's score.
- Ends on `timeUp` or `noMoves`. It gets a weekly leaderboard.
- Time comes from the caller via `tick(state, elapsedMs)`. The engine never reads the clock.

### Adventure
- Levels live in `assets/levels/levels.json`. There are 50 at launch.
- Schema:

```json
{
  "id": 12,
  "seed": 12012,
  "board": ["........","..G.....","........","XXX.XX..","........","....L...","........","........"],
  "goals": [{ "type": "gems" }, { "type": "score", "value": 1500 }],
  "moves": 20,
  "stars": [1500, 2500, 3500]
}
```

- Board chars: `.` empty, `X` prefilled normal block (color from seed), `G` gem block, `L` lock block (`hp: 2`).
- Goal types: `gems` (collect all gems on the board), `score` (reach value), `lines` (clear N lines).
- `moves` is optional. Running out = fail. `noMoves` = fail.
- Stars are awarded by final score against `stars` thresholds, but only if all goals are met (min 1 star on completion).
- Progression: levels 1–10 teach basics, gems, and prefills. 11–20 introduce locks. 21–50 mix everything, with move limits appearing from 15.
- `scripts/gen-levels.js` generates candidates. `scripts/verify-levels.js` runs a greedy bot (e.g. 50 seeds per level) and reports win rate. Target win rates: 90%+ for levels 1–10, ending around 40–60% by level 50.

---

## 7. Player features

### Stats (`src/engine/stats.js`, stored in `useProgress`)
Track games played per mode, best score per mode, total lines cleared, best combo, perfect clears, mono lines, total pieces placed, holds used, total play time, current and best day streak (`lastPlayedDay` as `YYYY-MM-DD`, local time).

### Achievements (`src/engine/achievements.js`)
`evaluate(events, stats, context) → string[]` of newly unlocked ids. Unlocking shows a toast plus a success haptic.

| id | Condition |
|---|---|
| `first_clear` | Clear a line |
| `double` | Clear 2 lines at once |
| `quad` | Clear 4 lines at once |
| `combo_3` / `combo_5` / `combo_10` | Reach that combo |
| `perfect` | First Perfect Clear |
| `perfect_5` | 5 Perfect Clears total |
| `mono` | First mono line |
| `mono_10` | 10 mono lines total |
| `classic_1k` / `5k` / `10k` / `25k` | Classic score |
| `blitz_3k` / `blitz_8k` | Blitz score |
| `adv_10` / `adv_25` / `adv_50` | Complete that Adventure level |
| `stars_100` | 100 total stars |
| `games_10` / `games_100` | Games played (all modes) |
| `lines_1000` | 1000 lines total |
| `holder` | Use Hold 50 times |
| `streak_7` | Play 7 days in a row |

That is 25 total. Names and descriptions live in one table with the ids above. Use plain, friendly names ("Clean sweep" for `perfect`), sentence case.

### Local save shape (`useProgress`, persisted via zustand `persist` + AsyncStorage)

```js
{
  version: 1,
  stats: { /* §7 */ },
  achievements: { [id]: '2026-10-01T12:00:00Z' },
  adventure: { unlocked: 1, stars: { [levelId]: 0-3 }, best: { [levelId]: score } },
  inProgress: { classic: null | serializedGame },
  updatedAt: 'ISO'
}
```

Settings are stored separately in `useSettings`: `{ sound, haptics, music, musicVolume: 0-1, theme: 'system'|'light'|'dark', colorblind, reduceMotion: 'system'|'on'|'off', seenOnboarding }`.

### Accounts, cloud save, leaderboards (phase 4)
- On first launch, call `supabase.auth.signInAnonymously()` silently. Every player gets cloud save and leaderboards with no sign-in wall.
- Profile → "Keep your progress safe": link **email (one-time code)** on all platforms and **Sign in with Apple** on iOS. Verify the current supabase-js identity-linking API before implementing. If a linking path isn't supported, sign in and run the merge below.
- **Sync:** push the save to the `saves` table (debounced 5s, and on app background). Pull on launch and after sign-in.
- **Merge** (`sync.js`, pure function with tests), used when local and cloud both exist:
  - numeric stats and bests take the max
  - achievements take the union, keeping the earliest date
  - adventure `unlocked` takes the max, and `stars`/`best` take the per-level max
  - `inProgress` keeps the newest by `updatedAt`
- **Leaderboards:** scores are submitted only via the `submit-score` Edge Function, with a local queue for offline use and retries. The screen has Classic/Blitz tabs and Weekly/All-time tabs, shows the top 100, and pins the player's own rank at the bottom.
- **Display names:** auto-generated `Player123456`, editable (3–20 chars, letters/numbers/spaces/underscores).
- **Delete account** in Profile calls the `delete-account` Edge Function, then clears local data. This is required by the App Store.
- Because the source is public, cheating is easier. The Edge Function validates as much as possible (below). Accept that it's imperfect.

---

## 8. Supabase

`supabase/migrations/001_init.sql`:

```sql
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text not null unique check (char_length(display_name) between 3 and 20),
  created_at timestamptz not null default now()
);

create table saves (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table scores (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  mode text not null check (mode in ('classic', 'blitz')),
  score int not null check (score >= 0),
  moves int not null check (moves > 0),
  duration_ms int not null check (duration_ms > 0),
  created_at timestamptz not null default now()
);
create index scores_mode_score on scores (mode, score desc);
create index scores_mode_created on scores (mode, created_at);

alter table profiles enable row level security;
alter table saves enable row level security;
alter table scores enable row level security;

create policy "profiles readable" on profiles for select using (true);
create policy "own profile update" on profiles for update using (auth.uid() = id);
create policy "own save read" on saves for select using (auth.uid() = user_id);
create policy "own save insert" on saves for insert with check (auth.uid() = user_id);
create policy "own save update" on saves for update using (auth.uid() = user_id);
create policy "scores readable" on scores for select using (true);
-- no insert policy on scores: only the submit-score function (service role) writes

create function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- ponytail: random name can collide on unique; retry client-side rename if insert fails
  insert into profiles (id, display_name)
  values (new.id, 'Player' || floor(random() * 900000 + 100000)::int);
  return new;
end; $$;

create trigger on_auth_user_created
after insert on auth.users for each row execute function handle_new_user();

create function get_leaderboard(p_mode text, p_weekly boolean, p_limit int default 100)
returns table (rank bigint, user_id uuid, display_name text, score int)
language sql stable security definer set search_path = public as $$
  with best as (
    select s.user_id, max(s.score) as score
    from scores s
    where s.mode = p_mode
      and (not p_weekly or s.created_at >= date_trunc('week', now()))
    group by s.user_id
  )
  select rank() over (order by b.score desc), b.user_id, p.display_name, b.score
  from best b join profiles p on p.id = b.user_id
  order by b.score desc
  limit p_limit;
$$;
```

Also add `get_my_rank(p_mode, p_weekly)`, which uses the same logic filtered to `auth.uid()`.

**`submit-score` Edge Function:**
- Requires a valid user JWT.
- Validates `mode`, `score`, `moves`, and `duration_ms` with these checks:
  - `score ≤ moves × 4000`
  - `duration_ms ≥ moves × 250`
  - Blitz: `duration_ms ≤ 125000`
- Rate-limits to 1 submission per user per 15s.
- Inserts with the service role.

**`delete-account` Edge Function:** requires a JWT and deletes the auth user with the admin API. Cascades remove the rest.

**Env:**
- `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (the anon/publishable key is safe to ship given RLS).
- Enable **Anonymous sign-ins** and **Email OTP** in the Supabase dashboard.

---

## 9. Design system (`src/ui/theme.js`)

**Direction:** calm, precise, tactile, like well-made tiles on a quiet table. The board is the hero. Everything around it is quiet. The one bold element is the **clear wave** (§10). Nothing else competes with it.

### Color

Light:

| token | hex | use |
|---|---|---|
| `bg` | `#F4F1EC` | app background (porcelain) |
| `bgDeep` | `#EAE5DC` | bottom of background gradient |
| `spotlight` | `#FBF9F5` | radial light pool behind board |
| `surface` | `#FFFFFF` | cards, sheets |
| `surfaceSunken` | `#E9E4DB` | tray sockets, chips, segmented track |
| `line` | `#E0D9CD` | hairlines |
| `well` | `#CFC6B6` | board background (stone) |
| `cellEmpty` | `#DCD5C8` | empty cell (socket) |
| `ink` | `#1B1F2A` | primary text |
| `inkMuted` | `#5C6372` | secondary text |
| `accent` | `#2E52CC` | primary buttons, focus |
| `onAccent` | `#FFFFFF` | text/icon on accent |
| `danger` | `#C8372D` | low timer/moves, destructive actions |
| `success` | `#1E8A5F` | timer bonus, completed goals |
| `star` | `#F2B33D` | filled stars |
| `scrim` | `rgba(14,18,24,0.55)` | modal overlay scrim |

Dark:

| token | hex |
|---|---|
| `bg` | `#0E1218` |
| `bgDeep` | `#0A0D12` |
| `spotlight` | `#161C26` |
| `surface` | `#171C25` |
| `surfaceSunken` | `#12161D` |
| `line` | `#232A36` |
| `well` | `#0A0D12` |
| `cellEmpty` | `#1A1F29` |
| `ink` | `#ECEFF5` |
| `inkMuted` | `#97A1B4` |
| `accent` | `#8EA8FF` |
| `onAccent` | `#0E1218` |
| `danger` | `#FF7A6E` |
| `success` | `#4CD39A` |
| `star` | `#FFC452` |
| `scrim` | `rgba(0,0,0,0.6)` |

Block colors (Glaze palette, with base / top / edge in light and dark):

| index | name | glyph | light (base / top / edge) | dark (base / top / edge) | glyph ink |
|---|---|---|---|---|---|
| 0 | Cobalt | dot | `#3D6FE0` / `#5A88F0` / `#2448A8` | `#5B8AF0` / `#7BA3FF` / `#3360C8` | `rgba(255,255,255,0.55)` |
| 1 | Jade | ring | `#2FA87A` / `#4DC294` / `#1B7655` | `#3DC08E` / `#5FD7A6` / `#23885F` | `rgba(14,18,24,0.45)` |
| 2 | Persimmon | bar | `#F06A4D` / `#FF8A6E` / `#B4402A` | `#FF7D5E` / `#FF9C82` / `#C24A31` | `rgba(255,255,255,0.55)` |
| 3 | Saffron | cross | `#F2B33D` / `#FFCB62` / `#96660F` | `#FFC452` / `#FFD67E` / `#B07A1C` | `rgba(14,18,24,0.45)` |
| 4 | Iris | triangle | `#8B6CF0` / `#A48BFA` / `#5A40C0` | `#A08AF7` / `#B8A6FF` / `#6B50D6` | `rgba(255,255,255,0.55)` |
| 5 | Lagoon | diamond | `#1FB0C2` / `#45C8D7` / `#137F8D` | `#33C4D6` / `#5FD8E6` / `#188F9E` | `rgba(14,18,24,0.45)` |

**Colorblind mode:** each color index also gets a small inset glyph (dot, ring, bar, cross, triangle, diamond) drawn in Skia at 45-55% opacity with a per-color ink.

### Type
- **Unbounded** (600/700): score, mode titles, big numbers only. Use tabular spacing for the score ticker (fixed-width digits via layout, not a mono font).
- **Figtree** (400/500/600): everything else.
- Scale (pt): 12, 14, 16, 20, 28, 40, 56. The score uses 56 in-game and 40 on Game Over.
- Sentence case everywhere. No all-caps labels, no eyebrow labels above headings.

### Shape & space
- Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Radius by hierarchy (not one radius for everything):
  - board: 20
  - cells: 0.16 times the cell size (≈7 at 44px cells)
  - buttons: 14
  - cards: 18
  - sheets: 24
- Cell gap: 3px. Board width: `min(screenWidth − 32, 420)`.
- Blocks: gradient body, sheen, glint and a 2-3px darker bottom lip. No drop shadows on cards; separate surfaces by tone.

### Layout (game screen, portrait)

```
┌───────────────────────────┐
│ ‹  Classic          ⏸     │  top bar: back, mode, pause
│                           │
│          12,480           │  score (Unbounded 56)
│        best 31,020        │  inkMuted
│                           │
│   ┌───────────────────┐   │
│   │                   │   │
│   │    8×8 board      │   │  hero, centered
│   │                   │   │
│   └───────────────────┘   │
│                           │
│  [hold]  [p1] [p2] [p3]   │  tray at 55%, or smaller if the piece would not fit its slot, thumb zone
└───────────────────────────┘
```

Blitz adds a thin timer bar under the top bar. Adventure replaces "best" with a goal chip row and a moves counter.

### Copy
- Buttons say exactly what happens: "Play again", "Keep playing", "Next level", "Try again".
- Game Over: show score, best, and one highlight ("Best combo this game: ×6"). No sad messaging.
- Empty states invite action: "No scores this week yet. Play Blitz to take the top spot."

---

## 10. Feel requirements

These are required and acceptance-tested by hand on a real device.

- **60fps** during drag and clears on a mid-range Android device. Drag runs entirely on the UI thread (Reanimated shared values plus a Gesture Handler `Pan`). No React state updates per frame.
- **Lift & offset:** on pickup, the piece scales from 55% to 100% over 120ms (spring) and floats so its bottom edge sits **1 cell height above the touch point**. The finger must never cover the piece.
- **Ghost preview:** while hovering a valid spot, draw the piece outline at 35% opacity on the snapped position. Lines that would clear get a soft highlight on their cells. An invalid spot shows no ghost.
- **Drop:** a valid drop snaps in 90ms. An invalid drop springs back to the tray over about 220ms with no haptic.
- **Clear wave (signature moment):** cleared cells scale to 0 and fade over 220ms, **staggered 18ms per cell by distance from the placed piece's center**, so the clear ripples outward from where you played.
  - **Glint flash:** before each cell shrinks, a white overlay rises to 0.7 over 50ms, then falls as the cell scales to 0 and fades. *Reduce Motion:* flash only, no stagger.
  - **Expanding ring:** a stroked ring (3dp, white at 0.35) expands from the placement center to the board diagonal over `maxDelay + 220`ms, fading out and clipped to the board. *Reduce Motion:* no ring.
  - **Line beams:** each cleared row/column flares white (0.35) and collapses to a seam over 320ms. *Reduce Motion:* fade only.
  - **Shards:** after the glint, each cell bursts into 4 glaze shards that fly away from the placement center with gravity over 420ms. *Reduce Motion:* none.
  - **Board shake:** 1.5px for one line, +1.5px per extra line (max 6px), decaying over 320ms. *Reduce Motion:* none.
  - **Perfect Clear:** a diagonal light sweep (500ms) sweeps across the empty board with a "Clean sweep" label springing in at center. *Reduce Motion:* fade only, no sweep.
- **Score popup:** floating text (e.g. "+300" in Figtree 600 16 `ink`, Saffron for mono, accent for perfect clear) at the clear centroid, rises 24dp and fades over 600ms. *Reduce Motion:* fade only.
- **Score ticker:** counts up over 400ms (ease-out). The combo label ("×3") pops in with a spring near the clear and fades after 700ms.
- **Adventure goals:** a collected gem arcs from its cell into the gems goal chip (620ms, staggered 90ms); the chip count ticks up and bumps on arrival with a `Rigid` haptic. When a goal is met (`goalCompleted`, after the last gem lands for gems) the chip pops, turns `success`, and throws a ring and sparks with a Success haptic. The level-complete sheet waits 1200ms so this plays. *Reduce Motion:* fades only, sheet waits 400ms.
- **Game-over grey-out:** board tiles grey out row-by-row from top to bottom (60ms/row, tiles lerp to `cellEmpty` over 180ms) before the game over sheet appears. *Reduce Motion:* one 150ms fade.
- **Reduce Motion:** stagger 0, no pulse, fades only, and durations halved.
- **Haptics** (via `services/feedback.js`, respecting settings):

| event | haptic |
|---|---|
| pickup | `selectionAsync` |
| place | `impactAsync(Light)` |
| clear 1–2 lines | `impactAsync(Medium)`, then a fading rumble (55ms steps) |
| clear 3+ lines | `impactAsync(Heavy)`, then a longer fading rumble |
| clear on combo ≥ 2 | plus one `Rigid` tick per combo level above 1 (max 3) |
| gem lands in chip | `impactAsync(Rigid)` |
| goal met (not the last) | `notificationAsync(Success)` |
| perfect clear | `notificationAsync(Success)` |
| achievement | `notificationAsync(Success)` |
| game over | `notificationAsync(Warning)` |

- **Sound:** short, soft, CC0 tones. The clear sound's pitch rises by one step per combo level, capped at 6. Everything is preloaded at startup and stays silent when the device is on silent (iOS: respect silent mode).
- **Background music** (`services/music.js`, started once in the root layout): one looping track per screen family — `home` (Home, Classic, menus), `blitz`, `adventure` — picked from the route. Switching screens pauses the old track and resumes it on return (no restarts, never two at once). Pauses when the app backgrounds. Music toggle and Low/Medium/High volume live in Settings.
- **Onboarding:** the first Classic game ever starts from a scripted board where a single obvious drag clears a line within 3 seconds. A single hand-hint animation plays, with no text walls.
- **Pause** freezes the Blitz timer. The app going to background auto-pauses and saves.

---

## 11. Build phases

Work phase by phase. Finish, test, and commit each before starting the next. Phases marked ∥ can run in parallel in separate git worktrees.

**Phase 0 — Scaffold**
- expo-router set up; `app/_layout.js` loads fonts, wraps in `GestureHandlerRootView`, and applies the theme.
- `theme.js` with all tokens; `useSettings`/`useProgress` stores with persistence.
- Placeholder screens for every route; Home navigates to all of them.
- Jest configured; one passing test.

**Phase 1a ∥ — Engine**
- `rng`, `pieces`, `board`, `scoring`, `generator`, `game` with Hold, and Classic mode.
- Tests cover placement validity, simultaneous row+col clears, lock hp, combo reset after 3 misses, mono detection, perfect clear, fairness guarantee, and game-over including the held piece.

**Phase 1b ∥ — Board & drag UI** (against a stub engine if 1a isn't merged)
- Skia board and pieces, tray, and Hold slot.
- Drag with lift/offset, ghost preview, snap and spring-back.

**Phase 2 — Classic, fully playable**
- `useGameController` wires engine, gestures, and feedback.
- Clear wave, score ticker, combo label, haptics, and sounds.
- Game Over screen, resume after app kill, and onboarding board.

**Phase 3a ∥ — Blitz + Adventure**
- Blitz timer, speed bonus, and timer bar.
- Adventure engine mode, level loader, map screen, and results with stars.
- Level scripts; 50 verified levels.

**Phase 3b ∥ — Meta**
- Stats and achievements engine with tests, toasts, and the Stats, Achievements, and Settings screens.
- Colorblind mode and Reduce Motion.

**Phase 4 — Backend**
- Supabase client, anonymous auth, migrations, and Edge Functions.
- Sync with merge (tested), leaderboard screen with offline queue, and Profile (rename, link email/Apple, delete account).
- Requires a dev build for Apple auth.

**Phase 5 — Release**
- App icon: night-slate square (`#0E1218`) holding the Home brand mark: the five glazed tiles from `BrandMark` (Jade, Cobalt, Persimmon, Saffron, Iris) at their Home positions and tilts, with lip, sheen and glint. Adaptive icon with `#0E1218` background (cluster inside the 66dp safe circle) plus a monochrome layer, 1024px PNG for iOS. Regenerate with `python3 scripts/gen-icon.py`.
- Splash: `bg` per scheme (`#F4F1EC` / `#0E1218`) with the same five-tile mark at about 160dp (no text), held until fonts load, then fading into Home over 300ms with the Home brand mark in the same spot.
- Store screenshots (dark): mid-game with glint wave and "×3", Home with Continue card, Adventure trail, Blitz board at 0:09 in `danger`, achievements grid. Short captions in Figtree 600.
- `eas.json` with a `preview` profile (`android.buildType: "apk"`) and a `production` profile.
- README (screenshots, build instructions, how to self-host Supabase), LICENSE (MIT), CREDITS.md, and a privacy policy page (GitHub Pages).

---

## 12. Definition of done (every task)

- Works in light and dark themes, and on small (iPhone SE size) and large screens.
- No yellow-box warnings, no console errors.
- `npm test` passes; new engine logic has tests.
- Respects settings (sound, haptics, reduce motion, colorblind).
- No new dependency without justification.
- Commit message says what changed and why.
