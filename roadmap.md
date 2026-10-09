# TUHK — big content update

User picked (all options): story ending + boss, achievements, companion (Väike Tom), more world content, visual travel map, item detail popups, new-player tutorial, polish pass.

- [x] data.ts: new items (fish, voidshard, sealer), dungeon regions (depths1-3), enemies (lurker, hollow, boss heart), sealer recipe
- [x] engine.ts: state fields (ach, tut, sealed, seenEnding, tomDay), fishing action, companion assist, boss rare spawn, sealRift, checkAch + ACHIEVEMENTS, save migration, new quests
- [x] Game.tsx: achievements tab, SVG travel map, item detail modal, tutorial checklist, fishing + seal buttons, ending overlay, combat hit FX, companion UI
- [x] Online.tsx: achievements + ending bonus in score
- [x] styles.css: hit/pulse/fade animations
- [x] Verified: build OK, Playwright smoke tests pass (map, popup, tutorial, fishing, seal, ending, achievements)
- [x] AI hint radio (Vihjed tab) using game state context via server function
- [x] Settings: text size, contrast, reduced motion (saved per device)
- [x] Daily quests, statistics tab, weather effects, sound toggle
- [x] Player chat (global + clan, realtime), weekly community challenge
- [x] Base depth: 4 new structures, higher levels, defense panel, raids damage walls
- [x] Compass/minimap in region panel
- [x] Pets (tame weakened mutts), crafting tree view, KOIDIK codex fragments
- [x] Bar (shop, sell junk, contracts, 4 minigames, caps currency), player request board, kennel + pet breeding

# TUHK 2.0 (user plan, first wave)
- [x] Expeditions (multi-stage, retreat/push, weekly goal)
- [x] Perk tree (3 branches) + relics with random affixes
- [x] "Täna" overview screen
- [x] Factions + reputation, NPC story chains with choices, daily world events, collections, New Game+
- [x] Clan territories (server-owned, bonuses) + monthly shared seasons (cloud + self-host)
- [x] Gather/explore/fish/hunt moved from Base to Map; 5 dailies, Tuhkade tee 30-day path, secrets + knowledge journal
- [x] Visuals + audio pass: sound engine (blips, per-region ambience, base music, log-line sounds), player portrait, night/weather overlays, journal icons, screen shake + dust impacts, button press feel, rift + clan pictures

# Presentation refinement
- [ ] Add visual HUD meters with semantic colors and color-code journal event types; verify in the game.
- [x] Remove distracting background overlays and increase right-hand journal text.
- [x] Redesign equipment presentation without changing equipment rules.
- [x] Suggest faction-specific missions, exclusive equipment and consequential alliances (ideas only).
