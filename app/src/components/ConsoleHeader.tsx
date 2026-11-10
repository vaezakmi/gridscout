import { Link, NavLink } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { RadarLogo } from "./RadarLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Ticker } from "./Ticker";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
    isActive ? "bg-secondary text-primary" : "text-muted-foreground hover:text-foreground"
  }`;

export function ConsoleHeader({ onBuyCredits }: { onBuyCredits: () => void }) {
  const { user, logout } = useAuth();
  const { data: wallet } = trpc.payments.wallet.useQuery(undefined, {
    retry: false,
  });

  const unlimited = wallet?.unlimited === true || user?.role === "admin";
  const credits = wallet?.credits ?? 0;
  const initials = (user?.name ?? user?.email ?? "GS").slice(0, 2).toUpperCase();

  return (
    <div className="sticky top-0 z-[600]">
      <header className="hairline-b flex h-14 items-center gap-4 bg-background/95 px-4 backdrop-blur">
        <Link to="/" className="flex items-center gap-2.5">
          <RadarLogo size={26} />
          <span className="font-display text-sm font-bold uppercase tracking-[0.28em]">
            Grid<span className="text-primary">Scout</span>
          </span>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <span className="led" />
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-scout-mint">Live grid</span>
        </div>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          <NavLink to="/app" className={navLinkClass}>
            Console
          </NavLink>
          <NavLink to="/leads" className={navLinkClass}>
            Pipeline
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {unlimited ? (
            // Admins never get a buy affordance. This is a static badge — not a button,
            // no hover, no cursor-pointer, no onClick. It confirms unlimited status
            // without suggesting you can "top up".
            <div
              title="Admin account — credits are unlimited"
              className="flex items-center gap-2 border border-scout-mint/40 bg-scout-mint/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-scout-mint"
            >
              <span className="inline-block h-2 w-2 rotate-45 bg-scout-mint" />
              ∞ credits · admin
            </div>
          ) : (
            <button
              onClick={onBuyCredits}
              className="flex cursor-pointer items-center gap-2 border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary/20"
            >
              <span className="inline-block h-2 w-2 rotate-45 bg-primary" />
              {credits} credits
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={user?.avatar ?? undefined} />
                <AvatarFallback className="bg-secondary font-mono text-[10px] text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-border bg-card font-mono text-xs">
              <div className="hairline-b px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                {user?.email ?? "operator"}
              </div>
              {unlimited && (
                <div className="px-3 pb-2 font-mono text-[10px] uppercase tracking-widest text-scout-mint">
                  admin · unlimited credits
                </div>
              )}
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-scout-red focus:bg-secondary focus:text-scout-red"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <Ticker />
    </div>
  );
}