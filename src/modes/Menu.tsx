import { Coins, Layers, Mountain, Sparkles, Trophy, User, Users } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import { SnakeWordmark } from "../components/SnakeWordmark";
import { Button } from "../components/ui/Button";
import { GlassPanel } from "../components/ui/GlassPanel";
import { Input } from "../components/ui/Input";
import { ModeCard } from "../components/ui/ModeCard";
import { formatMoney } from "../shared";
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
    <div className="menu-screen">
      <div className="menu-backdrop" aria-hidden />

      <header className="menu-topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><BrandMark /></div>
          <div className="brand-copy">
            <span className="brand-name">SlitherBet</span>
            <span className="brand-sub">Crystal cave arcade</span>
          </div>
        </div>
        <GlassPanel className="wallet-chip">
          <span className="eyebrow">Balance</span>
          <strong>{formatMoney(balance)}</strong>
        </GlassPanel>
      </header>

      <div className="menu-wordmark-row">
        <SnakeWordmark theme={theme} />
      </div>

      <div className="menu-body">
        <section className="menu-cave-window" aria-label="SlitherBet cave preview">
          <div className="menu-cave-bg" aria-hidden>
            <span className="cave-glow glow-a" />
            <span className="cave-glow glow-b" />
            <span className="cave-crystal crystal-a" />
            <span className="cave-crystal crystal-b" />
            <span className="cave-crystal crystal-c" />
            <span className="cave-platform cp-a" />
            <span className="cave-platform cp-b" />
            <span className="cave-platform cp-c" />
            <span className="preview-orb orb-1">1.08x</span>
            <span className="preview-orb orb-2">1.33x</span>
            <span className="preview-snake">
              {Array.from({ length: 15 }, (_, i) => <i key={i} style={{ "--i": i } as CSSProperties} />)}
              <b />
            </span>
          </div>
          <div className="menu-cave-copy">
            <span className="eyebrow"><Sparkles size={13} /> New cave build</span>
            <h2>Arcade snake with real table energy.</h2>
          </div>
          <div className="menu-cave-stats">
            <span><Trophy size={14} /> Top six paid</span>
            <span><Mountain size={14} /> Crystal cave</span>
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
                  valid ? `Playing as ${draft.trim()}` : "3-16 chars · letters, numbers, underscore"
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

        <div className={`mode-grid ${valid ? "" : "locked"}`}>
          <ModeCard
            kicker={
              <>
                <Mountain size={13} /> Solo · cave run
              </>
            }
            stat="~12s a run"
            title="Cave Run"
            description="Ride the ledges, collect multipliers, and cash out before the cave patrol catches you."
            points={[
              <>
                <Coins size={14} /> Multiplier climbs every ledge
              </>,
              <>
                <Layers size={14} /> Cash out the second you land
              </>,
            ]}
            cta="Enter the cave"
            disabled={!valid}
            onClick={enterSingle}
          />
          <ModeCard
            accent="warm"
            kicker={
              <>
                <Users size={13} /> Live · last snake standing
              </>
            }
            stat="Up to 100 seats"
            title="Tournaments"
            description="Enter a buy-in table, grow your snake, and fight through the final-six money bubble."
            points={[
              <>
                <Coins size={14} /> Top-six payout ladder
              </>,
              <>
                <Users size={14} /> Snake vs snake · no respawns
              </>,
            ]}
            cta="Browse tables"
            disabled={!valid}
            onClick={enterMulti}
          />
        </div>
      </div>
    </div>
  );
}
