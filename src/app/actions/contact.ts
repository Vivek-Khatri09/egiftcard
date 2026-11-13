"use server";

import { createClient } from "@/lib/supabase/server";
import { limited, TOO_MANY } from "@/lib/rate-limit";
import { contactSchema, emptyContactState, type ContactState } from "@/lib/validation/contact";

export async function submitContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  // Honeypot: real users never fill this hidden field. Pretend success to bots.
  if (String(formData.get("website") ?? "") !== "") {
    return { ...emptyContactState, ok: true, message: "Thank you! We will get back to you soon." };
  }

  const values = {
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    description: String(formData.get("description") ?? ""),
  };

  if (await limited("contact", 5, 3600)) return { ...emptyContactState, message: TOO_MANY, values };
  const parsed = contactSchema.safeParse(values);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, message: "Please fix the highlighted fields.", errors, values };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contact_submissions").insert({
    full_name: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    description: parsed.data.description,
  });

  if (error) {
    return { ok: false, message: "Sorry, we could not send your message. Please try again in a moment.", errors: {}, values };
  }
  return { ...emptyContactState, ok: true, message: "Thank you! Your message has been received and we will get back to you soon." };
}
