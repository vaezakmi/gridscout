import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/providers/trpc"; // <-- Fixed path
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.55v-1.94c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.18 1.84 1.18 3.1 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16.37 12.62c.02 2.2 1.93 2.93 1.95 2.94-.02.05-.3 1.03-1 2.04-.6.88-1.23 1.75-2.22 1.77-.97.02-1.28-.58-2.39-.58-1.1 0-1.45.56-2.37.6-.95.03-1.68-.96-2.28-1.83-1.24-1.79-2.19-5.06-.92-7.27.63-1.1 1.76-1.8 2.98-1.82.93-.02 1.8.63 2.37.63.57 0 1.63-.78 2.75-.67.47.02 1.79.19 2.63 1.43-.07.04-1.57.92-1.5 2.76Zm-1.83-5.62c.5-.6.83-1.44.74-2.28-.72.03-1.6.48-2.12 1.08-.46.53-.86 1.39-.75 2.21.8.06 1.63-.41 2.13-1.01Z" />
    </svg>
  );
}

type Mode = "signin" | "signup";

export default function Login() {
  const [mode, setMode] = useState<Mode>("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const signinMutation = trpc.auth.signin.useMutation();
  const signupMutation = trpc.auth.signup.useMutation();

  const isSignup = mode === "signup";
  const isLoading = signinMutation.isPending || signupMutation.isPending;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries()) as any;

    try {
      if (isSignup) {
        await signupMutation.mutateAsync({
          name: data.name,
          email: data.email,
          password: data.password,
        });
      } else {
        await signinMutation.mutateAsync({
          email: data.email,
          password: data.password,
        });
      }
      
      // Invalidate the auth.me query so the app knows we are logged in
      await utils.auth.me.invalidate();
      
      // Redirect to dashboard/home
      navigate("/");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">
            {isSignup ? "Create an account" : "Welcome back"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isSignup
              ? "Sign up to get started in seconds"
              : "Sign in to continue to your account"}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Social / OAuth methods */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="gap-2" 
                type="button"
                onClick={() => { window.location.href = "/api/oauth/google"; }}
                disabled={isLoading}
              >
                <GoogleIcon />
                Google
              </Button>
              <Button 
                variant="outline" 
                className="gap-2" 
                type="button"
                onClick={() => { window.location.href = "/api/oauth/github"; }}
                disabled={isLoading}
              >
                <GithubIcon />
                GitHub
              </Button>
            </div>
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              type="button"
              onClick={() => { window.location.href = "/api/oauth/apple"; }}
              disabled={isLoading}
            >
              <AppleIcon />
              Continue with Apple
            </Button>
          </div>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs uppercase text-muted-foreground">
              or
            </span>
          </div>

          {/* Email / password */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Jane Doe" autoComplete="name" required disabled={isLoading} />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
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
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => console.log("forgot password")}
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
                  placeholder="••••••••"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  minLength={8}
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                  disabled={isLoading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {isSignup && (
                <p className="text-xs text-muted-foreground">
                  At least 8 characters
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? "Please wait..." : (isSignup ? "Create account" : "Sign in")}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(isSignup ? "signin" : "signup");
                setError(null);
              }}
              className="font-medium text-foreground underline-offset-4 hover:underline"
              disabled={isLoading}
            >
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>

          {isSignup && (
            <p className="text-center text-xs text-muted-foreground">
              By signing up you agree to our{" "}
              <a href="/terms" className="underline underline-offset-2 hover:text-foreground">
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
                Privacy Policy
              </a>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}