export function RadarToggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex w-full cursor-pointer items-center gap-3 py-1.5 text-left"
    >
      <span
        className={`relative inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all duration-150 ${
          checked
            ? "border-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]"
            : "border-border group-hover:border-primary/50"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full transition-all duration-150 ${
            checked ? "bg-primary" : "bg-transparent group-hover:bg-primary/30"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span
          className={`block font-mono text-[11px] uppercase tracking-[0.16em] transition-colors ${
            checked ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
          }`}
        >
          {label}
        </span>
        {hint && <span className="block truncate text-[10px] text-muted-foreground/70">{hint}</span>}
      </span>
    </button>
  );
}
