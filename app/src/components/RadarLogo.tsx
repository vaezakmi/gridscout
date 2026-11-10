export function RadarLogo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="16" cy="16" r="14.5" stroke="hsl(var(--border))" />
      <circle cx="16" cy="16" r="9" stroke="hsl(var(--border))" />
      <circle cx="16" cy="16" r="3.5" stroke="hsl(var(--primary))" />
      <g className="origin-center" style={{ animation: "radar-sweep 4.2s linear infinite" }}>
        <path d="M16 16 L16 1.5 A14.5 14.5 0 0 1 26.3 5.7 Z" fill="hsl(var(--primary) / 0.35)" />
        <line x1="16" y1="16" x2="16" y2="1.5" stroke="hsl(var(--primary))" strokeWidth="1.2" />
      </g>
      <circle cx="22.5" cy="11" r="1.6" fill="hsl(var(--scout-mint))" />
      <circle cx="10" cy="21" r="1.6" fill="hsl(var(--scout-amber))" />
    </svg>
  );
}
