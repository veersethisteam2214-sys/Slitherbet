import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

type ModeCardProps = {
  kicker: ReactNode;
  stat: string;
  title: string;
  description: string;
  points: ReactNode[];
  cta: string;
  accent?: "default" | "warm";
  disabled?: boolean;
  onClick: () => void;
};

export function ModeCard({
  kicker,
  stat,
  title,
  description,
  points,
  cta,
  accent = "default",
  disabled,
  onClick,
}: ModeCardProps) {
  return (
    <button
      className={`ui-mode-card ui-mode-card--${accent}`}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      <div className="ui-mode-card__top">
        <span className="ui-mode-card__kicker">{kicker}</span>
        <span className="ui-mode-card__stat">{stat}</span>
      </div>
      <h3 className="ui-mode-card__title">{title}</h3>
      <p className="ui-mode-card__desc">{description}</p>
      <ul className="ui-mode-card__points">
        {points.map((point, i) => (
          <li key={i}>{point}</li>
        ))}
      </ul>
      <span className="ui-mode-card__cta">
        {cta} <ChevronRight size={15} />
      </span>
    </button>
  );
}
