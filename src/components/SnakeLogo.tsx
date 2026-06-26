type Props = { size?: number; className?: string };

export function SnakeLogo({ size = 22, className = "" }: Props) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M6 24c0-5 5-6 10-6 4 0 8-1 8-4s-3-5-7-5c-3 0-5-1-5-3"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="7" cy="24" r="3.2" fill="currentColor" />
      <circle cx="8.2" cy="23.2" r="0.85" fill="#14120e" />
      <path d="M10 24.5c1.2 0.4 2.4 0.6 3.6 0.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
