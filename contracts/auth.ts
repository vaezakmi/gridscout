import { z } from "zod";

export const signupInput = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
});

export const signinInput = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const forgotPasswordInput = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export type SignupInput = z.infer<typeof signupInput>;
export type SigninInput = z.infer<typeof signinInput>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordInput>;