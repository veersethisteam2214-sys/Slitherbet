import LiquidGlass from "liquid-glass-react";
import type { CSSProperties, ReactNode } from "react";

type LiquidGlassPanelProps = {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  cornerRadius?: number;
  onClick?: () => void;
  style?: CSSProperties;
  padding?: string;
};

export function LiquidGlassPanel({
  children,
  className = "",
  elevated,
  cornerRadius = 18,
  onClick,
  style,
  padding,
}: LiquidGlassPanelProps) {
  return (
    <LiquidGlass
      className={`liquid-glass-panel ${elevated ? "liquid-glass-panel--elevated" : ""} ${className}`.trim()}
      cornerRadius={cornerRadius}
      blurAmount={0.07}
      saturation={125}
      elasticity={0.28}
      displacementScale={44}
      aberrationIntensity={1.4}
      mode="standard"
      padding={padding}
      style={style}
      onClick={onClick}
    >
      {children}
    </LiquidGlass>
  );
}
