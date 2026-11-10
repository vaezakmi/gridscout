// api/ai/pitch.ts
import OpenAI from "openai";
import { env } from "../lib/env";
import type { AuditDetail } from "@contracts/grid";

let client: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!env.openAiApiKey) return null;
  if (!client) client = new OpenAI({ apiKey: env.openAiApiKey });
  return client;
}

type PitchInput = AuditDetail;

type PitchResult = {
  pitch: string | null;
  error?: string;
};

/**
 * Generates a cold-outreach email for a business the agency has unlocked.
 *
 * Returns { pitch: null } when OPENAI_API_KEY is unset — the caller (leads
 * router) treats that as "not configured" and surfaces the message to the UI.
 * Never throws: a failed generation should not 500 the whole unlock flow.
 */
export async function generatePitch(input: PitchInput): Promise<PitchResult> {
  const openai = getClient();
  if (!openai) {
    return { pitch: null, error: "AI pitch generation is not configured (OPENAI_API_KEY missing)." };
  }

  const visibility = input.scores.visibility;
  const leak = input.lostRevenueKes;
  const issues = input.issues.length ? input.issues.join(", ") : "no major issues";

  const prompt = `Write a short, personalised cold-outreach email from a digital marketing agency to a small business owner in Nairobi, Kenya.

Business:
- Name: ${input.name}
- Category: ${input.category}
- Location: ${input.area}, Nairobi
- Google visibility score: ${visibility}/100
- Estimated monthly revenue being lost to poor online visibility: KES ${leak.toLocaleString()}
- Key issues: ${issues}
- Reviews: ${input.reviewCount} on Google
- Website: ${input.website ?? "none"}

Tone: warm, direct, professional. No hype, no exclamation marks.
Length: 120-150 words.
Structure: one-line hook, then 2-3 specific observations about their online presence (reference the numbers above), then one concrete next step (a free 10-minute audit call).
Sign-off: "— The GridScout team".

Return ONLY the email body (no subject line, no markdown, no explanation).`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 400,
    });

    const pitch = completion.choices[0]?.message?.content?.trim() ?? null;
    return { pitch };
  } catch (e) {
    return {
      pitch: null,
      error: e instanceof Error ? e.message : "Pitch generation failed",
    };
  }
}