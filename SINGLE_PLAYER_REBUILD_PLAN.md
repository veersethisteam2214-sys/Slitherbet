# Single Player Rebuild Plan

Last updated: 2026-07-01

This is the plan for rebuilding the Slither Bet Single Player mode from scratch.

## Core Decision

Do not revive the deleted single-player implementation. It was removed because it had weak graphics, unclear risk feedback, and too much leftover casino-style UI. Build a cleaner version with a focused arcade loop.

The new Single Player should feel like a premium 2D arcade game where a snake moves checkpoint to checkpoint, eats mice, and builds a demo-coin streak. It should be visually readable, responsive, and polished.

## Target Experience

The player enters Single Player from the homepage and sees a self-contained game screen:

- A premium game frame, not a normal website page.
- A side/top HUD with demo coin balance, current entry, current reward, level, streak, and multiplier.
- A central 2D game scene with a stylized path, checkpoints, mice, snake idle animations, and progress markers.
- A clear primary action: start run, advance, collect, or retry.
- No real-money language.
- No deposit, withdraw, cashout, crypto, or payment concepts.

Use wording like:

- `Entry`
- `Collect`
- `Reward`
- `Demo coins`
- `Checkpoint`
- `Streak`
- `Run history`

Avoid wording like:

- `Bet`
- `Wager`
- `Cashout`
- `Buy-in`
- `Rake`
- `Real money`

## Gameplay Loop

1. Player chooses an entry amount in demo coins.
2. Player presses Start.
3. Snake begins at checkpoint 0.
4. Next checkpoint contains a visible mouse.
5. Player presses Advance when ready.
6. Snake travels to the mouse/checkpoint.
7. If successful:
   - Snake eats the mouse.
   - Reward and multiplier increase.
   - Checkpoint lights up.
   - Player can collect or continue.
8. If failed:
   - Run ends.
   - Use a clear non-enemy failure visual for now.
   - Player can retry.
9. If player collects:
   - Demo coin reward is added to balance.
   - Run result is recorded.

## Failure Design

The user asked to remove birds, bats, foxes, and enemies for now. Keep it that way.

Failure still needs to be visually understandable. Use a non-enemy hazard:

- cracked checkpoint tile
- unstable bridge segment
- mist-covered gap
- collapsing stone
- timing ring that flashes red
- path pulse that warns of danger

The player should never feel like they lost from an invisible dice roll. Even if the result is probability-based, the scene should make the risk feel represented.

## Visual Direction

The art should be premium 2D arcade, not childish and not flat.

Palette:

- dark emerald
- deep jungle green
- black-blue cave shadows
- gold reward accents
- neon green snake highlights
- deep purple ambient lighting
- warm mouse/checkpoint highlights

Scene direction:

- stylized cave/jungle trail
- layered parallax background
- soft fog or light shafts
- glowing checkpoint stones
- mice that look more realistic than emoji/cartoon blobs
- snake with segmented body, subtle shading, eyes, tongue flick, idle coil motion

Avoid:

- generic gradient backgrounds
- excessive UI cards
- childish mascot art
- flat plain React panels
- cluttered gambling tables

## Screen Layout

Desktop:

- Top-left: back/menu button.
- Top center or left: `Single Player`.
- Top-right: balance/settings if needed.
- Main center: canvas game scene.
- Bottom or right rail: entry controls, difficulty, current multiplier, collect/advance controls.
- Small run history strip can appear after a few runs.

Mobile:

- Canvas stays first and visible.
- Controls dock to the bottom.
- Buttons must be large enough for touch.
- No text should overlap.

## State Machine

Use an explicit state machine instead of scattered booleans.

Recommended run states:

```ts
type SingleRunStatus =
  | "idle"
  | "ready"
  | "moving"
  | "checkpoint"
  | "collecting"
  | "failed"
  | "complete";
```

Recommended run data:

```ts
type SingleRunState = {
  status: SingleRunStatus;
  entry: number;
  level: number;
  maxLevels: number;
  multiplier: number;
  reward: number;
  seed: number;
  path: Checkpoint[];
  snake: SnakeMotionState;
  result?: "collected" | "failed";
};
```

Keep reward math separate from rendering so it can be tested.

## Reward Model

For demo only, use transparent math:

- Level 1 starts around `1.10x`.
- Each level increases multiplier.
- Later levels carry more risk.
- Show the current collectible reward clearly.
- Show next checkpoint multiplier separately from total reward.

Example:

```ts
const multipliers = [1.1, 1.22, 1.38, 1.6, 1.9, 2.35, 3.0, 4.0, 5.5, 8.0];
const successChances = [0.94, 0.9, 0.85, 0.78, 0.7, 0.61, 0.52, 0.42, 0.32, 0.23];
```

This is not casino-grade fairness. If real-money systems are ever added, RNG must move server-side and become auditable.

## Technical Architecture

Create these files:

```text
src/modes/SinglePlayerGame.tsx
src/singlePlayer/singleTypes.ts
src/singlePlayer/singleMath.ts
src/singlePlayer/singleScene.ts
src/singlePlayer/singleAssets.ts
```

Responsibilities:

- `SinglePlayerGame.tsx`
  - React shell, HUD, controls, route exit, balance integration.

- `singleTypes.ts`
  - Shared single-player types.

- `singleMath.ts`
  - Entry validation, multiplier table, reward calculation, seeded outcome function.

- `singleScene.ts`
  - Canvas drawing, animation, snake movement, checkpoint rendering.

- `singleAssets.ts`
  - Color palette, mouse drawing helpers, checkpoint art settings.

Use React state only for UI-level values. Use refs for animation state so React does not re-render at 60 FPS.

## Canvas Rendering Plan

Use a single canvas for the game scene.

Render order:

1. Background cave/jungle gradient.
2. Far parallax silhouettes.
3. Path tiles.
4. Checkpoint stones.
5. Mouse at target checkpoint.
6. Snake body.
7. Reward particles.
8. Foreground fog/vignette.
9. Optional HUD overlays that belong inside the scene.

The canvas should scale with device pixel ratio.

Animation targets:

- snake idle breathing
- tongue flick
- mouse twitch/ear movement
- checkpoint pulse
- path danger pulse
- collect particle burst
- screen shake on failure, used lightly

## Component Contract

The rebuilt component should accept the old intended props:

```ts
type SinglePlayerGameProps = {
  balance: number;
  bets: BetRecord[];
  theme: "arcade" | "neon";
  onAdjustBalance: (delta: number) => void;
  onRecordBet: (bet: Omit<BetRecord, "id" | "time">) => void;
  onExit: () => void;
};
```

Even if the visible copy says `runs`, the existing `BetRecord` type can be reused temporarily. Rename that shared type later during a broader demo-coin cleanup.

## Implementation Phases

### Phase 1 - Reconnect Empty Route

- Recreate `src/modes/SinglePlayerGame.tsx`.
- Import it in `App.tsx`.
- Replace the blank branch with the component.
- Add a minimal exit button and blank canvas.
- Build must pass.

### Phase 2 - Core Game Shell

- Add HUD.
- Add entry selector.
- Add Start, Advance, Collect, Retry controls.
- Add state machine.
- No complex art yet.

### Phase 3 - Game Math

- Add multiplier table.
- Add success chance table.
- Add reward calculation.
- Add seeded run outcome helper.
- Add tests or at least isolated pure functions that are easy to test.

### Phase 4 - First Playable Scene

- Draw path and checkpoints.
- Draw snake.
- Draw mouse.
- Move snake between checkpoints.
- Add success/failure transitions.

### Phase 5 - Premium Visual Pass

- Improve cave/jungle background.
- Improve realistic mouse art.
- Add checkpoint glow and reward particles.
- Add snake idle animations.
- Add responsive layout polish.

### Phase 6 - UX Pass

- Make risk/reward readable.
- Remove confusing casino language.
- Add clear result states.
- Add run history using demo coin copy.
- Verify desktop and mobile layouts.

### Phase 7 - QA

- Run `npm run build`.
- Test Single Player:
  - start run
  - advance to checkpoint
  - collect reward
  - fail run
  - retry
  - exit to menu
  - balance updates
  - run history records
- Test Multiplayer still opens and plays.
- Test homepage still routes correctly.

## Acceptance Criteria

Single Player is acceptable when:

- It is no longer blank.
- It looks like a real premium 2D arcade game screen.
- The snake, mice, checkpoints, multiplier, and reward are all visually clear.
- There are no birds, bats, foxes, eagles, or predator enemies.
- Demo coin language is used throughout the single-player screen.
- The player understands when they can start, advance, collect, retry, and exit.
- The canvas is smooth and does not cause React to re-render every frame.
- The game works on desktop and mobile.
- `npm run build` passes.

## Quality Bar

Do not stop at functional. The rebuilt screen needs to look intentional:

- polished composition
- strong contrast
- consistent shadows and glow
- readable controls
- restrained but satisfying animation
- no overlapping text
- no generic placeholder art
- no cluttered betting-board look

If the first version looks rough, keep iterating before pushing.

