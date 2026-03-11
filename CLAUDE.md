# Streets of Rainy City

## Project Overview
A beat-em-up arcade game built with Kaplay (JS game framework) for the RCade arcade cabinet at the Recurse Center. Players fight through waves of enemies using kung-fu to rescue their kidnapped girlfriend from the Followers of Baal — before the pizza gets cold.

## Tech Stack
- **Framework**: Kaplay v3001.0.19
- **Build**: Vite 7.2.4
- **Language**: TypeScript 5.9.3
- **Platform**: RCade arcade cabinet (336x262 canvas)
- **Input**: `@rcade/plugin-input-classic` for arcade controls, keyboard fallbacks

## Project Structure
```
streets-of-rainy-city/         # Game source (inner directory)
├── public/                    # Static assets (startscreen.png, jennifer.png, kyle.png)
├── src/
│   ├── main.ts                # Single-file game (all scenes, logic, rendering)
│   └── style.css              # Canvas styles
├── index.html
├── vite.config.js
├── tsconfig.json
├── rcade.manifest.json
└── package.json
```

## Development
```bash
cd streets-of-rainy-city
npm install
npm run dev        # Vite on port 5173 + RCade emulator
npm run build      # Output to dist/
```

## Game Architecture (all in src/main.ts)
- **Scenes**: title → intro (story crawl) → game → gameover
- **Title scene**: Uses startscreen.png as background image
- **Intro scene**: Scrolling text crawl of the story, skippable
- **Game scene**: 5-wave beat-em-up with scrolling camera
- **Combat**: 3-hit combo system, jump kicks, knockback, hit flash
- **Enemies**: Single type with AI (aggro range, chase, punch cooldown)
- **HUD**: HP bar (color-coded), wave counter

## Controls
- Arrow keys / WASD: Move
- Z / J: Punch (A button on arcade)
- X / K: Jump (B button on arcade)
- Enter / Space / Start: Menu navigation

## Asset Loading
Sprites are loaded before scenes using `k.loadSprite()` and referenced from `/public/`. Currently loaded:
- `startscreen` → `/startscreen.png` (title screen background)

Unused assets in public/: `jennifer.png`, `kyle.png`

## What's Implemented
- Core combat (combo punches, jump kicks, knockback, hit flash)
- Player movement + jump with gravity
- Enemy AI (chase, attack, death fade, HP bars)
- 5-wave progression with "GO →" arrow between waves
- Camera scrolling across 5 world sections
- Title screen with background image
- Intro story crawl (skippable)
- Game over screen with retry
- All visuals are colored rectangles except title background

## What's NOT Implemented
- Audio (no sound effects or music)
- Win/victory screen after final wave
- Score/points system
- Enemy variety (only one type, no bosses)
- Pickups (health, weapons, power-ups)
- Advanced mechanics (grab/throw, blocking, specials)
- Sprite art for gameplay (player, enemies, environment are rectangles)
- Screen shake, damage numbers, particle effects

## Code Style
- Single-file architecture in main.ts
- Constants at top, then types, then Kaplay init, helpers, scenes
- Uses `k.` prefix for all Kaplay API calls (non-global mode)
- RGB colors defined as `[number, number, number]` tuples
- Y-position-based depth sorting via `zFromY()`
