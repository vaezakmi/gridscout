import { scoreBand, type ScoreBand } from "@contracts/grid";

const BAND_COLOR: Record<ScoreBand, string> = {
  invisible: "hsl(0 91% 70%)",  // red
  weak:      "hsl(43 96% 60%)", // amber
  strong:    "hsl(160 84% 55%)", // mint
};

// Thresholds live in the contract (SCORE_BANDS); this only maps band -> color
export function scoreColor(v: number): string {
  return BAND_COLOR[scoreBand(v)];
}

const safe = (n: number) => (Number.isFinite(n) ? n : 0);

export function fmtKes(n: number): string {
  return "KES " + Math.round(safe(n)).toLocaleString("en-KE");
}

export function fmtCompactKes(n: number): string {
  const v = safe(n);
  const sign = v < 0 ? "-" : "";
  const abs = Math.abs(v);

  // 999_500+ would round to "1000K", so promote it to M
  if (abs >= 999_500) return `${sign}KES ${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}KES ${Math.round(abs / 1_000)}K`;
  return `${sign}KES ${Math.round(abs)}`;
}