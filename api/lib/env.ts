import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string, fallback: string = ""): string {
  return process.env[name] ?? fallback;
}

/**
 * Apple .p8 private keys arrive in three shapes depending on where the env is
 * stored: real newlines (raw .p8 contents), escaped "\n" sequences (single-line
 * .env), or base64-encoded (Vercel / some secret managers). Normalize all three.
 */
function normalizeAppleKey(raw: string): string {
  if (!raw) return "";
  if (raw.includes("-----BEGIN")) {
    // Already PEM. Just unescape literal "\n" if present.
    return raw.replace(/\\n/g, "\n");
  }
  // Assume base64-encoded PEM.
  try {
    return Buffer.from(raw, "base64").toString("utf8");
  } catch {
    return raw;
  }
}

export const env = {
  // --- core ---
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  apiUrl: optional("API_URL", "http://localhost:3000"),
  appUrl: optional("APP_URL", "http://localhost:5173"),

  // --- session ---
  jwtSecret: required("JWT_SECRET"),

  // --- owner bootstrap ---
  ownerEmail: optional("OWNER_EMAIL"),

  // --- OAuth: Google ---
  googleClientId: optional("GOOGLE_CLIENT_ID"),
  googleClientSecret: optional("GOOGLE_CLIENT_SECRET"),

  // --- OAuth: GitHub ---
  githubClientId: optional("GITHUB_CLIENT_ID"),
  githubClientSecret: optional("GITHUB_CLIENT_SECRET"),

  // --- OAuth: Apple ---
  appleClientId: optional("APPLE_CLIENT_ID"),
  appleTeamId: optional("APPLE_TEAM_ID"),
  appleKeyId: optional("APPLE_KEY_ID"),
  applePrivateKey: normalizeAppleKey(optional("APPLE_PRIVATE_KEY")),

  // --- GridScout additions ---
  googlePlacesApiKey: optional("GOOGLE_PLACES_API_KEY"),
  openAiApiKey: optional("OPENAI_API_KEY"),
};