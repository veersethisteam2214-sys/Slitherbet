import type { InputHTMLAttributes, ReactNode } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: string;
  hintOk?: boolean;
};

export function Input({ label, hint, hintOk, className = "", id, ...props }: InputProps) {
  return (
    <div className="ui-field">
      {label ? (
        <label className="ui-field__label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      <input id={id} className={["ui-input", className].filter(Boolean).join(" ")} {...props} />
      {hint ? <p className={`ui-field__hint ${hintOk ? "ok" : ""}`}>{hint}</p> : null}
    </div>
  );
}
