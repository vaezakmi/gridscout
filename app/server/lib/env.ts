/// <reference types="node" />
import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  // Core — required
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // URLs — required (OAuth needs them)
  APP_URL: z.string().url(),
  API_URL: z.string().url(),

  // Owner bootstrap (optional)
  OWNER_EMAIL: z.string().email().optional(),

  // OAuth — all optional so dev works without them
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  APPLE_CLIENT_ID: z.string().optional(),
  APPLE_CLIENT_SECRET: z.string().optional(),
  APPLE_TEAM_ID: z.string().optional(),
  APPLE_KEY_ID: z.string().optional(),
  APPLE_PRIVATE_KEY: z.string().optional(),

  // GridScout services — optional
  GOOGLE_PLACES_API_KEY: z.string().optional(),

  // AI pitch generation — either provider works. Groq takes precedence when
  // both are set (free tier); OpenAI is the fallback (paid, higher quality).
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  DARAJA_CONSUMER_KEY: z.string().optional(),
  DARAJA_CONSUMER_SECRET: z.string().optional(),

  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const parsed = schema.parse(process.env);

/**
 * Apple .p8 private keys arrive in three shapes depending on where the env is
 * stored: real newlines (raw .p8 contents), escaped "\n" sequences (single-line
 * .env), or base64-encoded (Vercel / some secret managers). Normalize all three.
 */
function normalizeAppleKey(raw: string | undefined): string {
  if (!raw) return "";
  if (raw.includes("-----BEGIN")) {
    return raw.replace(/\\n/g, "\n");
  }
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return raw;
  }
}

// Map to camelCase so imports match the codebase conventions everywhere else.
export const env = {
  databaseUrl: parsed.DATABASE_URL,
  jwtSecret: parsed.JWT_SECRET,
  jwtExpiresIn: parsed.JWT_EXPIRES_IN,
  appUrl: parsed.APP_URL,
  apiUrl: parsed.API_URL,
  isProduction: parsed.NODE_ENV === "production",
  ownerEmail: parsed.OWNER_EMAIL,

  googleClientId: parsed.GOOGLE_CLIENT_ID,
  googleClientSecret: parsed.GOOGLE_CLIENT_SECRET,
  githubClientId: parsed.GITHUB_CLIENT_ID,
  githubClientSecret: parsed.GITHUB_CLIENT_SECRET,
  appleClientId: parsed.APPLE_CLIENT_ID,
  appleClientSecret: parsed.APPLE_CLIENT_SECRET,
  appleTeamId: parsed.APPLE_TEAM_ID,
  appleKeyId: parsed.APPLE_KEY_ID,
  applePrivateKey: normalizeAppleKey(parsed.APPLE_PRIVATE_KEY),

  googlePlacesApiKey: parsed.GOOGLE_PLACES_API_KEY,

  // AI providers — both exposed; ai/pitch.ts picks Groq first when set.
  groqApiKey: parsed.GROQ_API_KEY,
  openAiApiKey: parsed.OPENAI_API_KEY,

  darajaConsumerKey: parsed.DARAJA_CONSUMER_KEY,
  darajaConsumerSecret: parsed.DARAJA_CONSUMER_SECRET,
};