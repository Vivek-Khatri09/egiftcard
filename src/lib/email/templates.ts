import { formatNpr } from "@/lib/format";

export type EmailKind = "order_confirmation" | "payment_confirmation" | "gift_card_delivery" | "payment_rejected" | "order_cancelled";

export interface EmailData {
  siteName: string;
  siteUrl: string;
  customerName: string;
  orderNumber: string;
  orderId: string;
  items: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  codes: { product: string; code: string; pin: string | null }[];
  support: { email: string; phone: string; address: string };
  note?: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const BRAND = "#ea580c";

function layout(d: EmailData, heading: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#faf7f2;font-family:Arial,Helvetica,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:${BRAND};padding:20px 28px;color:#ffffff;font-size:22px;font-weight:bold">${esc(d.siteName)}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 12px;font-size:22px">${esc(heading)}</h1>
<p style="margin:0 0 16px;line-height:1.5">Hi ${esc(d.customerName)},</p>
${body}
<hr style="border:none;border-top:1px solid #e7e5e4;margin:24px 0">
<p style="margin:0;font-size:13px;color:#57534e;line-height:1.5">Need help? Contact us at ${esc(d.support.email)} or ${esc(d.support.phone)}. Please quote your order number ${esc(d.orderNumber)}.</p>
</td></tr>
<tr><td style="background:#f5f5f4;padding:16px 28px;font-size:12px;color:#78716c;line-height:1.5">All digital gift card sales are final. ${esc(d.support.address)}</td></tr>
</table></td></tr></table></body></html>`;
}

const itemsTable = (d: EmailData) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0 16px">` +
  d.items.map((i) => `<tr><td style="padding:6px 0">${esc(i.name)} &times; ${i.quantity}</td><td align="right" style="padding:6px 0">${formatNpr(i.unitPrice * i.quantity)}</td></tr>`).join("") +
  (d.discount > 0 ? `<tr><td style="padding:6px 0;color:#57534e">Discount</td><td align="right">- ${formatNpr(d.discount)}</td></tr>` : "") +
  `<tr><td style="padding:10px 0;border-top:1px solid #e7e5e4;font-weight:bold">Total</td><td align="right" style="padding:10px 0;border-top:1px solid #e7e5e4;font-weight:bold">${formatNpr(d.total)}</td></tr></table>`;

const button = (href: string, label: string) =>
  `<p style="margin:16px 0"><a href="${esc(href)}" style="background:${BRAND};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;

const itemsText = (d: EmailData) => d.items.map((i) => `- ${i.name} x ${i.quantity}: ${formatNpr(i.unitPrice * i.quantity)}`).join("\n") + `\nTotal: ${formatNpr(d.total)}`;

export function renderEmail(kind: EmailKind, d: EmailData): { subject: string; html: string; text: string } {
  const orderUrl = `${d.siteUrl}/account/orders/${d.orderId}`;
  const supportText = `\n\nNeed help? ${d.support.email} / ${d.support.phone} (order ${d.orderNumber}).\nAll digital gift card sales are final.`;

  switch (kind) {
    case "order_confirmation":
      return {
        subject: `We received your order ${d.orderNumber}`,
        html: layout(d, "Thanks for your order", `<p style="line-height:1.5">We've reserved your gift cards. Your order is waiting for payment (${esc(d.paymentMethod)}). Codes are released only after the payment is verified.</p>${itemsTable(d)}${button(orderUrl, "View your order")}`),
        text: `Hi ${d.customerName},\n\nWe've reserved your gift cards for order ${d.orderNumber}. Payment method: ${d.paymentMethod}. Codes are released after payment is verified.\n\n${itemsText(d)}\n\nView your order: ${orderUrl}${supportText}`,
      };
    case "payment_confirmation":
      return {
        subject: `Payment received for order ${d.orderNumber}`,
        html: layout(d, "Payment received", `<p style="line-height:1.5">We've verified your payment of <strong>${formatNpr(d.total)}</strong> (${esc(d.paymentMethod)}). Your gift card codes are in a separate email and in your account.</p>${itemsTable(d)}${button(orderUrl, "View your order")}`),
        text: `Hi ${d.customerName},\n\nWe've verified your payment of ${formatNpr(d.total)} (${d.paymentMethod}) for order ${d.orderNumber}. Your codes are in a separate email and in your account.\n\n${itemsText(d)}\n\n${orderUrl}${supportText}`,
      };
    case "gift_card_delivery": {
      const boxes = d.codes.map((c) =>
        `<div style="margin:0 0 14px"><div style="font-size:13px;color:#57534e;margin-bottom:4px">${esc(c.product)}</div><div style="font-family:Consolas,Menlo,monospace;font-size:16px;background:#faf7f2;border:1px dashed #d6d3d1;border-radius:8px;padding:12px;word-break:break-all">${esc(c.code)}</div>${c.pin ? `<div style="font-size:13px;margin-top:4px">PIN: <span style="font-family:Consolas,Menlo,monospace">${esc(c.pin)}</span></div>` : ""}</div>`).join("");
      return {
        subject: `Your gift card codes for order ${d.orderNumber}`,
        html: layout(d, "Your gift cards are ready", `<p style="line-height:1.5">Thank you for your purchase. Your codes are below, and always available under <strong>Account &rarr; Gift cards</strong>.</p>${boxes}<p style="font-size:13px;color:#b45309;background:#fffbeb;padding:10px 12px;border-radius:8px;line-height:1.5">Keep these codes private. Anyone who has them can use them.</p>${itemsTable(d)}${button(orderUrl, "View your order")}`),
        text: `Hi ${d.customerName},\n\nYour gift cards for order ${d.orderNumber}:\n\n${d.codes.map((c) => `${c.product}\n  Code: ${c.code}${c.pin ? `\n  PIN: ${c.pin}` : ""}`).join("\n\n")}\n\nKeep these codes private. They are always available in your account: ${orderUrl}${supportText}`,
      };
    }
    case "payment_rejected":
      return {
        subject: `We couldn't verify your payment for order ${d.orderNumber}`,
        html: layout(d, "We couldn't verify your payment", `<p style="line-height:1.5">We were unable to verify your bank transfer for this order.${d.note ? ` Reason: <strong>${esc(d.note)}</strong>.` : ""} Your gift cards are still reserved for a limited time. You can submit your payment details again from your order page.</p>${button(orderUrl, "Review your order")}`),
        text: `Hi ${d.customerName},\n\nWe couldn't verify your bank transfer for order ${d.orderNumber}.${d.note ? ` Reason: ${d.note}.` : ""} Your gift cards are reserved for a limited time. Submit your payment details again: ${orderUrl}${supportText}`,
      };
    case "order_cancelled":
      return {
        subject: `Your order ${d.orderNumber} was cancelled`,
        html: layout(d, "Order cancelled", `<p style="line-height:1.5">Your order was cancelled and the reserved gift cards have been released. No codes were issued. If you paid and did not expect this, please contact us right away.</p>${itemsTable(d)}${button(d.siteUrl, "Back to the store")}`),
        text: `Hi ${d.customerName},\n\nYour order ${d.orderNumber} was cancelled and the reserved gift cards have been released. No codes were issued. If you paid and did not expect this, contact us right away.${supportText}`,
      };
  }
}
