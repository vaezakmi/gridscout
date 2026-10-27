import { scoreColor } from "@/lib/format";

export function ScoreRing({
  score,
  size = 64,
  label = "VIS",
}: {
  score: number;
  size?: number;
  label?: string;
}) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, score / 100));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="2.5" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scoreColor(score)}
          strokeWidth="2.5"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          strokeLinecap="butt"
          style={{ transition: "stroke-dashoffset 0.6s ease-out, stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold leading-none" style={{ fontSize: size * 0.28, color: scoreColor(score) }}>
          {score}
        </span>
        <span className="font-mono text-[8px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
