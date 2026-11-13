import { z } from "zod";

const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254, "Email is too long");
const password = z
  .string()
  .min(8, "Use at least 8 characters")
  .max(72, "Password is too long (72 characters max)")
  .regex(/[A-Za-z]/, "Include at least one letter")
  .regex(/\d/, "Include at least one number");
const phone = z.string().trim().regex(/^\+?[\d\s\-()]{7,25}$/, "Enter a valid phone number");
const fullName = z.string().trim().min(2, "Please enter your full name").max(100, "Name is too long");

export const registerSchema = z
  .object({ fullName, phone, email, password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export const loginSchema = z.object({ email, password: z.string().min(1, "Enter your password") });
export const forgotSchema = z.object({ email });
export const resetSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });
export const profileSchema = z.object({ fullName, phone });

export type AuthState = {
  ok: boolean;
  message: string;
  errors: Record<string, string>;
  values: Record<string, string>;
  needsVerification?: boolean;
};
export const emptyAuthState: AuthState = { ok: false, message: "", errors: {}, values: {} };

export function toFieldErrors(issues: { path: (string | number)[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const i of issues) {
    const key = String(i.path[0] ?? "form");
    if (!errors[key]) errors[key] = i.message;
  }
  return errors;
}
