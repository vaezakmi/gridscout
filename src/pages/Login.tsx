import { useEffect, useMemo, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Check,
  ArrowRight,
  ScanLine,
  Target,
  TrendingDown,
} from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadarLogo } from "@/components/RadarLogo";
import { fmtCompactKes } from "@/lib/format";

const APP_NAME = "GridScout";

/* ------------------------------ Helpers -------------------------------- */

type Mode = "signin" | "signup";
type OAuthProvider = "google" | "github" | "apple";

/** tRPC/zod errors often arrive as a JSON array string — turn them into something human. */
function friendlyError(err: unknown): string {
  const raw = (err as { message?: string })?.message;
  if (!raw) return "Something went wrong. Please try again.";
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed[0]?.message) return parsed[0].message;
  } catch {
    /* not JSON, fall through */
  }
  return raw;
}

/** Only allow same-origin relative redirects (blocks open-redirect attacks). */
function safeRedirect(target: string | null): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) return target;
  return "/";
}

function scorePassword(pw: string) {
  if (!pw) return { level: 0, label: "", bar: "bg-muted", text: "text-muted-foreground" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = score <= 1 ? 1 : score <= 2 ? 2 : score <= 4 ? 3 : 4;
  const meta = [
    { label: "", bar: "bg-muted", text: "text-muted-foreground" },
    { label: "Weak", bar: "bg-scout-red", text: "text-scout-red" },
    { label: "Fair", bar: "bg-scout-amber", text: "text-scout-amber" },
    { label: "Good", bar: "bg-scout-mint/70", text: "text-scout-mint" },
    { label: "Strong", bar: "bg-scout-mint", text: "text-scout-mint" },
  ][level];
  return { level, ...meta };
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ----------------------------- Brand icons ----------------------------- */

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.62c.02 2.2 1.93 2.93 1.95 2.94-.02.05-.3 1.03-1 2.04-.6.88-1.23 1.75-2.22 1.77-.97.02-1.28-.58-2.39-.58-1.1 0-1.45.56-2.37.6-.95.03-1.68-.96-2.28-1.83-1.24-1.79-2.19-5.06-.92-7.27.63-1.1 1.76-1.8 2.98-1.82.93-.02 1.8.63 2.37.63.57 0 1.63-.78 2.75-.67.47.02 1.79.19 2.63 1.43-.07.04-1.57.92-1.5 2.76Zm-1.83-5.62c.5-.6.83-1.44.74-2.28-.72.03-1.6.48-2.12 1.08-.46.53-.86 1.39-.75 2.21.8.06 1.63-.41 2.13-1.01Z" />
    </svg>
  );
}

/* ------------------------------ Brand panel ---------------------------- */

const BOOT_LINES = [
  "uplink established · sector grid online",
  "sweeping westlands · 214 businesses indexed",
  "visibility assessed · 3 invisible targets flagged",
  "leak pricing computed · KES 95–140K / mo",
  "fix plan drafted · quote ready for whatsapp",
  "awaiting operator sign-in…",
] as const;

const FEATURES = [
  { icon: ScanLine, title: "Sector scans", text: "Every business scored 0–100 on Maps and web presence." },
  { icon: Target, title: "Fix plans & quotes", text: "Itemised packages and a WhatsApp-ready quote per lead." },
  { icon: TrendingDown, title: "Revenue leak pricing", text: "Searches × missed capture × ticket size, in KES." },
] as const;

function BootLog() {
  const reduced = usePrefersReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) {
      setTick(BOOT_LINES.length);
      return;
    }
    const id = setInterval(() => setTick((t) => (t + 1) % (BOOT_LINES.length + 3)), 1600);
    return () => clearInterval(id);
  }, [reduced]);

  const shown = BOOT_LINES.slice(0, Math.min(tick, BOOT_LINES.length));

  return (
    <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-[11px] leading-relaxed text-zinc-400">
      <div className="mb-2 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-zinc-600">
        <span>gridscout · live feed</span>
        <span className="flex items-center gap-1.5">
          <span className="led" aria-hidden="true" />
          online
        </span>
      </div>
      {shown.map((line, i) => (
        <p key={line} className="gs-rise">
          <span className="text-primary">&gt;</span> {line}
          {i === shown.length - 1 && (
            <span className="gs-blink ml-1 inline-block h-3 w-1.5 translate-y-0.5 bg-primary" aria-hidden="true" />
          )}
        </p>
      ))}
    </div>
  );
}

function BrandStats() {
  const { data: stats } = trpc.grid.stats.useQuery();

  return (
    <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-5">
      <div>
        <div className="font-display text-2xl font-bold tabular-nums">
          {stats?.businessesIndexed ?? "—"}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-zinc-500">
          Businesses indexed
        </div>
      </div>
      <div>
        <div className="font-display text-2xl font-bold tabular-nums text-scout-red">
          {stats ? (stats.visibilityAssessedCount > 0 ? stats.invisibleCount : "—") : "—"}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-zinc-500">
          Invisible targets
        </div>
      </div>
      <div>
        <div className="font-display text-2xl font-bold tabular-nums text-scout-amber">
          {stats ? (stats.revenueAssessedCount > 0 ? fmtCompactKes(stats.totalLostRevenueKes) : "—") : "—"}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-zinc-500">
          Est. gap / mo
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-[#080f1b] text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Ambient field: orbs + grid + scanlines */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="gs-orb absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
        <div className="gs-orb gs-orb-delay absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-scout-orange/15 blur-3xl" />
        <div className="gs-orb gs-orb-delay-2 absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-scout-mint/10 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary) / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.35) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 25%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 25%, transparent 75%)",
          }}
        />
        <div className="scanlines absolute inset-0" />
      </div>

      <div className="relative z-10 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <RadarLogo size={26} />
        <span className="font-display uppercase tracking-[0.26em]">
          Grid<span className="text-primary">Scout</span>
        </span>
      </div>

      <div className="relative z-10 max-w-md space-y-8">
        <h2 className="text-4xl font-semibold leading-tight tracking-tight">
          Find the{" "}
          <span className="bg-gradient-to-r from-primary to-scout-mint bg-clip-text text-transparent">
            opportunity.
          </span>
          <br />
          Own the relationship.
        </h2>

        <ul className="space-y-5">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-zinc-400">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <BootLog />
        <BrandStats />
      </div>

      <p className="relative z-10 text-xs text-zinc-500">
        © {new Date().getFullYear()} {APP_NAME} · Spatial SEO Intelligence
      </p>
    </aside>
  );
}

/* ------------------------------ Form pieces ---------------------------- */

function ModeTabs({ mode, onChange, disabled }: { mode: Mode; onChange: (m: Mode) => void; disabled: boolean }) {
  return (
    <div
      role="group"
      aria-label="Authentication mode"
      className="relative grid grid-cols-2 rounded-lg border border-border bg-secondary/50 p-1 text-sm font-medium"
    >
      <div
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-background shadow-sm transition-transform duration-300 ease-out"
        style={{ transform: mode === "signup" ? "translateX(100%)" : "translateX(0)" }}
      />
      {(["signin", "signup"] as const).map((m) => (
        <button
          key={m}
          type="button"
          aria-pressed={mode === m}
          disabled={disabled}
          onClick={() => onChange(m)}
          className={`relative z-10 cursor-pointer rounded-md py-1.5 transition-colors disabled:cursor-default ${
            mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {m === "signin" ? "Sign in" : "Sign up"}
        </button>
      ))}
    </div>
  );
}

function PasswordField({
  value,
  onChange,
  show,
  onToggleShow,
  isSignup,
  disabled,
  onForgotPassword,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  isSignup: boolean;
  disabled: boolean;
  onForgotPassword: () => void;
}) {
  const [capsLock, setCapsLock] = useState(false);
  const strength = useMemo(() => scorePassword(value), [value]);

  const trackCapsLock = (e: KeyboardEvent<HTMLInputElement>) =>
    setCapsLock(e.getModifierState("CapsLock"));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="password">Password</Label>
        {!isSignup && (
          <button
            type="button"
            className="cursor-pointer text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={onForgotPassword}
          >
            Forgot password?
          </button>
        )}
      </div>

      <div className="relative">
        <Input
          id="password"
          name="password"
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={trackCapsLock}
          onKeyUp={trackCapsLock}
          onBlur={() => setCapsLock(false)}
          placeholder="••••••••"
          autoComplete={isSignup ? "new-password" : "current-password"}
          minLength={8}
          required
          disabled={disabled}
          className="pr-10"
          aria-describedby="password-help"
        />
        <button
          type="button"
          onClick={onToggleShow}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 cursor-pointer -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
          disabled={disabled}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>

      <div id="password-help" className="space-y-2">
        {capsLock && (
          <p className="flex items-center gap-1.5 text-xs text-scout-amber">
            <AlertCircle className="h-3.5 w-3.5" /> Caps Lock is on
          </p>
        )}

        {isSignup && (
          <div className="space-y-1.5">
            <div className="flex gap-1" aria-hidden="true">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    strength.level >= i ? strength.bar : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                {value.length >= 8 && <Check className="h-3 w-3 text-scout-mint" />}
                At least 8 characters
              </span>
              {strength.label && (
                <span aria-live="polite" className={strength.text}>
                  {strength.label}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OAuthButtons({ onProvider, disabled }: { onProvider: (p: OAuthProvider) => void; disabled: boolean }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" type="button" className="gap-2" onClick={() => onProvider("google")} disabled={disabled}>
          <GoogleIcon /> Google
        </Button>
        <Button variant="outline" type="button" className="gap-2" onClick={() => onProvider("github")} disabled={disabled}>
          <GithubIcon /> GitHub
        </Button>
      </div>
      <Button variant="outline" type="button" className="w-full gap-2" onClick={() => onProvider("apple")} disabled={disabled}>
        <AppleIcon /> Continue with Apple
      </Button>
    </div>
  );
}

/* -------------------------------- Page --------------------------------- */

export default function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const utils = trpc.useUtils();

  const signinMutation = trpc.auth.signin.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();

  const isSignup = mode === "signup";
  const isLoading = signinMutation.isPending || signupMutation.isPending;

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword("");
    setShowPassword(false);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    try {
      if (isSignup) {
        await signupMutation.mutateAsync({ name: name.trim(), email: email.trim(), password });
      } else {
        await signinMutation.mutateAsync({ email: email.trim(), password });
      }
      await utils.auth.me.invalidate();
      navigate(safeRedirect(searchParams.get("redirect")), { replace: true });
    } catch (err) {
      setError(friendlyError(err));
    }
  };

  const oauth = (provider: OAuthProvider) => {
    const redirect = searchParams.get("redirect");
    const qs = redirect ? `?redirect=${encodeURIComponent(safeRedirect(redirect))}` : "";
    window.location.href = `/api/oauth/${provider}${qs}`;
  };

  return (
    <>
      <style>{`
        @keyframes gs-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-40px,0) scale(1.12); } }
        @keyframes gs-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gs-shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
        @keyframes gs-blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }
        .gs-orb { animation: gs-float 14s ease-in-out infinite; }
        .gs-orb-delay { animation-delay: -5s; }
        .gs-orb-delay-2 { animation-delay: -9s; }
        .gs-rise { animation: gs-rise .5s ease-out both; }
        .gs-shake { animation: gs-shake .4s ease-in-out; }
        .gs-blink { animation: gs-blink 1.1s step-end infinite; }
        @media (prefers-reduced-motion: reduce) {
          .gs-orb, .gs-rise, .gs-shake, .gs-blink { animation: none; }
        }
      `}</style>

      <div className="grid min-h-screen lg:grid-cols-2">
        <BrandPanel />

        <main className="relative flex items-center justify-center bg-background p-6 sm:p-10">
          <div className="gs-rise w-full max-w-sm space-y-7">
            {/* Mobile brand */}
            <div className="flex items-center justify-center gap-2 text-lg font-semibold tracking-tight lg:hidden">
              <RadarLogo size={22} />
              <span className="font-display uppercase tracking-[0.26em]">
                Grid<span className="text-primary">Scout</span>
              </span>
            </div>

            <div className="space-y-2 text-center lg:text-left">
              <h1 className="text-3xl font-semibold tracking-tight">
                {isSignup ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSignup
                  ? "Start with one free lead credit. No credit card required."
                  : "Your sectors are waiting. Pick up where you left off."}
              </p>
            </div>

            <ModeTabs mode={mode} onChange={switchMode} disabled={isLoading} />

            {/* Error banner — key remount re-triggers the shake on new errors */}
            <div aria-live="assertive" className="empty:hidden">
              {error && (
                <div
                  key={error}
                  role="alert"
                  className="gs-shake flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <OAuthButtons onProvider={oauth} disabled={isLoading} />

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs uppercase tracking-wider text-muted-foreground">
                or with email
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignup && (
                <div className="gs-rise space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    autoComplete="name"
                    required
                    disabled={isLoading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  disabled={isLoading}
                />
              </div>

              <PasswordField
                value={password}
                onChange={setPassword}
                show={showPassword}
                onToggleShow={() => setShowPassword((v) => !v)}
                isSignup={isSignup}
                disabled={isLoading}
                onForgotPassword={() => navigate("/forgot-password")}
              />

              <Button type="submit" size="lg" className="group w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Establishing uplink…
                  </>
                ) : (
                  <>
                    {isSignup ? "Create account" : "Sign in"}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground">
              {isSignup ? (
                <>
                  By signing up you agree to our{" "}
                  <a href="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</a> and{" "}
                  <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</a>.
                </>
              ) : (
                <>
                  Signals encrypted end to end.{" "}
                  <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy</a>
                </>
              )}
            </p>
          </div>
        </main>
      </div>
    </>
  );
}