import { useCallback, useState } from "react";
import { Loading } from "./modes/Loading";
import { Menu } from "./modes/Menu";
import { MultiplayerGame } from "./modes/MultiplayerGame";
import { MultiplayerLobby } from "./modes/MultiplayerLobby";
import { SinglePlayerGame } from "./modes/SinglePlayerGame";
import type { Tier } from "./shared";

type Screen = "menu" | "single" | "lobby" | "match";

const STARTING_BALANCE = 1000;

export function App() {
  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState<Screen>("menu");
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [activeTier, setActiveTier] = useState<Tier | null>(null);

  const adjustBalance = useCallback((delta: number) => {
    setBalance((prev) => Math.max(0, prev + delta));
  }, []);

  const handleJoin = useCallback((tier: Tier) => {
    setBalance((prev) => Math.max(0, prev - tier.buyIn));
    setActiveTier(tier);
    setScreen("match");
  }, []);

  if (booting) {
    return (
      <main className="app-shell">
        <Loading onDone={() => setBooting(false)} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      {screen === "menu" && (
        <Menu
          balance={balance}
          onSingle={() => setScreen("single")}
          onMultiplayer={() => setScreen("lobby")}
        />
      )}

      {screen === "single" && (
        <SinglePlayerGame
          balance={balance}
          onAdjustBalance={adjustBalance}
          onExit={() => setScreen("menu")}
        />
      )}

      {screen === "lobby" && (
        <MultiplayerLobby
          balance={balance}
          onJoin={handleJoin}
          onExit={() => setScreen("menu")}
        />
      )}

      {screen === "match" && activeTier && (
        <MultiplayerGame
          tier={activeTier}
          balance={balance}
          onAdjustBalance={adjustBalance}
          onExit={() => setScreen("lobby")}
        />
      )}
    </main>
  );
}
