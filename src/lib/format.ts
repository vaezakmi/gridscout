export function fmtKes(n: number): string {
  return (
    "KES " +
    n.toLocaleString("en-KE", { maximumFractionDigits: 0 })
  );
}

export function fmtCompactKes(n: number): string {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n}`;
}

export function scoreColor(v: number): string {
  if (v < 35) return "hsl(0 91% 70%)"; // red
  if (v < 65) return "hsl(43 96% 60%)"; // amber
  return "hsl(160 84% 55%)"; // mint
}
