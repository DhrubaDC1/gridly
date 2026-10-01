UI redesign, batch 1 of 4: bug fixes and foundation. Text before the first TASK line is ignored by the runner.
Source of truth for every value: docs/UI_REVIEW.md. Chosen direction: "Glaze".

=== TASK: ui-amend-agents ===
Read docs/UI_REVIEW.md sections 6.1, 6.2, 6.4, 6.7, 6.8 and 9. Edit AGENTS.md only; change no other file.
Apply exactly the changes listed in section 9 of the review:
- Section 9 colors: replace the light and dark tokens and the block palette with the Glaze set from 6.1, and add the new tokens (onAccent, surfaceSunken, line, danger, success, scrim, spotlight, bgDeep, star).
- Section 9 blocks: describe the block treatment as gradient body, sheen, glint and a 2-3px darker bottom lip. Colorblind glyph opacity becomes 45-55% with a per-color ink.
- Section 9 tray: "55%, or smaller if the piece would not fit its slot".
- Section 9 shape: cell radius is 0.16 times the cell size, card radius 18.
- Section 10: add the glint flash, expanding ring, score popup and game-over grey-out, each with its Reduce Motion fallback (see 6.4 and 6.7).
- Section 11 Phase 5: add the icon and splash concept from 6.8.
- Section 3: make sure there is a row for expo-asset (peer dependency of expo-audio).
Add one short new section near the top called "UI refresh" saying docs/UI_REVIEW.md is the visual source of truth for the Glaze direction. Leave everything else unchanged.

=== TASK: ui-tokens ===
Read docs/UI_REVIEW.md section 6.1 and open src/ui/theme.js.
Replace the color tokens with the exact values from the code block in 6.1 (lightColors, darkColors, glazes, glazeFx). Keep every export name, hook and shape that other files already import, so nothing breaks. The resolved theme must still expose everything it did before (bg, surface, well, cellEmpty, ink, inkMuted, accent, blocks) and additionally expose all the new tokens, onAccent, and glaze (the current scheme's array of { name, glyph, base, top, edge, glyphInk }). blocks stays equal to the base colors. For each glaze also compute lockBase by mixing base 50% toward #8A8F99. Set radius tokens: board 20, cell = cellSize * 0.16 (export a helper), button 14, card 18, sheet 24, chip 999.
Update any existing tests that assert old hex values. Do not restyle any component in this task.

=== TASK: ui-overlays-modal ===
Read docs/UI_REVIEW.md bug B1 and B2 and task T01, then open src/ui/components/PauseMenu.js, src/ui/components/GameOver.js and src/ui/GameScreen.js.
StyleSheet.absoluteFillObject no longer exists in this React Native version, so the overlays are not covering the screen. Fix both overlays: wrap each overlay in a React Native Modal with visible, transparent, animationType "none", statusBarTranslucent, navigationBarTranslucent and onRequestClose (resume for pause, home for game over). Replace every absoluteFillObject in the whole src and app folders with StyleSheet.absoluteFill (search for all uses). The scrim color is theme.scrim. While paused, set both the board and the tray to opacity 0 in GameScreen so the player cannot plan during a Blitz pause. Update tests that break.
Acceptance: pausing in Classic or Blitz shows a full-screen scrim, including over the header; the sheet is fully visible with all three buttons; nothing behind it moves; the Android back button resumes; Game Over shows its whole card over a full-screen scrim.

=== TASK: ui-onaccent ===
Read docs/UI_REVIEW.md bug B7 and task T03.
Every text or icon drawn on an accent-colored fill must use theme.onAccent instead of hard-coded white: app/index.js, src/ui/components/PauseMenu.js, GameOver.js, Segmented.js, HandHint.js and any other file you find by searching for "#FFFFFF", "#fff" and "white" near accent backgrounds. Secondary text on accent uses onAccent at 0.8 opacity. Replace the hard-coded red "#E05D5D" with theme.danger. Also change the lock ink colors hard-coded in Cell.js to theme tokens. Update affected tests.
Acceptance: in dark mode, text on the periwinkle buttons ("Play Classic", "Resume", "Play again", "Next level") is dark and crisp.

=== TASK: ui-icons ===
Read docs/UI_REVIEW.md section 6.6 and task T04.
Build a dependency-free icon system.
1. Write scripts/fetch-icons.js (plain node, no packages). For each name in the list below it downloads https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/NAME.svg, converts each SVG element (path, circle, line, polyline, polygon, rect with optional rx) into SVG path-data strings on a 24 by 24 grid, and writes src/ui/icons.js exporting an object { name: [pathString, ...] }. If a download fails or a name has been renamed in Lucide, draw that icon yourself from simple geometry in the same 2px round-cap style and note it in a comment. Run the script and commit its output.
Names: arrow-left, pause, play, rotate-ccw, house, trophy, award, chart-column, settings, user, star, lock, check, timer, map, volume-2, vibrate, eye, sparkles, zap, flame, palette, grid-3x3, rows-3, arrow-left-right, gem, footprints.
2. Create src/ui/components/Icon.js: props name, size (default 24), color, strokeWidth (default 2). It renders a Skia Canvas of size by size, scales the 24-unit paths, draws them as stroked paths with round caps and joins, parses each path once at module load with Skia.Path.MakeFromSVGString, and marks the wrapper accessible={false} (the parent carries the label). The "star" icon is drawn filled.
3. Add Lucide (ISC license) with its repository link to CREDITS.md.
4. Add a test that every name resolves to at least one valid path string.
Do not use the icons anywhere yet.

=== TASK: ui-pause-back ===
Read docs/UI_REVIEW.md bugs B4, B5, B11 and task T05. Open src/ui/GameScreen.js, app/_layout.js, app/stats.js, app/achievements.js.
- The pause button currently renders the emoji character and shows orange on Android. Replace it with a 40pt circle filled with theme.surfaceSunken containing Icon "pause" size 20 in theme.ink, with a 44pt hit area and an accessibilityLabel.
- Create src/ui/components/BackButton.js: Icon "arrow-left" size 24 in theme.ink inside a 44 by 44 pressable with accessibilityLabel "Back"; it calls router.back() when router.canGoBack() is true, otherwise router.replace('/').
- In app/_layout.js set screenOptions headerTitleAlign 'center' and headerLeft returning the BackButton (the Home screen keeps headerShown false). Delete the custom headerLeft code in app/stats.js and app/achievements.js.
Acceptance: every screen has the same arrow icon and a centered title; the pause button is ink-colored, not orange.

=== TASK: ui-tray-fit ===
Read docs/UI_REVIEW.md bugs B3 and B8 and task T06. Open src/ui/components/TraySlot.js and HoldSlot.js.
Replace every hard-coded 0.55 rest scale with a per-piece value: restScale = min(0.55, (slotWidth - 16) / pieceWidth, (slotHeight - 16) / pieceHeight), where pieceWidth and pieceHeight are the piece's size at full scale. The lift animation interpolates from restScale to 1. Set the idle elevation to 0 (use 9999 only while dragging) in both files so no Android shadow appears. Add a pure helper for restScale with unit tests, including the 1x5, 5x1, 3x3 and 1x1 pieces.
Acceptance: 1x5 and 5x1 pieces sit fully inside their slots; dragging still lifts to full size with the bottom edge one cell above the finger; Hold has no shadow.

=== TASK: ui-tray-sockets ===
Read docs/UI_REVIEW.md section 6.3 (Tray and hold) and task T07. Open src/ui/components/TraySlot.js, HoldSlot.js, Tray.js and src/ui/GameScreen.js.
Remove the opaque white and slate slot cards. Each slot becomes a socket: background theme.surfaceSunken (opacity 0.6 in light, 1.0 in dark), radius 16, no border. An empty slot shows only the faint socket. Hold has the same socket plus a 1.5pt dashed border in theme.line; move the "Hold" label (Figtree 12, theme.inkMuted) below the socket with a 4pt gap; when the slot is empty show Icon "arrow-left-right" size 18 in theme.inkMuted centered in it. When Hold is locked (already used this turn) show the socket at 0.4 opacity with a 14pt Icon "lock" in the top right, and keep the accessibilityLabel "Hold slot, locked". Hover state keeps the existing accent border and accentSoft fill. Update tests.
Acceptance: no white boxes behind tray pieces, empty slots are subtle, Hold reads as distinct.

=== TASK: ui-game-layout ===
Read docs/UI_REVIEW.md section 6.3 (Game top bar) and task T08. Open src/ui/GameScreen.js and src/ui/components/ScoreTicker.js.
Fix the dead vertical band: wrap the score block in a view with flex 1 and justifyContent 'center'; place the board and tray in a bottom group with a 20pt gap between them, above the existing bottom inset. Turn "best 3,143" into a chip: theme.surfaceSunken background, radius 999, padding 4 vertical and 10 horizontal, Icon "trophy" size 12 plus the text "Best 3,143" (Figtree_500Medium 14, theme.inkMuted), with thousands separators. Set the ScoreTicker letterSpacing to -0.5. Keep the Adventure goal chip row and moves counter working. Update tests.
Acceptance: on tall and short screens the score sits centered in the space above the board, with no large empty band.

=== TASK: ui-level-guard ===
Read docs/UI_REVIEW.md bug B6 and the guard part of task T18. Open app/adventure/[level].js and src/store/useProgress.js.
A deep link can open a locked or nonexistent level. Add a guard: read adventure.unlocked from useProgress; if the level id is not present in assets/levels/levels.json or is greater than unlocked, render <Redirect href="/adventure" />. Wait for the persisted store to hydrate first (use useProgress.persist.hasHydrated() and onFinishHydration) and render null until then, otherwise a cold deep link redirects before the save loads. In dev builds (__DEV__) the "Unlock all levels" shortcut must still work. Extract the decision into a pure function (canOpenLevel(levelId, unlocked, totalLevels)) and test it.
