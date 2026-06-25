import { Settings, X } from "lucide-react";
import { useState, type ReactNode } from "react";

export type FabOption = {
  label: string;
  Icon: ReactNode;
  onClick: () => void;
  active?: boolean;
};

type FloatingActionMenuProps = {
  options: FabOption[];
};

export function FloatingActionMenu({ options }: FloatingActionMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`fab ${open ? "open" : ""}`}>
      <div className="fab-options" role="menu" aria-hidden={!open}>
        {options.map((option, index) => (
          <button
            key={option.label}
            className={`fab-item ${option.active ? "active" : ""}`}
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            style={{ transitionDelay: `${open ? index * 40 : 0}ms` }}
            onClick={option.onClick}
          >
            <span className="fab-item-icon">{option.Icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <button
        className="fab-trigger"
        type="button"
        aria-label={open ? "Close settings" : "Open settings"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X size={20} /> : <Settings size={20} />}
      </button>
    </div>
  );
}

export default FloatingActionMenu;
