import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export function emailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transport: Transporter | null = null;
function getTransport(): Transporter {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT ?? 587);
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transport;
}

/** Works with any SMTP service (Gmail app password, Resend, Brevo, ...). Throws on failure so callers can record it. */
export async function sendMail(to: string, subject: string, html: string, text: string) {
  if (!emailConfigured()) throw new Error("Email is not configured: set SMTP_HOST, SMTP_USER and SMTP_PASS");
  await getTransport().sendMail({ from: process.env.EMAIL_FROM || process.env.SMTP_USER, to, subject, html, text });
}
