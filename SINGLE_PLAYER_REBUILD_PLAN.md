# Slither Bet Single Player Rebuild Plan

Last updated: 2026-07-01

This is the full planning document for rebuilding Single Player into a proper Slither Bet game mode. It is written so the owner can review it, tweak values, and hand it back to Codex/Claude for implementation.

## One-Sentence Goal

Build a premium 2D arcade single-player mode where a snake advances through glowing checkpoints, eats realistic mice, builds a demo-coin reward streak, and lets the player choose between collecting or risking the next checkpoint.

## Non-Negotiables

- This is virtual/demo coins only.
- Do not add deposits, withdrawals, crypto, payments, real-money betting, wallets, KYC, compliance, or casino operator features.
- Do not use visible terms like `cashout`, `wager`, `rake`, `buy-in`, `real money`, `deposit`, or `withdraw`.
- Do not bring back the old deleted `SinglePlayerGame.tsx`.
- Keep Multiplayer working.
- Keep homepage routing working.
- No birds, bats, foxes, eagles, or predator enemies in Single Player for now.
- The game should feel premium, glossy, and arcade-like, not childish and not like a plain React dashboard.

## Current Repo State

- `src/modes/SinglePlayerGame.tsx` is deleted.
- `src/App.tsx` currently renders a blank black screen for `screen === "single"`.
- `src/modes/HomeEntry.tsx` wraps the current homepage/menu.
- `src/modes/SlitherIntro.tsx` and `src/components/slitherLoadingEngine.ts` exist for the current boot intro.
- Multiplayer is still implemented in `src/modes/MultiplayerLobby.tsx` and `src/modes/MultiplayerGame.tsx`.
- Shared visual snake rendering still exists in `src/components/RealisticSnakeRenderer.ts`.

## Product Fantasy

The player is not playing poker or placing a real bet. The player is entering a dangerous arcade trail.

The snake moves from checkpoint to checkpoint. Each checkpoint has a mouse. Eating the mouse locks in a higher demo-coin reward. After every successful checkpoint, the player can collect or continue.

The feeling should be:

- "I can stop now and keep this reward."
- "The next mouse is worth more."
- "The path is getting more dangerous."
- "I understand what is happening visually."
- "This looks like a polished mobile arcade game."

## Core Gameplay Loop

1. Player opens Single Player.
2. Player selects an entry amount in demo coins.
3. Player optionally selects a difficulty or trail type.
4. Player presses `Start Run`.
5. Snake appears at checkpoint 0.
6. Next checkpoint shows:
   - visible mouse
   - next multiplier
   - next reward
   - danger/risk intensity
7. Player presses `Advance`.
8. Snake travels along the path toward the mouse.
9. If success:
   - snake eats the mouse
   - checkpoint activates
   - reward increases
   - player can `Collect` or `Advance`
10. If failure:
   - run ends through a non-enemy visual hazard
   - player can `Retry` or return to menu
11. If player collects:
   - reward is added to demo balance
   - run history records the result
   - player returns to ready state

## Main Screen Layout

### Desktop Layout

Use a full-screen game layout, not a regular website section.

```text
+------------------------------------------------------------------+
| Back | Single Player                 Demo Balance | Settings      |
+------------------------------------------------------------------+
|                                                                  |
|  +-------------------------------+  +-------------------------+  |
|  |                               |  | Entry                   |  |
|  |                               |  | 25 / 50 / 100 / Custom  |  |
|  |          GAME CANVAS          |  |                         |  |
|  |   snake, path, checkpoints,   |  | Current Reward          |  |
|  |       mice, particles         |  | 137 demo coins          |  |
|  |                               |  |                         |  |
|  |                               |  | Multiplier 1.37x        |  |
|  +-------------------------------+  | Level 3 / 10            |  |
|                                     |                         |  |
|                                     | [Collect] [Advance]     |  |
|                                     +-------------------------+  |
+------------------------------------------------------------------+
| Recent Runs: +125, failed L4, +80, +310                          |
+------------------------------------------------------------------+
```

### Mobile Layout

```text
+------------------------------+
| Back       Single Player     |
| Balance: 1,000 demo coins    |
+------------------------------+
|                              |
|          GAME CANVAS         |
|                              |
+------------------------------+
| Reward 137 | 1.37x | L3/10   |
| Entry selector               |
| [Collect] [Advance]          |
+------------------------------+
```

### Layout Requirements

- Canvas must always be the visual focus.
- Controls should feel like a game console/control deck.
- No nested card clutter.
- Text must not overlap at 320px mobile width.
- Controls must remain usable with touch.
- Back button must always be visible unless a modal is open.

## Visual Identity

### Art Direction

Premium 2D arcade, cave-jungle, glossy game UI.

The scene should look like a stylized animated game world:

- dark emerald cave floor
- purple shadow depth
- gold reward light
- neon green snake highlights
- warm checkpoint stones
- realistic mice with readable silhouettes
- soft fog, vignette, and particle glints

Avoid:

- flat grey backgrounds
- generic purple/blue gradients
- childish cartoon animals
- slot-machine clutter
- fake 3D bevels everywhere
- plain HTML panels

## Color Palette

Use these as the first implementation tokens. The owner can tweak these before implementation.

### Base Colors

| Token | Hex | Use |
|---|---:|---|
| `--sp-bg-black` | `#050706` | page background, deep shadows |
| `--sp-bg-deep` | `#07130F` | main cave background |
| `--sp-bg-emerald` | `#0B2A1F` | game surface |
| `--sp-bg-forest` | `#123D2B` | path shadows, panels |
| `--sp-panel` | `#10251F` | HUD/control panels |
| `--sp-panel-2` | `#16372C` | raised controls |
| `--sp-border` | `#2F6B55` | panel borders |
| `--sp-border-soft` | `rgba(92, 190, 148, 0.28)` | subtle lines |

### Accent Colors

| Token | Hex | Use |
|---|---:|---|
| `--sp-gold` | `#F4C95D` | rewards, active checkpoint |
| `--sp-gold-hot` | `#FFD978` | bright reward glow |
| `--sp-green` | `#61F28F` | snake glow, success |
| `--sp-green-deep` | `#18A85A` | snake body shadow |
| `--sp-purple` | `#7B4DFF` | cave magic, rare glow |
| `--sp-purple-deep` | `#24184A` | background depth |
| `--sp-danger` | `#FF4E64` | failure warning |
| `--sp-warning` | `#FF9F43` | unstable checkpoint warning |

### Creature Colors

| Token | Hex | Use |
|---|---:|---|
| `--snake-main` | `#35D96B` | snake body |
| `--snake-light` | `#9DFFB8` | highlights |
| `--snake-dark` | `#0B6B3A` | underside/shadow |
| `--snake-eye` | `#F8FFF8` | eyes |
| `--mouse-fur` | `#A48A74` | mouse body |
| `--mouse-fur-light` | `#D2BCA6` | mouse highlight |
| `--mouse-fur-dark` | `#5C4738` | mouse shadow |
| `--mouse-ear` | `#D99CA2` | inner ears |
| `--mouse-nose` | `#2B1B18` | nose/eyes |

### Text Colors

| Token | Hex | Use |
|---|---:|---|
| `--sp-text` | `#F6FFF8` | primary text |
| `--sp-muted` | `#9EB8AA` | labels |
| `--sp-dim` | `#65786D` | secondary metadata |
| `--sp-on-gold` | `#1C1406` | text on gold buttons |
| `--sp-on-green` | `#04150B` | text on green buttons |

## Typography

Use existing fonts unless the repo already loads better ones.

Recommended hierarchy:

- Screen title: 28-34px desktop, 20-24px mobile, weight 800.
- HUD number: 24-32px desktop, 18-22px mobile, weight 900.
- Button label: 15-18px, weight 800.
- Panel label: 11-12px uppercase, weight 800, letter spacing `0.06em`.
- Body/help text: 13-15px.

Do not use negative letter spacing inside controls.

## UI Copy

Use this exact wording for first version:

| Context | Copy |
|---|---|
| Header title | `Single Player` |
| Subtitle | `Checkpoint trail` |
| Balance label | `Demo Balance` |
| Entry label | `Entry` |
| Start button | `Start Run` |
| Continue button | `Advance` |
| Collect button | `Collect` |
| Retry button | `Retry` |
| Exit button | `Menu` |
| Current reward | `Current Reward` |
| Next reward | `Next Mouse` |
| Multiplier | `Multiplier` |
| Level | `Checkpoint` |
| Risk label | `Trail Risk` |
| Success result | `Collected` |
| Failure result | `Trail broke` |
| History | `Recent Runs` |

Avoid:

- `cash out`
- `bet`
- `wager`
- `buy-in`
- `rake`
- `payout`
- `real money`

## Tweakable Game Settings

Put these values in one configuration object so they are easy to change.

```ts
export const SINGLE_PLAYER_CONFIG = {
  maxLevels: 10,
  defaultEntry: 25,
  minEntry: 5,
  maxEntry: 500,
  quickEntries: [5, 25, 50, 100],
  multipliers: [1.1, 1.22, 1.38, 1.6, 1.9, 2.35, 3.0, 4.0, 5.5, 8.0],
  successChances: [0.94, 0.9, 0.85, 0.78, 0.7, 0.61, 0.52, 0.42, 0.32, 0.23],
  snakeTravelMs: 820,
  collectBurstMs: 700,
  failShakeMs: 420,
  checkpointPulseMs: 1600,
  mouseIdleMs: 1100,
};
```

### Difficulty Options

Keep this optional. First version can ship with one standard trail.

```ts
const DIFFICULTIES = {
  calm: {
    label: "Calm Trail",
    riskOffset: 0.06,
    multiplierScale: 0.9,
  },
  standard: {
    label: "Standard Trail",
    riskOffset: 0,
    multiplierScale: 1,
  },
  wild: {
    label: "Wild Trail",
    riskOffset: -0.08,
    multiplierScale: 1.18,
  },
};
```

For first implementation, use `standard` only unless the UI has enough room.

## Reward Math

For demo only:

```ts
reward = Math.floor(entry * currentMultiplier);
nextReward = Math.floor(entry * nextMultiplier);
```

Example:

| Entry | Level | Multiplier | Reward |
|---:|---:|---:|---:|
| 25 | 1 | 1.10x | 27 |
| 25 | 2 | 1.22x | 30 |
| 25 | 5 | 1.90x | 47 |
| 25 | 10 | 8.00x | 200 |
| 100 | 10 | 8.00x | 800 |

The player pays the entry at run start:

```ts
onAdjustBalance(-entry);
```

If collected:

```ts
onAdjustBalance(reward);
```

If failed:

```ts
// No refund.
```

Record the run using the existing `BetRecord` type for now, but visible UI should call it a run:

```ts
onRecordBet({
  mode: "single",
  label: `Checkpoint ${level}`,
  stake: entry,
  multiplier,
  payout: collected ? reward : 0,
  outcome: collected ? "win" : "loss",
});
```

Later, rename `BetRecord` to `RunRecord` across the app.

## Risk System

The first rebuild can use probability-based outcomes, but risk must be visually represented.

### Risk Display

Show risk as one of:

- `Low`
- `Medium`
- `High`
- `Extreme`

Map level to risk:

| Level | Chance | Label | Color |
|---:|---:|---|---|
| 1 | 94% | Low | `#61F28F` |
| 2 | 90% | Low | `#61F28F` |
| 3 | 85% | Medium | `#F4C95D` |
| 4 | 78% | Medium | `#F4C95D` |
| 5 | 70% | High | `#FF9F43` |
| 6 | 61% | High | `#FF9F43` |
| 7 | 52% | High | `#FF9F43` |
| 8 | 42% | Extreme | `#FF4E64` |
| 9 | 32% | Extreme | `#FF4E64` |
| 10 | 23% | Extreme | `#FF4E64` |

Do not show exact percentages in the first polished UI unless the owner requests it. Show the label and visual intensity.

### Failure Visuals

No animal enemies. Use trail hazards:

- cracked checkpoint stone
- falling cave pebbles
- mist gap opens under the snake
- red danger ring flashes
- checkpoint light turns unstable

Preferred first version:

If fail occurs while the snake advances:

1. path tile under snake cracks
2. snake recoils backward slightly
3. red particles flash
4. screen shakes for `420ms`
5. result panel says `Trail broke`

This reads as a game event without adding predators.

## State Machine

Use a clear state machine. Avoid many unrelated booleans.

```ts
export type SingleRunStatus =
  | "idle"
  | "ready"
  | "moving"
  | "checkpoint"
  | "collecting"
  | "failed";
```

```ts
export type Checkpoint = {
  id: number;
  x: number;
  y: number;
  multiplier: number;
  chance: number;
  activated: boolean;
  failed?: boolean;
};
```

```ts
export type SnakeMotionState = {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  travelStart: number;
  travelMs: number;
  facing: number;
  idlePhase: number;
};
```

```ts
export type SingleRunState = {
  status: SingleRunStatus;
  entry: number;
  level: number;
  maxLevels: number;
  multiplier: number;
  reward: number;
  nextReward: number;
  seed: number;
  checkpoints: Checkpoint[];
  snake: SnakeMotionState;
  result?: "collected" | "failed";
  message: string;
};
```

## File Architecture

Create:

```text
src/modes/SinglePlayerGame.tsx
src/singlePlayer/singleConfig.ts
src/singlePlayer/singleTypes.ts
src/singlePlayer/singleMath.ts
src/singlePlayer/singleScene.ts
src/singlePlayer/singleControls.tsx
```

### `src/modes/SinglePlayerGame.tsx`

Owns:

- route shell
- props from `App.tsx`
- canvas ref
- run state
- HUD state
- balance adjustment
- run recording
- exit to menu

Must not contain large drawing code.

### `src/singlePlayer/singleConfig.ts`

Owns:

- colors
- multipliers
- success chances
- animation timings
- entry presets
- layout constants

### `src/singlePlayer/singleTypes.ts`

Owns:

- state types
- checkpoint type
- snake motion type
- render context type

### `src/singlePlayer/singleMath.ts`

Owns pure functions:

- `clampEntry`
- `getMultiplier`
- `getSuccessChance`
- `getRiskLabel`
- `calculateReward`
- `createSeed`
- `seededRandom`
- `rollCheckpointOutcome`

### `src/singlePlayer/singleScene.ts`

Owns canvas drawing:

- `resizeCanvas`
- `drawSinglePlayerScene`
- `drawBackground`
- `drawPath`
- `drawCheckpoint`
- `drawMouse`
- `drawSnake`
- `drawParticles`
- `drawFailureEffect`

### `src/singlePlayer/singleControls.tsx`

Owns reusable UI pieces:

- `EntrySelector`
- `RunStats`
- `ActionDeck`
- `RiskBadge`
- `RecentRuns`

This keeps `SinglePlayerGame.tsx` readable.

## App Integration

In `src/App.tsx`, restore the component import:

```ts
import { SinglePlayerGame } from "./modes/SinglePlayerGame";
```

Replace the blank route:

```tsx
{screen === "single" && <div className="single-blank-screen" aria-label="Single player placeholder" />}
```

with:

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

The floating settings button is currently hidden on `screen === "single"`. Decide during implementation whether to keep it hidden or add an in-screen settings button.

## Canvas Scene Design

### Camera

Use a horizontal checkpoint trail for the first version.

- The snake starts left.
- Checkpoints progress to the right.
- Camera subtly pans as the snake advances.
- On mobile, use a slightly compressed path but keep the same logic.

### World Coordinates

Use virtual scene dimensions:

```ts
const WORLD = {
  width: 2400,
  height: 900,
  groundY: 560,
  checkpointGap: 210,
  startX: 220,
};
```

Canvas maps world to screen with scale and camera offset.

### Render Order

1. deep cave gradient
2. parallax jungle/cave silhouettes
3. fog layers
4. ground/path shadows
5. path stones
6. inactive checkpoints
7. active checkpoints
8. target mouse
9. snake body
10. reward particles
11. failure cracks/red pulse
12. foreground vignette
13. scene labels if needed

## Detailed Art Specs

### Background

Canvas background:

- top: `#050706`
- middle: `#07130F`
- bottom: `#0B2A1F`

Add radial glows:

- emerald glow at snake/checkpoint: `rgba(97, 242, 143, 0.16)`
- purple cave depth: `rgba(123, 77, 255, 0.14)`
- gold reward glow: `rgba(244, 201, 93, 0.18)`

Add silhouettes:

- far cave arches in `rgba(8, 20, 17, 0.88)`
- near grass/shard shapes in `rgba(34, 83, 61, 0.55)`

### Path

Path should not look like a road. It should look like stone trail tiles in a cave/jungle.

Tile colors:

- base `#1C4A36`
- highlight `#2F6B55`
- cracks `#07130F`
- edge glow `rgba(244, 201, 93, 0.20)`

Each checkpoint tile:

- rounded stone oval
- gold rim
- emerald inner glow when active
- grey/green inactive state
- red crack overlay on fail

### Checkpoint Labels

Each checkpoint should show:

- multiplier above or inside the stone
- reward below or near the mouse

Example:

```text
1.38x
34 coins
```

Use coin icon if available through CSS/canvas; otherwise small gold circle.

### Mouse

Mouse needs to look more realistic than a simple icon.

Shape:

- oval body
- smaller round head
- two ears
- pointed nose
- thin tail curve
- small feet
- black bead eye
- subtle fur highlight

Colors:

- body `#A48A74`
- highlight `#D2BCA6`
- underside `#7A6252`
- shadow `#5C4738`
- inner ear `#D99CA2`
- nose/eye `#2B1B18`
- tail `#C59A8D`

Animation:

- body bob: `translateY(-2px)` over `1100ms`
- ear twitch: every `2.8s`
- nose twitch: every `1.4s`
- tail sway: `1600ms`

Canvas implementation can use sine waves:

```ts
const bob = Math.sin(time * Math.PI * 2 / 1.1) * 2;
const ear = Math.sin(time * Math.PI * 2 / 2.8) * 0.08;
```

### Snake

Snake should be expressive but not childish.

Use segmented body:

- 18-26 body segments depending on level.
- Segment radius around 15-22px.
- Body follows a curved path, not a straight tube.
- Head is slightly larger with eyes and tongue.

Colors:

- main `#35D96B`
- shadow `#0B6B3A`
- highlight `#9DFFB8`
- belly `#B8FFD0`
- outline `rgba(4, 21, 11, 0.75)`

Idle animation:

- breathing scale: `1.0` to `1.025`
- head sway: `2-4px`
- tongue flick: every `1.8s`, visible for `180ms`
- subtle body wave even when stationary

Moving animation:

- snake follows a bezier curve to next checkpoint
- body wave amplitude increases while moving
- travel time: `820ms` standard
- ease: cubic out, then small settle bounce

Use:

```ts
easeOutCubic(t) = 1 - Math.pow(1 - t, 3)
settle = Math.sin(t * Math.PI) * 4
```

## Animation Spec

### Screen Enter

When Single Player opens:

- HUD fades in: `220ms`
- canvas vignette fades in: `260ms`
- snake pops in with small scale: `320ms`
- checkpoint lights cascade left to right: `600ms`

### Button Hover/Press

Desktop:

- hover scale `1.025`
- press scale `0.98`
- glow increases by `20%`
- transition `160ms`

Mobile:

- no hover dependency
- press scale `0.985`
- quick brightness pulse

### Start Run

- entry controls compress slightly
- first checkpoint glows green
- snake idle begins
- `Start Run` changes to `Advance`

Timing:

- control transition: `180ms`
- checkpoint activation: `360ms`

### Advance

- button locks while snake moves
- path ahead pulses gold
- snake moves for `820ms`
- target mouse reacts during final `180ms`

Success:

- mouse disappears into small gold/green burst
- checkpoint ring expands
- reward number pops up
- `Collect` and `Advance` buttons unlock

Failure:

- danger pulse begins during travel
- crack appears under snake
- red particles flash
- screen shake `420ms`
- result panel appears

### Collect

- reward number flies toward balance HUD
- gold particles trail
- balance increments after `360ms`
- result chip shows `Collected +X`

### Retry

- scene wipes with dark emerald sweep
- path resets
- snake returns to start
- entry remains the same if player can afford it

## CSS Design Tokens

Add these near the single-player CSS section:

```css
.single-player-game {
  --sp-bg-black: #050706;
  --sp-bg-deep: #07130F;
  --sp-bg-emerald: #0B2A1F;
  --sp-bg-forest: #123D2B;
  --sp-panel: #10251F;
  --sp-panel-2: #16372C;
  --sp-border: #2F6B55;
  --sp-gold: #F4C95D;
  --sp-gold-hot: #FFD978;
  --sp-green: #61F28F;
  --sp-green-deep: #18A85A;
  --sp-purple: #7B4DFF;
  --sp-purple-deep: #24184A;
  --sp-danger: #FF4E64;
  --sp-warning: #FF9F43;
  --sp-text: #F6FFF8;
  --sp-muted: #9EB8AA;
  --sp-dim: #65786D;
}
```

## CSS Component Classes

Use these class names so the implementation stays organized:

```text
single-player-game
single-topbar
single-title
single-balance
single-layout
single-canvas-shell
single-canvas
single-control-deck
single-stat-grid
single-entry-row
single-entry-button
single-action-row
single-primary-action
single-secondary-action
single-risk-badge
single-run-history
single-result-panel
```

## HUD Spec

### Required HUD Data

- Demo Balance
- Entry
- Current Reward
- Next Mouse
- Multiplier
- Checkpoint count
- Trail Risk

### HUD Layout

Use compact stat tiles:

```text
+------------------+
| Current Reward   |
| 137 coins        |
+------------------+
| Multiplier 1.37x |
| Checkpoint 3/10  |
+------------------+
| Trail Risk High  |
+------------------+
```

Stat tile style:

- background `linear-gradient(180deg, #16372C, #10251F)`
- border `1px solid rgba(92, 190, 148, 0.28)`
- radius `12px`
- inner top highlight `rgba(255, 255, 255, 0.06)`
- shadow `0 18px 42px rgba(0, 0, 0, 0.36)`

## Control Spec

### Entry Selector

Quick buttons:

- `5`
- `25`
- `50`
- `100`

Optional custom input after first playable version.

Disabled conditions:

- entry greater than balance
- run is moving
- run has active reward unless collected/failed

### Action Buttons

Button states:

| State | Primary | Secondary |
|---|---|---|
| idle | `Start Run` | disabled `Collect` |
| checkpoint | `Advance` | `Collect` |
| moving | disabled `Advancing...` | disabled |
| failed | `Retry` | `Menu` |
| collecting | disabled `Collecting...` | disabled |

Primary button visual:

- green gradient `#61F28F` to `#18A85A`
- dark text `#04150B`
- gold edge glow when reward is available

Collect button visual:

- gold gradient `#FFD978` to `#F4C95D`
- text `#1C1406`

Failure/retry visual:

- warning border `#FF9F43`
- red accent `#FF4E64`

## Audio Plan

Use existing `src/audio.ts` if practical. Do not add packages.

Suggested cues:

- start: soft ascending blip
- advance: short whoosh
- mouse eaten: crisp coin/chomp hybrid
- checkpoint success: green sparkle
- collect: gold coin cascade
- fail: low crack + muted thud
- button click: existing click

Audio must respect existing music/sfx settings.

## Accessibility

- Canvas must have an adjacent text status element.
- Buttons need clear labels.
- The status text should update on start, success, collect, and fail.
- Respect `prefers-reduced-motion`.
- Do not rely on color alone for risk; include text label.
- Keyboard:
  - Enter/Space on focused buttons works naturally.
  - Optional shortcuts after first version:
    - `A` advance
    - `C` collect
    - `R` retry
    - `Esc` menu

Reduced motion behavior:

- disable screen shake
- reduce particle count by 70%
- replace long travel bounce with linear movement
- keep gameplay functional

## Responsive Rules

Desktop:

```css
.single-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
}
```

Tablet:

```css
@media (max-width: 980px) {
  .single-layout {
    grid-template-columns: 1fr;
  }
}
```

Mobile:

```css
@media (max-width: 640px) {
  .single-player-game {
    padding: 10px;
  }

  .single-topbar {
    min-height: 48px;
  }

  .single-canvas-shell {
    min-height: 52vh;
  }

  .single-action-row {
    grid-template-columns: 1fr 1fr;
  }
}
```

## Performance Rules

- Canvas animation uses `requestAnimationFrame`.
- Do not call React `setState` every frame.
- Store animation-only values in refs.
- Only update React HUD when:
  - status changes
  - level changes
  - reward changes
  - entry changes
  - result changes
- Cap device pixel ratio at `2`.
- Particle count target:
  - success burst: max 36
  - collect burst: max 48
  - fail burst: max 28

## Testing Plan

Minimum pure functions to test or manually verify:

- `calculateReward(25, 1.1) === 27`
- `calculateReward(100, 8) === 800`
- `clampEntry(1, balance)` returns min entry
- `clampEntry(99999, 1000)` returns max allowed
- `getRiskLabel(0.94) === "Low"`
- `getRiskLabel(0.42) === "Extreme"`
- seeded outcome returns the same result for same seed and level

Manual QA:

- Single Player opens from homepage.
- Menu button returns home.
- Start Run subtracts entry.
- Advance moves snake.
- Success increases checkpoint and reward.
- Collect adds reward.
- Failure does not refund entry.
- Retry resets scene.
- Balance never becomes negative.
- Multiplayer still opens and runs.
- Intro still finishes and reaches homepage.
- Mobile layout has no overlapping text.

## Implementation Phases

### Phase 1 - Route And Skeleton

- Recreate `src/modes/SinglePlayerGame.tsx`.
- Create `src/singlePlayer` folder.
- Wire Single Player route in `src/App.tsx`.
- Add topbar, blank canvas shell, and control deck.
- Build must pass.

### Phase 2 - State And Math

- Add config, types, math helpers.
- Add entry selector.
- Add start/advance/collect/retry state transitions.
- Use placeholder canvas drawing.
- Manually verify balance updates.

### Phase 3 - First Playable Canvas

- Draw background, path, checkpoints.
- Draw mouse.
- Draw snake.
- Move snake to next checkpoint.
- Add success and failure visual states.

### Phase 4 - Premium Art Pass

- Add realistic mouse details.
- Add segmented snake with highlights.
- Add cave/jungle parallax.
- Add checkpoint glow and cracks.
- Add particles.
- Add button polish and HUD polish.

### Phase 5 - Mobile And Accessibility

- Tune responsive layout.
- Add status text.
- Add reduced motion handling.
- Verify 320px, 390px, 768px, 1440px widths.

### Phase 6 - Final QA

- Run `npm run build`.
- Test homepage, intro, Single Player, Multiplayer.
- Fix visual overlap.
- Fix any state bugs.
- Push only after the mode feels like a coherent game, not a placeholder.

## Acceptance Criteria

The rebuild is done when:

- Single Player is no longer blank.
- It looks like a premium 2D arcade game.
- Snake, mouse, checkpoint, reward, multiplier, and risk are visually clear.
- No predator enemies are present.
- Demo coin language is used everywhere in Single Player.
- Player can start, advance, collect, fail, retry, and exit.
- Balance updates correctly.
- Run history records results.
- Canvas is smooth.
- React does not re-render every animation frame.
- Mobile layout is usable.
- `npm run build` passes.
- Multiplayer is not broken.
- Intro/home routing is not broken.

## Owner Review Checklist

Before implementation, the owner can tweak:

- color hex values
- entry amounts
- multiplier table
- success chance table
- max number of checkpoints
- risk labels
- mouse realism level
- snake style
- whether to include difficulty selector in v1
- whether exact success chances should be visible
- whether the single-player settings button should be shown

## Final Build Standard

Do not ship the first thing that works. The first acceptable version should already feel like a real game mode:

- clear gameplay
- strong art direction
- polished motion
- readable controls
- no visual clutter
- no gambling/payment language
- no broken mobile layout
- no hidden/random-feeling failure

