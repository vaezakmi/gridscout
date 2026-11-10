export const Session = {
  cookieName: "session",
  maxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const;

export const OAuth = {
  stateCookie: "oauth_state",
  verifierCookie: "oauth_verifier",
  stateMaxAgeMs: 10 * 60 * 1000, // 10 min
} as const;

export const ErrorMessages = {
  unauthenticated: "You must be signed in.",
  insufficientRole: "You don't have permission to do that.",
} as const;

export const Paths = {
  /** @deprecated Replaced by /api/oauth/{provider}/callback in oauth-router.ts */
  oauthCallback: "/api/oauth/callback",
} as const;