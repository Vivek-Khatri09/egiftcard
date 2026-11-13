import "server-only";
import { after } from "next/server";
import { sendOrderEmail } from "./order-email";

/** Sends after the response is returned, so a slow or failing mail server never blocks or breaks checkout. */
export function queueEmail(orderId: string, templateKey: string) {
  after(async () => {
    try {
      await sendOrderEmail(orderId, templateKey);
    } catch (e) {
      console.error("email send crashed:", e);
    }
  });
}

/** After a verified payment: a payment confirmation, plus the codes if they were allocated. */
export function queuePaidEmails(orderId: string, confirmResult: unknown) {
  queueEmail(orderId, "payment_confirmation");
  if (confirmResult === "paid_allocated") queueEmail(orderId, "gift_card_delivery");
}
