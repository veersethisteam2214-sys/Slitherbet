import { Check, Lock, Sparkles } from "lucide-react";
import { useEffect, useRef } from "react";
import { formatMoney } from "../shared";
import { drawSkinPreview } from "./RealisticSnakeRenderer";
import { snakeSkins, skinById, type SnakeSkin } from "../snakeSkins";

type SnakeSkinShopProps = {
  balance: number;
  owned: string[];
  equipped: string;
  onPurchase: (skin: SnakeSkin) => void;
  onEquip: (skinId: string) => void;
};

function PreviewCanvas({ skin }: { skin: SnakeSkin }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawSkinPreview(ctx, skin, canvas.width, canvas.height);
  }, [skin]);
  return <canvas ref={ref} className="skin-preview-canvas" width={120} height={72} />;
}

export function SnakeSkinShop({ balance, owned, equipped, onPurchase, onEquip }: SnakeSkinShopProps) {
  return (
    <section className="skin-shop">
      <div className="skin-shop-head">
        <span className="eyebrow"><Sparkles size={12} /> Snake forge</span>
        <h2>Equip your serpent</h2>
        <p className="skin-shop-sub">Unlock scales, body types, and colorways. Only your snake wears what you buy.</p>
      </div>
      <ul className="skin-grid">
        {snakeSkins.map((skin) => {
          const has = owned.includes(skin.id);
          const active = equipped === skin.id;
          const canBuy = !has && balance >= skin.price;
          return (
            <li key={skin.id} className={`skin-card ${active ? "equipped" : ""} ${has ? "owned" : "locked"}`}>
              <PreviewCanvas skin={skin} />
              <div className="skin-meta">
                <strong>{skin.name}</strong>
                <span className="skin-tags">
                  {skin.scalePattern} · {skin.bodyStyle}
                </span>
              </div>
              {active ? (
                <span className="skin-badge equipped"><Check size={13} /> Equipped</span>
              ) : has ? (
                <button className="ghost-button skin-btn" type="button" onClick={() => onEquip(skin.id)}>
                  Equip
                </button>
              ) : (
                <button
                  className="primary-action skin-btn"
                  type="button"
                  disabled={!canBuy}
                  onClick={() => onPurchase(skin)}
                >
                  {skin.price === 0 ? "Free" : canBuy ? `Buy · ${formatMoney(skin.price)}` : <><Lock size={13} /> {formatMoney(skin.price)}</>}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="skin-equipped-note">
        Wearing <strong>{skinById(equipped).name}</strong> into the next table.
      </p>
    </section>
  );
}
