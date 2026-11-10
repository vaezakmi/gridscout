import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Loader2, AlertCircle, Check, ArrowRight, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const APP_NAME = "GridSCOUT";

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

/* ------------------------------ Helpers -------------------------------- */

type Mode = "signin" | "signup";

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
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = Math.min(4, Math.max(pw.length ? 1 : 0, Math.ceil(score * 0.8)));
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["bg-muted", "bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-emerald-500"];
  return { level, label: labels[level], color: colors[level] };
}

/* ------------------------------ Components ----------------------------- */

function BrandPanel() {
  const features = [
    { icon: Zap, title: "Lightning fast", text: "Get set up in seconds, not days." },
    { icon: ShieldCheck, title: "Secure by default", text: "Your data is encrypted end to end." },
    { icon: Sparkles, title: "Built to delight", text: "Every detail, obsessively polished." },
  ];

  return (
    <aside className="relative hidden overflow-hidden bg-zinc-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* Animated aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="login-orb absolute -left-24 -top-24 h-96 w-96 rounded-full bg-violet-600/40 blur-3xl" />
        <div className="login-orb login-orb-delay absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-sky-500/30 blur-3xl" />
        <div className="login-orb login-orb-delay-2 absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.4) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative z-10 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-950">
          <Sparkles className="h-4 w-4" />
        </div>
        {APP_NAME}
      </div>

      <div className="relative z-10 max-w-md space-y-8">
        <h2 className="text-4xl font-semibold leading-tight tracking-tight">
          Build something{" "}
          <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
            legendary
          </span>
          .
        </h2>
        <ul className="space-y-5">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 backdrop-blur">
                <Icon className="h-5 w-5 text-violet-300" />
              </div>
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-zinc-400">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-zinc-500">
        © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </p>
    </aside>
  );
}

function ModeTabs({ mode, onChange, disabled }: { mode: Mode; onChange: (m: Mode) => void; disabled: boolean }) {
  return (
    <div role="tablist" aria-label="Authentication mode" className="relative grid grid-cols-2 rounded-lg bg-muted p-1 text-sm font-medium">
      <div
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-background shadow-sm transition-transform duration-300 ease-out"
        style={{ transform: mode === "signup" ? "translateX(100%)" : "translateX(0)" }}
      />
      {(["signin", "signup"] as const).map((m) => (
        <button
          key={m}
          role="tab"
          type="button"
          aria-selected={mode === m}
          disabled={disabled}
          onClick={() => onChange(m)}
          className={`relative z-10 rounded-md py-1.5 transition-colors ${
            mode === m ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {m === "signin" ? "Sign in" : "Sign up"}
        </button>
      ))}
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
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const utils = trpc.useUtils();

  const signinMutation = trpc.auth.signin.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();

  const isSignup = mode === "signup";
  const isLoading = signinMutation.isPending || signupMutation.isPending;
  const strength = useMemo(() => scorePassword(password), [password]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setPassword("");
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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

  const oauth = (provider: "google" | "github" | "apple") => {
    const redirect = searchParams.get("redirect");
    const qs = redirect ? `?redirect=${encodeURIComponent(safeRedirect(redirect))}` : "";
    window.location.href = `/api/oauth/${provider}${qs}`;
  };

  return (
    <>
      <style>{`
        @keyframes login-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(30px,-40px,0) scale(1.12); } }
        @keyframes login-rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes login-shake { 0%,100% { transform: translateX(0); } 20%,60% { transform: translateX(-6px); } 40%,80% { transform: translateX(6px); } }
        .login-orb { animation: login-float 14s ease-in-out infinite; }
        .login-orb-delay { animation-delay: -5s; }
        .login-orb-delay-2 { animation-delay: -9s; }
        .login-rise { animation: login-rise .5s ease-out both; }
        .login-shake { animation: login-shake .4s ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .login-orb, .login-rise, .login-shake { animation: none; }
        }
      `}</style>

      <div className="grid min-h-screen lg:grid-cols-2">
        <BrandPanel />

        <main className="relative flex items-center justify-center bg-background p-6 sm:p-10">
          <div className="login-rise w-full max-w-sm space-y-7">
            {/* Mobile brand */}
            <div className="flex items-center justify-center gap-2 text-lg font-semibold tracking-tight lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background">
                <Sparkles className="h-4 w-4" />
              </div>
              {APP_NAME}
            </div>

            <div className="space-y-2 text-center lg:text-left">
              <h1 className="text-3xl font-semibold tracking-tight">
                {isSignup ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isSignup ? "Start in seconds. No credit card required." : "Sign in to pick up right where you left off."}
              </p>
            </div>

            <ModeTabs mode={mode} onChange={switchMode} disabled={isLoading} />

            {/* Error banner */}
            <div aria-live="assertive" className="empty:hidden">
              {error && (
                <div
                  key={error}
                  role="alert"
                  className="login-shake flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* OAuth */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" type="button" className="gap-2" onClick={() => oauth("google")} disabled={isLoading}>
                  <GoogleIcon /> Google
                </Button>
                <Button variant="outline" type="button" className="gap-2" onClick={() => oauth("github")} disabled={isLoading}>
                  <GithubIcon /> GitHub
                </Button>
              </div>
              <Button variant="outline" type="button" className="w-full gap-2" onClick={() => oauth("apple")} disabled={isLoading}>
                <AppleIcon /> Continue with Apple
              </Button>
            </div>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs uppercase tracking-wider text-muted-foreground">
                or with email
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate={false}>
              {isSignup && (
                <div className="login-rise space-y-2">
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isSignup && (
                    <button
                      type="button"
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      onClick={() => navigate("/forgot-password")}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                    placeholder="••••••••"
                    autoComplete={isSignup ? "new-password" : "current-password"}
                    minLength={8}
                    required
                    disabled={isLoading}
                    className="pr-10"
                    aria-describedby="password-help"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div id="password-help" className="space-y-2">
                  {capsLock && (
                    <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                      <AlertCircle className="h-3.5 w-3.5" /> Caps Lock is on
                    </p>
                  )}

                  {isSignup && (
                    <div className="space-y-1.5">
                      <div className="flex gap-1" aria-hidden>
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                              strength.level >= i ? strength.color : "bg-muted"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          {password.length >= 8 && <Check className="h-3 w-3 text-emerald-500" />}
                          At least 8 characters
                        </span>
                        {strength.label && <span aria-live="polite">{strength.label}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" size="lg" className="group w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isSignup ? "Creating account…" : "Signing in…"}
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
                  Protected by industry-standard encryption.{" "}
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