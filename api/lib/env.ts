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

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  
  // Fallback URL prevents the 'Invalid URL' crash in development
  kimiAuthUrl: optional("KIMI_AUTH_URL", "https://api.moonshot.cn"), 
  kimiOpenUrl: required("KIMI_OPEN_URL"),
  ownerUnionId: optional("OWNER_UNION_ID"),
  
  // GridScout additions
  googlePlacesApiKey: optional("GOOGLE_PLACES_API_KEY"),
  openAiApiKey: optional("OPENAI_API_KEY"),
};