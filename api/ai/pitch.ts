import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  listModels,
  classifyAiError,
  AiUnavailable,
  ContentRejected,
  AiMisconfigured,
} from "../ai-client";
import type { AuditDetail } from "@contracts/grid";
import { CATEGORY_META } from "@contracts/grid";

const kimiGw = createOpenAICompatible({
  name: "kimi-gw",
  baseURL: process.env.KIMI_AGENTGW_BASE_URL!,
  apiKey: process.env.KIMI_AGENTGW_API_KEY!,
  includeUsage: true,
  supportsStructuredOutputs: true,
});

const fmtKes = (n: number) =>
  "KES " + n.toLocaleString("en-KE", { maximumFractionDigits: 0 });

function fallbackPitch(a: AuditDetail): string {
  const kw = CATEGORY_META[a.category]?.keyword ?? "near me";
  const topIssue = a.issues[0] ?? "weak local search visibility";
  return `Subject: ${a.name} is losing about ${fmtKes(a.lostRevenueKes)} every month

Hi ${a.name} team,

I ran a free visibility scan for businesses in ${a.area}, and ${a.name} stood out — for the wrong reason.

Right now you score ${a.scores.visibility}/100 on local search visibility while customers in ${a.area} search "${kw}" about ${a.estSearches.toLocaleString()} times a month. The biggest leak: ${topIssue.toLowerCase()}. Our estimate puts the uncaptured revenue at roughly ${fmtKes(a.lostRevenueKes)} per month.

I help businesses in ${a.area} fix exactly this. Would a 15-minute call this week be useful? I'll show you the full map of who is winning your customers and why.

Best regards,
[Your name]
[Your agency]`;
}

export interface PitchResult {
  pitch: string;
  degraded: boolean;
  errorMessage?: string;
}

/** Generate a personalized cold-pitch email for a lead. Falls back to a
 *  template pitch (degraded=true) when the LLM gateway is unavailable. */
export async function generatePitch(audit: AuditDetail): Promise<PitchResult> {
  const kw = CATEGORY_META[audit.category]?.keyword ?? "near me";

  const system =
    "You are a senior local-SEO salesperson writing a short, specific, " +
    "human cold-pitch email to a Kenyan small business owner. Rules: " +
    "2 short paragraphs plus a 1-line call to action and a sign-off. " +
    "Lead with their concrete numbers (never generic). Mention their area, " +
    "their visibility score, their estimated lost monthly revenue in KES, and " +
    "their single biggest issue. No hype words, no exclamation marks, no " +
    "emojis. Subject line first, prefixed with 'Subject: '. " +
    "Sign off with '[Your name]' and '[Your agency]'. Plain text only.";

  const user = `Business: ${audit.name} (${audit.area}, Nairobi area)
Category keyword: "${kw}"
Visibility score: ${audit.scores.visibility}/100 (Maps ${audit.scores.maps}, Web ${audit.scores.web})
Estimated lost revenue: ${fmtKes(audit.lostRevenueKes)}/month
Monthly searches for "${kw}" in ${audit.area}: ${audit.estSearches.toLocaleString()}
Google rating: ${audit.rating} (${audit.reviewCount} reviews), profile ${audit.claimed ? "claimed" : "UNCLAIMED"}
Website: ${audit.website ?? "none"}
Keyword rank: ${audit.keywordRank == null ? "not in top 50" : `#${audit.keywordRank}`}
Site speed: ${audit.siteSpeed == null ? "n/a" : `${Math.round(audit.siteSpeed)}/100`}
Biggest issues: ${audit.issues.slice(0, 3).join("; ")}`;

  try {
    const { defaultModelId } = await listModels();
    const result = await generateText({
      model: kimiGw(defaultModelId),
      system,
      prompt: user,
      providerOptions: {
        "kimi-gw": { max_completion_tokens: 900 },
      },
    });
    const text = result.text?.trim();
    if (!text) throw new AiUnavailable("empty completion");
    return { pitch: text, degraded: false };
  } catch (err) {
    const classified = classifyAiError(err);
    // Terminal classes map to user-facing copy; transient → ask to retry.
    if (classified instanceof AiTransient_) {
      return {
        pitch: "",
        degraded: true,
        errorMessage:
          "The AI engine is briefly unavailable. Please try again in a moment.",
      };
    }
    const msg =
      classified instanceof AiUnavailable
        ? "AI pitch generation is unavailable on the current plan (quota exhausted)."
        : classified instanceof ContentRejected
          ? "The pitch was blocked by content policy — try regenerating."
          : classified instanceof AiMisconfigured
            ? "AI is not configured for this deployment."
            : "AI pitch generation failed.";
    return { pitch: fallbackPitch(audit), degraded: true, errorMessage: msg };
  }
}

// local alias to keep the instanceof branches readable
import { AiTransient as AiTransient_ } from "../ai-client";
