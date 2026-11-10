import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { CREDIT_BUNDLES, CREDIT_PRICE_KES } from "@contracts/grid";
import { fmtKes } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Phase =
  | { step: "form" }
  | { step: "push"; txnId: number; amountKes: number; phone: string; demo: boolean }
  | { step: "done"; mpesaRef: string };

export function StkModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [credits, setCredits] = useState<number>(5);
  const [phone, setPhone] = useState("");
  const [phase, setPhase] = useState<Phase>({ step: "form" });
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const initiate = trpc.payments.initiate.useMutation();
  const confirm = trpc.payments.confirmDemo.useMutation();

  const reset = (v: boolean) => {
    if (!v) {
      setPhase({ step: "form" });
      setError(null);
    }
    onOpenChange(v);
  };

  const sendPush = () => {
    setError(null);
    initiate.mutate(
      { credits, phone },
      {
        onSuccess: (res) =>
          setPhase({ step: "push", txnId: res.txnId, amountKes: res.amountKes, phone: res.phone, demo: res.demo }),
        onError: (e) => setError(e.message),
      }
    );
  };

  const simulateConfirm = () => {
    if (phase.step !== "push") return;
    confirm.mutate(
      { txnId: phase.txnId },
      {
        onSuccess: (res) => {
          utils.payments.wallet.invalidate();
          utils.leads.list.invalidate();
          setPhase({ step: "done", mpesaRef: res.mpesaRef ?? "OK" });
        },
        onError: (e) => setError(e.message),
      }
    );
  };

  const amount = credits * CREDIT_PRICE_KES;

  return (
    <Dialog open={open} onOpenChange={reset}>
      <DialogContent className="border-border bg-card font-mono text-foreground sm:max-w-md [&>button]:text-muted-foreground">
        <DialogHeader>
          <DialogTitle className="font-display text-sm uppercase tracking-[0.2em]">
            M-PESA CHECKOUT — LEAD CREDITS
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            One credit unlocks one full lead: contact details, complete audit and AI pitch.
          </DialogDescription>
        </DialogHeader>

        {phase.step === "form" && (
          <div className="space-y-5 pt-2">
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Bundle</div>
              <div className="grid grid-cols-3 gap-2">
                {CREDIT_BUNDLES.map((n) => (
                  <button
                    key={n}
                    onClick={() => setCredits(n)}
                    className={`border px-3 py-3 text-left transition-colors ${
                      credits === n
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <div className="text-lg font-bold leading-none">{n}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-wider">
                      {n === 12 ? "BEST VALUE" : n === 5 ? "POPULAR" : "STARTER"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Safaricom number
              </div>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="border-border bg-secondary/40 font-mono focus-visible:ring-primary"
              />
            </div>

            <div className="hairline-t flex items-center justify-between pt-4">
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Total</span>
              <span className="text-xl font-bold text-primary">{fmtKes(amount)}</span>
            </div>

            {error && <div className="text-xs text-scout-red">{error}</div>}

            <Button
              onClick={sendPush}
              disabled={initiate.isPending || !/^(\+254|0)7\d{8}$/.test(phone.replace(/\s/g, ""))}
              className="w-full bg-primary font-mono text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground hover:bg-primary/85"
            >
              {initiate.isPending ? "Sending…" : `Send STK push — ${fmtKes(amount)}`}
            </Button>
          </div>
        )}

        {phase.step === "push" && (
          <div className="space-y-5 pt-2 text-center">
            <div className="led mx-auto" />
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.18em]">Check your phone</div>
              <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                STK push sent to <span className="text-foreground">{phase.phone}</span> for{" "}
                <span className="text-primary">{fmtKes(phase.amountKes)}</span>.
                <br />
                Enter your M-PESA PIN to confirm.
              </div>
            </div>
            {phase.demo && (
              <div className="border border-scout-amber/40 bg-scout-amber/10 px-3 py-2 text-[11px] leading-relaxed text-scout-amber">
                DEMO MODE — Daraja credentials not configured. The confirmation below stands in for
                the real M-Pesa PIN prompt and callback webhook.
              </div>
            )}
            {error && <div className="text-xs text-scout-red">{error}</div>}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => reset(false)}
                className="flex-1 border-border font-mono text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={simulateConfirm}
                disabled={confirm.isPending}
                className="flex-1 bg-primary font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/85"
              >
                {confirm.isPending ? "Confirming…" : "Simulate PIN confirmation"}
              </Button>
            </div>
          </div>
        )}

        {phase.step === "done" && (
          <div className="space-y-4 pt-2 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center border border-scout-mint text-xl text-scout-mint">
              ✓
            </div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-scout-mint">Payment confirmed</div>
            <div className="font-mono text-xs text-muted-foreground">
              M-PESA REF <span className="text-foreground">{phase.mpesaRef}</span> · {credits} credit
              {credits > 1 ? "s" : ""} added to your wallet
            </div>
            <Button
              onClick={() => reset(false)}
              className="w-full bg-primary font-mono text-xs font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/85"
            >
              Back to the grid
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
