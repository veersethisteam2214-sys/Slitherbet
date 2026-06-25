import { Check, Lock, Shirt, Sparkles, Crown, Layers } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "../shared";
import { drawCosmeticPreview } from "./RealisticSnakeRenderer";
import {
  cosmeticById,
  cosmeticsByCategory,
  equippedSummary,
  type Cosmetic,
  type CosmeticCategory,
  type EquippedCosmetics,
} from "../snakeSkins";

type SnakeSkinShopProps = {
  balance: number;
  owned: string[];
  equipped: EquippedCosmetics;
  onPurchase: (item: Cosmetic) => void;
  onEquip: (item: Cosmetic) => void;
  onUnequip: (category: "clothing" | "hat") => void;
};

const TABS: { id: CosmeticCategory; label: string; Icon: typeof Layers; slot: keyof EquippedCosmetics }[] = [
  { id: "scales", label: "Scales", Icon: Layers, slot: "scales" },
  { id: "clothing", label: "Clothing", Icon: Shirt, slot: "clothing" },
  { id: "hat", label: "Hats", Icon: Crown, slot: "hat" },
];

function slotLabel(eq: EquippedCosmetics, slot: keyof EquippedCosmetics) {
  if (slot === "scales") return cosmeticById(eq.scales)?.name ?? "Natural";
  const id = eq[slot];
  if (!id) return "None";
  return cosmeticById(id)?.name ?? "None";
}

function HeroPreview({
  preview,
  isPreviewing,
}: {
  preview: EquippedCosmetics;
  isPreviewing: boolean;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const previewRef = useRef(preview);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      drawCosmeticPreview(ctx, previewRef.current, canvas.width, canvas.height, (now - start) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="cosmetic-hero">
      <span className="cosmetic-hero-tag">Base serpent</span>
      <canvas ref={ref} className="cosmetic-hero-canvas" width={320} height={160} />
      <p className={`cosmetic-hero-caption ${isPreviewing ? "previewing" : ""}`}>
        {isPreviewing ? "Preview · " : "Equipped · "}
        {equippedSummary(preview)}
      </p>
    </div>
  );
}

export function SnakeSkinShop({ balance, owned, equipped, onPurchase, onEquip, onUnequip }: SnakeSkinShopProps) {
  const [tab, setTab] = useState<CosmeticCategory>("scales");
  const [hoverId, setHoverId] = useState<string | null>(null);

  const previewEquipped = useMemo((): EquippedCosmetics => {
    if (!hoverId) return equipped;
    const item = cosmeticById(hoverId);
    if (!item) return equipped;
    if (item.category === "scales") return { ...equipped, scales: item.id };
    if (item.category === "clothing") return { ...equipped, clothing: item.id };
    return { ...equipped, hat: item.id };
  }, [equipped, hoverId]);

  const items = cosmeticsByCategory(tab);
  const isPreviewing = hoverId !== null;

  const isEquipped = (item: Cosmetic) => {
    if (item.category === "scales") return equipped.scales === item.id;
    if (item.category === "clothing") return equipped.clothing === item.id;
    return equipped.hat === item.id;
  };

  return (
    <section className="skin-shop cosmetic-shop">
      <div className="skin-shop-head">
        <span className="eyebrow"><Sparkles size={12} /> Snake forge</span>
        <h2>Dress your serpent</h2>
        <p className="skin-shop-sub">One base snake — branch out with scales, clothing, and hats that layer on top.</p>
      </div>

      <HeroPreview preview={previewEquipped} isPreviewing={isPreviewing} />

      <div className="cosmetic-slots">
        {TABS.map(({ id, label, Icon, slot }) => (
          <button
            key={id}
            type="button"
            className={`cosmetic-slot ${tab === id ? "active" : ""}`}
            onClick={() => { setTab(id); setHoverId(null); }}
          >
            <Icon size={13} />
            <span className="slot-label">{label}</span>
            <strong>{slotLabel(equipped, slot)}</strong>
          </button>
        ))}
      </div>

      <div className="cosmetic-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? "active" : ""}
            onClick={() => { setTab(id); setHoverId(null); }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {(tab === "clothing" || tab === "hat") && (
        <button
          className={`cosmetic-none ${((tab === "clothing" && !equipped.clothing) || (tab === "hat" && !equipped.hat)) ? "active" : ""}`}
          type="button"
          onClick={() => onUnequip(tab)}
        >
          None
        </button>
      )}

      <ul className="skin-grid cosmetic-grid">
        {items.map((item) => {
          const has = owned.includes(item.id);
          const active = isEquipped(item);
          const canBuy = !has && balance >= item.price;
          return (
            <li
              key={item.id}
              className={`skin-card ${active ? "equipped" : ""} ${has ? "owned" : "locked"}`}
              onMouseEnter={() => setHoverId(item.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <div className="cosmetic-chip">
                <span className={`cosmetic-dot ${item.category}`} />
                <strong>{item.name}</strong>
              </div>
              <span className="skin-tags">
                {item.pattern ?? item.clothingStyle ?? item.hatStyle}
              </span>
              {active ? (
                <span className="skin-badge equipped"><Check size={13} /> Equipped</span>
              ) : has ? (
                <button className="ghost-button skin-btn" type="button" onClick={() => onEquip(item)}>
                  Equip
                </button>
              ) : (
                <button
                  className="primary-action skin-btn"
                  type="button"
                  disabled={!canBuy}
                  onClick={() => onPurchase(item)}
                >
                  {item.price === 0 ? "Included" : canBuy ? `Buy · ${formatMoney(item.price)}` : <><Lock size={13} /> {formatMoney(item.price)}</>}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default SnakeSkinShop;
