# Slither Bet Mac Handoff

Last updated: 2026-07-01

This file is for Codex, Claude, or another coding agent opening the project on a Mac. Read this first before making changes.

## Project Goal

Slither Bet is a React/Vite 2D arcade snake game prototype. The long-term idea is a snake-based arcade game with risk/reward progression and possible future casino-style integrations. The current implementation must remain a virtual/demo coin game UI only.

Do not add deposit, withdraw, crypto, payment, real-money wallet handling, compliance flows, or real-money gambling features.

The current priority is rebuilding Single Player from scratch. The old Single Player implementation was intentionally removed because the graphics and gameplay direction were not good enough.

## Current State

- The app builds with Vite, React, and TypeScript.
- The homepage/menu still exists.
- A new cinematic `SlitherIntro` boot screen exists on `main`. Preserve it unless the user explicitly asks to remove or replace it.
- `src/modes/HomeEntry.tsx` is a wrapper around the current menu. This exists so a new home/intro design can replace it cleanly.
- Multiplayer is still intact and should not be broken.
- Single Player currently opens a blank black screen on purpose.
- The old `src/modes/SinglePlayerGame.tsx` file has been deleted.

## Commands

```bash
npm install
npm run dev
npm run build
```

Local dev URL:

```text
http://127.0.0.1:5173/
```

## Important Files

- `src/App.tsx`
  - Owns top-level screen state.
  - Screen union is currently `"menu" | "single" | "lobby" | "match"`.
  - Shows `SlitherIntro` while `booting` is true, then enters the normal app shell.
  - The `single` branch intentionally renders `<div className="single-blank-screen" />`.
  - Multiplayer and lobby routing should be preserved.

- `src/modes/SlitherIntro.tsx`
  - Current cinematic boot/intro layer.
  - Uses `src/components/slitherLoadingEngine.ts`.
  - This came from remote `main`; do not remove it accidentally while rebuilding Single Player.

- `src/components/slitherLoadingEngine.ts`
  - Canvas engine for the current intro animation.
  - Keep isolated from Single Player.

- `src/modes/HomeEntry.tsx`
  - Thin wrapper around `Menu`.
  - Replace this file or its child menu if adding the friend's new intro/homepage work.
  - Keep these callback props intact: `onSingle`, `onMultiplayer`, `onUsernameChange`.

- `src/modes/Menu.tsx`
  - Current premium arcade homepage.
  - The Single Player button calls `onSingle`.
  - The Multiplayer button calls `onMultiplayer`.

- `src/modes/MultiplayerLobby.tsx`
  - Current multiplayer lobby and cosmetics entry.
  - Do not modify unless explicitly asked.

- `src/modes/MultiplayerGame.tsx`
  - Current simulated multiplayer arena.
  - Uses `RealisticSnakeRenderer`.
  - Do not modify unless explicitly asked.

- `src/components/RealisticSnakeRenderer.ts`
  - Shared snake renderer used by multiplayer and cosmetics previews.
  - Keep this file because multiplayer depends on it.

- `src/shared.ts`
  - Shared types, multiplayer tiers, money formatter, bot names, arena helpers.
  - Some copy still uses money/casino language. Future cleanup should convert visible UI to demo coin language.

- `src/styles.css`
  - Monolithic stylesheet.
  - Contains the blank single-player screen styles near the top.

## Current Single Player Routing

In `src/App.tsx`, this is intentional:

```tsx
{screen === "single" && <div className="single-blank-screen" aria-label="Single player placeholder" />}
```

When rebuilding Single Player, replace that branch with a new component, for example:

```tsx
{screen === "single" && (
  <SinglePlayerGame
    balance={balance}
    bets={bets}
    theme={theme}
    onAdjustBalance={adjustBalance}
    onRecordBet={recordBet}
    onExit={() => setScreen("menu")}
  />
)}
```

Then recreate `src/modes/SinglePlayerGame.tsx`.

## Product Constraints

- Keep this as demo/virtual coins for now.
- Keep homepage and multiplayer working unless the user asks to change them.
- Do not add new packages unless there is a clear reason.
- Prefer canvas for the actual game scene and React for the HUD/control shell.
- Keep game logic deterministic enough to test.
- Avoid AI-looking generic gradients and clutter.
- Avoid childish art. The target is premium 2D arcade: polished, glossy, high-quality, readable.

## Intro And Homepage Work

The repo now contains a cinematic intro on `main`. Future homepage work may still replace `HomeEntry` or `Menu`.

When integrating it:

- Put the new home/intro layer behind `HomeEntry` or replace `HomeEntry`.
- If replacing the boot animation, update `SlitherIntro` and `slitherLoadingEngine` deliberately instead of deleting them as a side effect.
- Preserve `onSingle` and `onMultiplayer` callbacks.
- After clicking Single Player, the app should enter the new rebuilt Single Player component.
- After clicking Multiplayer, the app should continue to open the current multiplayer lobby.
- Do not couple the home animation to the single-player game loop.

## Known Issues To Fix Later

- Single Player is blank and needs a full rebuild.
- Visible UI still mixes demo coin language with betting/money language in multiplayer and history.
- `MultiplayerGame` updates React state every animation frame and should eventually be optimized.
- `styles.css` is too large and should eventually be split or cleaned.
- No automated gameplay tests exist yet.

## Recommended Next Step

Read `SINGLE_PLAYER_REBUILD_PLAN.md`, then build the new Single Player in phases:

1. Create the new component and route it in.
2. Build the canvas scene and HUD without payout logic.
3. Add checkpoint/mouse progression.
4. Add demo-coin reward math.
5. Add animations, polish, and responsive layout.
6. Add tests for game state and reward calculations.

