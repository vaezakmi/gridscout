import jwt from "jsonwebtoken";
import { Session } from "@contracts/constants";

export type SessionPayload = { sub: string; email: string };

export function signSessionToken(payload: SessionPayload) {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  });
}

export function verifySessionToken(token: string): SessionPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as SessionPayload;
}