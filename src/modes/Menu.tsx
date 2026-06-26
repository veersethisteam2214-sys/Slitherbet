import { ChevronRight, Coins, Gamepad2, MousePointer2, Sparkles, Trophy, User, Users } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "../components/ui/Button";
import { GlassPanel } from "../components/ui/GlassPanel";
import { Input } from "../components/ui/Input";
import { isValidUsername, saveUsername } from "../snakeSkins";

type MenuProps = {
  balance: number;
  theme: "arcade" | "neon";
  username: string;
  onUsernameChange: (name: string) => void;
  onSingle: () => void;
  onMultiplayer: () => void;
};

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" fill="none" aria-hidden>
      <path
        d="M7 22c0-4 4-5 8-5s7-1 7-4-2-4-5-4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="22" r="2.8" fill="currentColor" />
    </svg>
  );
}

function coinBalance(value: number) {
  return `${Math.floor(value).toLocaleString("en-US")} coins`;
}

type ArcadeModeButtonProps = {
  title: string;
  subtitle: string;
  meta: string;
  Icon: ReactNode;
  accent?: "emerald" | "violet";
  disabled?: boolean;
  onClick: () => void;
};

function ArcadeModeButton({ title, subtitle, meta, Icon, accent = "emerald", disabled, onClick }: ArcadeModeButtonProps) {
  return (
    <button className={`arcade-mode-button ${accent}`} type="button" disabled={disabled} onClick={onClick}>
      <span className="mode-icon">{Icon}</span>
      <span className="mode-main">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </span>
      <span className="mode-meta">{meta}</span>
      <ChevronRight className="mode-arrow" size={20} />
    </button>
  );
}

export function Menu({ balance, theme, username, onUsernameChange, onSingle, onMultiplayer }: MenuProps) {
  const [draft, setDraft] = useState(username);
  const valid = isValidUsername(draft);

  useEffect(() => {
    setDraft(username);
  }, [username]);

  const commit = () => {
    const trimmed = draft.trim();
    if (isValidUsername(trimmed)) {
      saveUsername(trimmed);
      onUsernameChange(trimmed);
    }
  };

  const enterSingle = () => {
    commit();
    if (isValidUsername(draft)) onSingle();
  };

  const enterMulti = () => {
    commit();
    if (isValidUsername(draft)) onMultiplayer();
  };

  return (
    <div className={`menu-screen menu-${theme}`}>
      <div className="menu-backdrop" aria-hidden />
      <div className="menu-world" aria-hidden>
        <span className="world-glow g1" />
        <span className="world-glow g2" />
        <span className="world-path" />
        <span className="world-checkpoint p1" />
        <span className="world-checkpoint p2" />
        <span className="world-checkpoint p3" />
        <span className="world-coin c1" />
        <span className="world-coin c2" />
        <span className="world-coin c3" />
        <span className="world-mouse m1" />
        <span className="world-mouse m2" />
        <span className="world-snake-trail" />
      </div>

      <header className="menu-topbar">
        <div className="brand-lockup menu-brand-compact">
          <div className="brand-mark"><BrandMark /></div>
          <div className="brand-copy">
            <span className="brand-name">Slither Bet</span>
            <span className="brand-sub">Demo coin arcade</span>
          </div>
        </div>
        <GlassPanel className="wallet-chip menu-balance-hud">
          <span className="coin-stack" aria-hidden><Coins size={18} /></span>
          <span className="eyebrow">Total Balance</span>
          <strong>{coinBalance(balance)}</strong>
        </GlassPanel>
      </header>

      <div className="menu-body">
        <section className="premium-home">
          <div className="game-logo-lockup" aria-label="Slither Bet">
            <span className="logo-spark left" />
            <h1>
              <span>Slither</span>
              <b>Bet</b>
            </h1>
            <span className="logo-snake-mark" aria-hidden>
              {Array.from({ length: 10 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
              <em />
            </span>
            <p>Snake runs, checkpoint streaks, and demo-coin rewards.</p>
            <span className="logo-spark right" />
          </div>

          <div className="home-stage">
            <div className="stage-art" aria-hidden>
              <span className="stage-path" />
              <span className="stage-grass left" />
              <span className="stage-grass right" />
              <span className="stage-check s1"><b>1.10x</b><i>110</i></span>
              <span className="stage-check s2"><b>1.25x</b><i>125</i></span>
              <span className="stage-check s3"><b>1.55x</b><i>155</i></span>
              <span className="stage-mouse a" />
              <span className="stage-mouse b" />
              <span className="stage-coin k1" />
              <span className="stage-coin k2" />
              <span className="stage-coin k3" />
              <span className="stage-snake">
                {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
                <b />
              </span>
            </div>

            <div className={`home-action-panel ${valid ? "" : "locked"}`}>
              <ArcadeModeButton
                title="Single Player"
                subtitle="Checkpoint run against the cave path"
                meta="Solo"
                Icon={<Gamepad2 size={24} />}
                disabled={!valid}
                onClick={enterSingle}
              />
              <ArcadeModeButton
                title="Multiplayer"
                subtitle="Live arena with rival snakes"
                meta="Versus"
                Icon={<Users size={24} />}
                accent="violet"
                disabled={!valid}
                onClick={enterMulti}
              />
            </div>
          </div>

          <div className="home-feature-row">
            <span><MousePointer2 size={14} /> mice checkpoints</span>
            <span><Trophy size={14} /> streak ladder</span>
            <span><Sparkles size={14} /> demo coins only</span>
          </div>
        </section>

        <GlassPanel className="ign-gate" elevated>
          <div className="ign-row">
            <div className="ign-field-wrap">
              <Input
                id="ign-input"
                label={
                  <>
                    <User size={13} /> Player tag
                  </>
                }
                type="text"
                placeholder="ViperKing"
                maxLength={16}
                value={draft}
                hint={
                  valid ? `Playing as ${draft.trim()}` : "3-16 chars - letters, numbers, underscore"
                }
                hintOk={valid}
                onChange={(e) => setDraft(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                onBlur={commit}
                onKeyDown={(e) => e.key === "Enter" && commit()}
              />
            </div>
            <Button variant="subtle" disabled={!valid} onClick={commit}>
              Save
            </Button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
