import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "subtle";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: ReactNode;
  wide?: boolean;
};

export function Button({
  variant = "ghost",
  icon,
  wide,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const cls = ["ui-btn", `ui-btn--${variant}`, wide ? "ui-btn--wide" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} type="button" {...props}>
      {icon ? <span className="ui-btn__icon">{icon}</span> : null}
      {children}
    </button>
  );
}
