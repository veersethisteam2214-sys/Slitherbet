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
    <div className={`liquid-glass-shell ${className}`.trim()}>
      <LiquidGlass
        className={`liquid-glass-panel ${elevated ? "liquid-glass-panel--elevated" : ""}`.trim()}
        cornerRadius={cornerRadius}
        blurAmount={0.07}
        saturation={125}
        elasticity={0.28}
        displacementScale={44}
        aberrationIntensity={1.4}
        mode="standard"
        padding={padding}
        style={{
          position: "relative",
          top: "auto",
          left: "auto",
          transform: "none",
          width: "100%",
          ...style,
        }}
        onClick={onClick}
      >
        {children}
      </LiquidGlass>
    </div>
  );
}
