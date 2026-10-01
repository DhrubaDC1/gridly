UI redesign, batch 2 of 4: board rendering. Run only after batch 1 is merged and checked on the phone.
Performance rule for every task here: no React state updates per frame, no Blur or Shadow on individual tiles, and the board must still hold 60fps.

=== TASK: ui-board-sockets ===
Read docs/UI_REVIEW.md section 6.2 (Well, Sockets, Perf) and task T09. Open src/ui/components/Board.js and src/ui/boardLayout.js.
Draw the well as a rounded rect (radius 20) in theme.well with a child inner Shadow (dx 0, dy 1.5, blur 3, color theme.wellShadow, inner). Draw each empty cell as a socket: fill theme.cellEmpty with the cell radius (cellSize * 0.16), a 1px line along the inner top in theme.socketTop, and a 1px line along the inner bottom in theme.socketBottom. Record the well and all 64 sockets once with Skia's createPicture, memoized on board size and dark mode, and draw them as a single Picture. Placed tiles still draw on top. If createPicture does not behave in this Skia version, fall back to plain nodes and note it in a code comment. Update tests.
Acceptance: empty cells look pressed into the board and recede into the background; placed blocks stand out; dragging stays smooth.

=== TASK: ui-glazed-tiles ===
Read docs/UI_REVIEW.md section 6.2 (Tiles, Ghost, Colorblind) and task T10. Open src/ui/components/Cell.js and Piece.js.
Draw each normal tile with four layers using theme.glaze[colorIndex] (s = cell size, e = max(2, round(s * 0.06)), r = s * 0.16):
1. rounded rect (x, y, s, s) filled with glaze.edge (the bottom lip);
2. rounded rect (x, y, s, s - e) with a vertical linear gradient from glaze.top to glaze.base;
3. a sheen rounded rect at (x + 2, y + 2) sized (s - 4) by ((s - e) * 0.45), radius r - 2, with a vertical gradient from glazeFx.sheenFrom to glazeFx.sheenTo;
4. a glint rounded rect at (x + s * 0.14, y + s * 0.12) sized (s * 0.22) by (s * 0.07), radius s * 0.035, in glazeFx.glint.
Below 14pt cells skip the sheen and glint. The ghost is the glaze base at 0.28 opacity plus a 2px stroke in glaze.top at 0.8 opacity, with no sheen or glint. Delete every adjustBrightness call from the render path. Colorblind glyphs are drawn in glaze.glyphInk. Piece.js uses the same drawing so tray pieces match. Update tests.
Acceptance: blocks look like glossy tiles with a darker bottom lip and a small highlight top-left, in light and dark; the ghost is translucent; colorblind glyphs are visible on yellow tiles.

=== TASK: ui-gem-lock ===
Read docs/UI_REVIEW.md section 6.2 (Gem, Lock hp 2, Lock hp 1) and task T11. Open src/ui/components/Cell.js, Board.js, src/ui/theme.js (lockBase should already exist) and src/game/useGameController.js for the lockCracked event.
Gem: keep the glaze tile; draw a diamond of side s * 0.42 from four facet triangles in white at opacities 0.95, 0.75, 0.55, 0.80 (top-left, top-right, bottom-right, bottom-left) with a 1px outline in glaze.edge; add a 4-point sparkle (size s * 0.12) at the diamond's top right whose opacity is driven by ONE board-level shared value twinkle (withRepeat withTiming 1200ms, reversed) mapped 0.3 to 0.9. With Reduce Motion the sparkle is fixed at 0.6.
Lock hp 2: tile base mixed toward grey using glaze.lockBase, an inset frame (rect inset 2, stroke 2.5, white 0.85 in light, #E9ECF2 at 0.9 in dark) and the Icon "lock" path scaled to s * 0.45 in white 0.9.
Lock hp 1: the normal glaze tile plus a crack path with points (0.22s,0.18s) to (0.48s,0.46s) to (0.40s,0.62s) to (0.78s,0.84s) and a branch from (0.48s,0.46s) to (0.70s,0.36s), stroke 1.5, white 0.7. On the lockCracked event animate the crack drawing on over 160ms and shake that tile plus or minus 2px for 120ms; with Reduce Motion the crack appears instantly, no shake.
Update tests.
Acceptance: level 11 or later shows sparkling gems and padlocked tiles; after one clear a lock shows a crack instead of the padlock.

=== TASK: ui-backdrop ===
Read docs/UI_REVIEW.md section 6.5 and task T21.
Create src/ui/components/Backdrop.js: one static Skia Canvas, absolutely positioned behind content with pointerEvents "none", drawing a full-screen vertical gradient from theme.bg (top) to theme.bgDeep (bottom) plus a radial gradient from theme.spotlight to transparent centered behind the board area with radius 0.7 times the screen width. It must render once and never re-render during play (memoize, no animated props). Mount it behind the content in src/ui/GameScreen.js and app/index.js. First check whether React Native's own gradient background style works on this version; only use it if it does, otherwise use the Skia canvas. Update tests.
Acceptance: a soft brighter area behind the board makes it feel lit; no frame rate change.
