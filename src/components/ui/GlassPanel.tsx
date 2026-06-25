import type { HTMLAttributes, ReactNode } from "react";

type GlassPanelProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  elevated?: boolean;
};

export function GlassPanel({ children, elevated, className = "", ...props }: GlassPanelProps) {
  const cls = ["ui-glass", elevated ? "ui-glass--elevated" : "", className].filter(Boolean).join(" ");
  return (
    <div className={cls} {...props}>
      {children}
    </div>
  );
}
