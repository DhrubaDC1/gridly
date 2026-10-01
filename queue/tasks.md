Queue preamble (ignored by the runner; only text after a "=== TASK:" line is used).
Tasks run in order and each builds on the previous ones. If you already finished
the first two tasks by hand, delete them from this file before running.

=== TASK: onboarding-pause ===
Read AGENTS.md section 10 (Onboarding, Pause) and section 5, then read src/engine/game.js, src/game/useGameController.js and app/classic.js.

1. Scripted first game. Add an optional `initial` argument to createGame in src/engine/game.js: { board, tray }. When given, it uses that board and tray instead of generating them (the RNG still seeds everything after that). This is additive: existing behavior and tests must stay identical. Add a test for it.
   Create src/game/onboarding.js exporting a scripted initial state: a board where row 7 is filled except for the last 3 cells in that row, and a tray containing a 1x3 horizontal line piece plus two other small pieces that all fit somewhere. One obvious drag of the 1x3 piece clears the row. Add a test that placing the 1x3 piece in the right spot clears a line.

2. Add seenOnboarding: false to useSettings (persisted). When the player starts Classic, seenOnboarding is false and there is no saved game in progress, start from the scripted state. Set seenOnboarding to true after their first line clear. Show one hand-hint animation: a small circle that slides from the 1x3 piece to the target cells and loops until the player starts dragging, then disappears. No text.

3. Pause. Add a pause button to the top bar of Classic (theme colors, 44pt touch target, accessibilityLabel). It opens src/ui/components/PauseMenu.js with three buttons: "Resume", "Restart", "Quit to home". The board is hidden or dimmed while paused.

4. Auto-pause. When the app goes to the background (AppState), open the pause overlay and save the game to inProgress. Keep the pause state in the controller so a Blitz timer can read it later.

=== TASK: game-over ===
Read AGENTS.md section 9 (Layout, Copy) and section 10, then read the Game Over overlay in app/classic.js and src/store/useProgress.js.

Replace the simple Game Over overlay with src/ui/components/GameOver.js:
1. Final score in Unbounded 40, best score underneath, and a "New best" line when this game beat the previous best (sentence case, no all-caps).
2. One highlight stat: perfect clears if above 0, otherwise best combo if 2 or higher, otherwise lines cleared. Examples: "Best combo this game: x6", "Perfect clears: 2", "Lines cleared: 14". No sad or apologetic messaging.
3. "Play again" is the dominant primary button (full width, accent). "Home" is a secondary text button underneath.
4. The card fades and rises over 250ms (fade only with Reduce Motion). Call feedback.onGameOver once.
5. Update the best Classic score in useProgress once per game (not on every render) and clear inProgress.classic.
Write a pure helper in src/game/ that picks the highlight stat from a stats object, and test it.

=== TASK: settings-screen ===
Read AGENTS.md sections 7 (settings shape), 9 and 10, then read src/store/useSettings.js, src/ui/useReduceMotion.js and src/services/feedback.js.

Build app/settings.js. Rows, each with a plain label and a control, all touch targets at least 44pt with accessibilityLabel:
- Sound (switch), Haptics (switch), Colorblind mode (switch).
- Theme: a 3-option segmented control: System, Light, Dark.
- Reduce motion: a 3-option segmented control: System, On, Off.
Create src/ui/components/Segmented.js for the segmented control (theme colors, radius 14). Use React Native's Switch for the switches, tinted with the theme accent.
Wire everything to useSettings. Make sure: the theme override already used by useTheme works live; useReduceMotion honors the 'on' and 'off' settings (system follows the OS); the Classic screen passes the colorblind setting into Board. Add tests for useReduceMotion's setting handling if it has tests already, extending them.

=== TASK: stats-engine ===
Read AGENTS.md section 7 (Stats), then read src/store/useProgress.js and the stats object produced by src/engine/game.js.

Create src/engine/stats.js (pure JS, no React): createStats() returning the zero-valued stats object with every field listed in AGENTS.md section 7 (games played per mode, best score per mode, total lines cleared, best combo, perfect clears, mono lines, total pieces placed, holds used, total play time ms, current streak, best streak, lastPlayedDay as YYYY-MM-DD or null), and applyGameResult(stats, result) returning a new stats object, where result = { mode, score, game: <the game's own stats object>, durationMs, dayKey }.
Streak rules: same day as lastPlayedDay leaves the streak unchanged; the next calendar day increments it; any other gap resets it to 1; bestStreak is the max. Compute day differences from the YYYY-MM-DD strings with Date.UTC (no clock access).
Make useProgress use createStats() as its initial stats value without changing the persisted shape for existing keys. Write tests for every field, the streak transitions (same day, next day, gap, month and year boundaries), and that inputs are never mutated.

=== TASK: achievements-engine ===
Read AGENTS.md section 7 (Achievements table) and section 5 (Events), then read src/engine/stats.js.

Create src/engine/achievements.js (pure JS): export ACHIEVEMENTS, an array of { id, name, description } for exactly the 25 ids in the AGENTS.md table, with friendly sentence-case names and plain descriptions (for example perfect is named "Clean sweep"). Export evaluate(events, stats, context) returning an array of newly unlocked ids, where context = { unlocked: { [id]: isoDate }, mode, score, adventureLevel } (adventureLevel is the level just completed or null). Ids already in context.unlocked are never returned again. Event-based ids use the events (cleared with linesCount and mono, combo with count, perfectClear); stat-based ids use stats (games, lines, holds, streak, stars); score-based ids use context.score and context.mode.
Write tests for each family of conditions: one clear, double, quad, each combo threshold, perfect and perfect_5, mono and mono_10, every classic and blitz score threshold, adventure levels, total stars, games played, lines, holder, streak_7, and that already-unlocked ids are skipped.

=== TASK: wire-progress ===
Read AGENTS.md section 7 and section 10 (Haptics, achievement toast), then read src/game/useGameController.js, src/engine/stats.js, src/engine/achievements.js, src/store/useProgress.js and src/services/feedback.js.

1. In the controller, after every successful place(), call evaluate(events, currentStats, { unlocked, mode, score, adventureLevel: null }) and store newly unlocked ids in useProgress achievements with an ISO date string taken from new Date() in the controller (never in the engine). For each new id call feedback.onAchievement().
2. When a game ends, call applyGameResult with the game's stats, the mode, the score, the duration (measured by the controller from start to end, excluding paused time) and today's local day as YYYY-MM-DD, store the result in useProgress stats, then run evaluate once more with an empty events list so stat-based achievements unlock.
3. Create src/ui/components/Toast.js and a small toast queue in a zustand store or the controller: when an achievement unlocks, show a toast at the top ("Achievement unlocked" plus the achievement name) for 2.5s, fade only with Reduce Motion, queued one after another. Mount it once in app/_layout.js.
4. Tests for the pure parts (the function that builds a game result from state, and the toast queue ordering).

=== TASK: stats-achievements-screens ===
Read AGENTS.md section 9, then read src/store/useProgress.js and src/engine/achievements.js.

1. app/stats.js: stat cards from useProgress stats: best score per mode (Classic, Blitz), games played, total lines cleared, best combo, perfect clears, average Classic score (games and score totals; show a dash when there are no games), total play time formatted like "3h 12m", and current and best day streak. Cards use theme surface tone, no drop shadows, and an empty-state line when no games were played: "Play a game to start your stats."
2. app/achievements.js: a scrollable list of all 25 achievements: unlocked ones show the name, description and unlock date; locked ones are dimmed with the description still visible. Header shows "X of 25 unlocked".
3. Home links should already point here; verify they work and the Back buttons work.
Put shared formatting helpers (play time, dates) in src/game/format.js and test them.

=== TASK: blitz-engine ===
Read AGENTS.md section 6 (Blitz) and section 5, then read src/engine/game.js and src/engine/modes/classic.js.

Create src/engine/modes/blitz.js (pure JS): createBlitzGame(seed) returning a normal game state with mode 'blitz' plus timeLeftMs: 90000, lastPlaceAtMs: null. Export tick(state, elapsedMs) which subtracts elapsed time (never below 0) and, at 0, returns the state with over: true, overReason 'timeUp' and a gameOver event. Export placeBlitz(state, source, row, col, nowMs) which delegates to the existing placePiece, then: adds 2000ms per cleared line to timeLeftMs capped at 120000; if the previous placement was within 1500ms (nowMs - lastPlaceAtMs <= 1500) adds 50% of that placement's score delta to the score and updates the scored event's delta and total accordingly; stores lastPlaceAtMs = nowMs. Time and clock always come from the caller. Do not change the behavior of existing Classic functions; if a hook in game.js is needed, make it additive and keep every existing test passing.
Tests: timer subtracts and clamps, timeUp ends the game, clears add time with the cap, the speed bonus applies only inside 1500ms, same seed and moves are deterministic, serialization round-trips with the new fields.

=== TASK: blitz-screen ===
Read AGENTS.md sections 6, 9 and 10, then read app/classic.js, src/game/useGameController.js and src/engine/modes/blitz.js.

1. Extract the shared game UI from app/classic.js into src/ui/GameScreen.js, parameterized by mode ('classic' or 'blitz'), so Classic and Blitz share the board, tray, hold, pause, game over and feedback code. Classic behavior must stay identical. app/classic.js becomes a thin wrapper.
2. Extend the controller so mode 'blitz' uses createBlitzGame and placeBlitz, with the clock supplied by the controller. A timer ticks every 100ms using the real elapsed time, pauses when the game is paused or the app is backgrounded, and calls the engine's tick.
3. app/blitz.js renders GameScreen in blitz mode. Under the top bar, show a thin timer bar (theme accent, fills proportional to timeLeft out of 120000) driven by a Reanimated shared value, plus the seconds remaining as text. Blitz Game Over says "Time's up" when overReason is timeUp. Blitz does not save an in-progress game: always start fresh.
4. Update best Blitz score in useProgress on game end, once per game.
5. Tests for the pure parts only (timer math helper, mode selection in the controller).

=== TASK: adventure-engine ===
Read AGENTS.md section 6 (Adventure), then read src/engine/game.js, src/engine/board.js and src/engine/modes/blitz.js for the wrapper pattern.

1. Create assets/levels/levels.json with 12 hand-authored levels using the schema in AGENTS.md section 6 (id, seed, board rows with . X G L, goals, optional moves, stars thresholds). Levels 1-4 teach basic clears and have a score or lines goal; 5-8 add gems; 9-12 add locks and one move limit. Keep every level beatable by a reasonable player.
2. Create src/engine/modes/adventure.js (pure JS): parseLevel(level) builds the starting board (X gets colors from the level seed, G gem, L lock with hp 2); createAdventureGame(level) returns a game state with mode 'adventure', the level id, goals progress and movesLeft; placeAdventure(state, source, row, col) delegates to placePiece, updates goal progress from the events (gemCollected, cleared lines, score), decrements movesLeft, and emits levelComplete { stars } when all goals are met (stars from score thresholds, minimum 1) or gameOver with reason outOfMoves or noMoves when it cannot be completed. Export validateLevel(level) that returns a list of problems (bad dimensions, unknown chars, goal of gems with no gems, stars not ascending, and so on).
3. Tests: parseLevel for each character, goal progress for each goal type, stars thresholds, move limit failure, noMoves failure, and a test that all 12 levels in levels.json pass validateLevel. Do not change existing rules in game.js; any hook must be additive.

=== TASK: adventure-screens ===
Read AGENTS.md sections 6, 7 (adventure save shape), 9 and 10, then read src/ui/GameScreen.js, src/game/useGameController.js, src/engine/modes/adventure.js, and src/store/useProgress.js.

1. app/adventure/index.js: a level map as a scrollable grid of level nodes (clean and minimal, theme colors). Each node shows the level number and its 0-3 stars; locked levels (above adventure.unlocked) are dimmed and not tappable. Tapping an unlocked level opens app/adventure/[level].js.
2. app/adventure/[level].js: renders GameScreen in adventure mode for that level id. Replace the best-score line with goal chips (for example "Collect 3 gems", "Reach 1500") that show progress, plus a moves-left counter when the level has moves. Extend the controller to support adventure mode with createAdventureGame and placeAdventure.
3. On levelComplete: save stars (keep the maximum per level), best score, unlock the next level, run achievement evaluation with adventureLevel set, and show a result card with the stars earned and buttons "Next level" (dominant), "Replay" and "Map". On failure show "Out of moves" or "No moves left" with "Try again" as the dominant button and "Map" secondary.
4. Adventure does not save in-progress games.
5. Tests for the pure parts (goal chip text builder, star saving rule keeping the max, unlock rule).
