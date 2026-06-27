import { Moon, Music, Receipt, Sun, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { audio } from "./audio";
import { FloatingActionMenu } from "./components/FloatingActionMenu";
import { BetHistory } from "./modes/BetHistory";
import { HomeEntry } from "./modes/HomeEntry";
import { MultiplayerGame } from "./modes/MultiplayerGame";
import { MultiplayerLobby } from "./modes/MultiplayerLobby";
import { SinglePlayerGame } from "./modes/SinglePlayerGame";
import {
  loadEquippedCosmetics,
  loadOwnedCosmetics,
  loadUsername,
  saveEquippedCosmetics,
  saveOwnedCosmetics,
  type Cosmetic,
  type EquippedCosmetics,
} from "./snakeSkins";
import type { BetRecord, Tier } from "./shared";

type Screen = "menu" | "single" | "lobby" | "match";
type Theme = "arcade" | "neon";

const STARTING_BALANCE = 1000;

function loadBool(key: string, fallback: boolean) {
  const raw = localStorage.getItem(key);
  return raw === null ? fallback : raw === "1";
}

export function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [balance, setBalance] = useState(STARTING_BALANCE);
  const [activeTier, setActiveTier] = useState<Tier | null>(null);
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [showBets, setShowBets] = useState(false);

  const [username, setUsername] = useState(loadUsername);
  const [ownedCosmetics, setOwnedCosmetics] = useState(loadOwnedCosmetics);
  const [equippedCosmetics, setEquippedCosmetics] = useState(loadEquippedCosmetics);

  const [musicOn, setMusicOn] = useState(() => loadBool("sb_music", true));
  const [sfxOn, setSfxOn] = useState(() => loadBool("sb_sfx", true));
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem("sb_theme") as Theme) || "arcade");
  const gestureBound = useRef(false);

  useEffect(() => {
    audio.sfxOn = sfxOn;
    audio.musicOn = musicOn;
    if (gestureBound.current) return;
    gestureBound.current = true;
    const onGesture = () => {
      audio.resume();
      if (audio.musicOn) audio.startMusic();
    };
    window.addEventListener("pointerdown", onGesture, { once: true });
    window.addEventListener("keydown", onGesture, { once: true });
  }, [musicOn, sfxOn]);

  const toggleMusic = useCallback(() => {
    setMusicOn((prev) => {
      const next = !prev;
      localStorage.setItem("sb_music", next ? "1" : "0");
      audio.setMusicOn(next);
      return next;
    });
  }, []);

  const toggleSfx = useCallback(() => {
    setSfxOn((prev) => {
      const next = !prev;
      localStorage.setItem("sb_sfx", next ? "1" : "0");
      audio.setSfxOn(next);
      if (next) audio.play("click");
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "neon" ? "arcade" : "neon";
      localStorage.setItem("sb_theme", next);
      audio.play("click");
      return next;
    });
  }, []);

  const adjustBalance = useCallback((delta: number) => {
    setBalance((prev) => Math.max(0, prev + delta));
  }, []);

  const recordBet = useCallback((bet: Omit<BetRecord, "id" | "time">) => {
    setBets((prev) => [{ ...bet, id: (prev[0]?.id ?? 0) + 1, time: Date.now() }, ...prev].slice(0, 100));
  }, []);

  const openBets = useCallback(() => setShowBets(true), []);

  const handleJoin = useCallback((tier: Tier) => {
    setBalance((prev) => Math.max(0, prev - tier.buyIn));
    setActiveTier(tier);
    setScreen("match");
  }, []);

  const purchaseCosmetic = useCallback((item: Cosmetic) => {
    if (ownedCosmetics.includes(item.id) || balance < item.price) return;
    setBalance((prev) => prev - item.price);
    setOwnedCosmetics((prev) => {
      const next = [...prev, item.id];
      saveOwnedCosmetics(next);
      return next;
    });
    setEquippedCosmetics((prev) => {
      const next: EquippedCosmetics = { ...prev };
      if (item.category === "scales") next.scales = item.id;
      else if (item.category === "clothing") next.clothing = item.id;
      else next.hat = item.id;
      saveEquippedCosmetics(next);
      return next;
    });
    audio.play("cash");
  }, [balance, ownedCosmetics]);

  const equipCosmetic = useCallback((item: Cosmetic) => {
    if (!ownedCosmetics.includes(item.id)) return;
    setEquippedCosmetics((prev) => {
      const next: EquippedCosmetics = { ...prev };
      if (item.category === "scales") next.scales = item.id;
      else if (item.category === "clothing") next.clothing = item.id;
      else next.hat = item.id;
      saveEquippedCosmetics(next);
      return next;
    });
    audio.play("click");
  }, [ownedCosmetics]);

  const unequipSlot = useCallback((category: "clothing" | "hat") => {
    setEquippedCosmetics((prev) => {
      const next = { ...prev, [category]: null };
      saveEquippedCosmetics(next);
      return next;
    });
    audio.play("click");
  }, []);

  const fabOptions = [
    {
      label: `Music ${musicOn ? "on" : "off"}`,
      Icon: musicOn ? <Music size={16} /> : <VolumeX size={16} />,
      onClick: toggleMusic,
      active: musicOn,
    },
    {
      label: `Sound ${sfxOn ? "on" : "off"}`,
      Icon: sfxOn ? <Volume2 size={16} /> : <VolumeX size={16} />,
      onClick: toggleSfx,
      active: sfxOn,
    },
    {
      label: theme === "arcade" ? "Switch to neon" : "Switch to arcade",
      Icon: theme === "neon" ? <Moon size={16} /> : <Sun size={16} />,
      onClick: toggleTheme,
      active: theme === "neon",
    },
    {
      label: "My bets",
      Icon: <Receipt size={16} />,
      onClick: openBets,
    },
  ];

  const fabPlacement = screen === "single" ? "single" : screen === "match" ? "match" : "default";

  return (
    <main className={`app-shell ${theme === "neon" ? "theme-neon" : "theme-arcade"} screen-${screen}`}>
      {screen === "menu" && (
        <HomeEntry
          balance={balance}
          theme={theme}
          username={username}
          onUsernameChange={setUsername}
          onSingle={() => setScreen("single")}
          onMultiplayer={() => setScreen("lobby")}
        />
      )}

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

      {screen === "lobby" && (
        <MultiplayerLobby
          balance={balance}
          username={username}
          ownedCosmetics={ownedCosmetics}
          equippedCosmetics={equippedCosmetics}
          onPurchaseCosmetic={purchaseCosmetic}
          onEquipCosmetic={equipCosmetic}
          onUnequipSlot={unequipSlot}
          onJoin={handleJoin}
          onExit={() => setScreen("menu")}
        />
      )}

      {screen === "match" && activeTier && (
        <MultiplayerGame
          tier={activeTier}
          balance={balance}
          username={username}
          equippedCosmetics={equippedCosmetics}
          theme={theme}
          onAdjustBalance={adjustBalance}
          onRecordBet={recordBet}
          onExit={() => setScreen("lobby")}
        />
      )}

      {showBets && <BetHistory bets={bets} onClose={() => setShowBets(false)} />}

      <FloatingActionMenu options={fabOptions} placement={fabPlacement} />
    </main>
  );
}
