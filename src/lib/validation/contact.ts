import { z } from "zod";

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your full name").max(100, "Name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(254, "Email is too long"),
  phone: z.string().trim().regex(/^\+?[\d\s\-()]{7,25}$/, "Enter a valid phone number"),
  description: z
    .string()
    .trim()
    .min(10, "Please write at least 10 characters")
    .max(2000, "Message is too long (2000 characters max)"),
});

export type ContactState = {
  ok: boolean;
  message: string;
  errors: Record<string, string>;
  values: { fullName: string; email: string; phone: string; description: string };
};

export const emptyContactState: ContactState = {
  ok: false,
  message: "",
  errors: {},
  values: { fullName: "", email: "", phone: "", description: "" },
};
