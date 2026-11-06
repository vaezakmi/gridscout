import { Google, GitHub, Apple } from "arctic";
import { env } from "./env";

function normalizeAppleKey(raw: string): Uint8Array {
  if (!raw) return new Uint8Array(0);
  let pem = raw;
  if (!pem.includes("-----BEGIN")) {
    try {
      pem = Buffer.from(raw, "base64").toString("utf8");
    } catch {
      // fall through — treat as raw
    }
  }
  pem = pem.replace(/\\n/g, "\n");
  return new TextEncoder().encode(pem);
}

export const google = new Google(
  env.googleClientId ?? "",
  env.googleClientSecret ?? "",
  `${env.apiUrl}/api/oauth/google/callback`,
);

export const github = new GitHub(
  env.githubClientId ?? "",
  env.githubClientSecret ?? "",
  `${env.apiUrl}/api/oauth/github/callback`,
);

export const apple = new Apple(
  env.appleClientId ?? "",
  env.appleTeamId ?? "",
  env.appleKeyId ?? "",
  normalizeAppleKey(env.applePrivateKey),
  `${env.apiUrl}/api/oauth/apple/callback`,
);