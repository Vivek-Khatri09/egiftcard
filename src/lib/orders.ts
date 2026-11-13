export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending payment",
  payment_verification: "Payment verification",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = { esewa: "eSewa", khalti: "Khalti", bank_transfer: "Bank transfer" };

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  none: "Not started",
  initiated: "Awaiting payment",
  pending_verification: "Verifying payment",
  paid: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
};

const PRIORITY = ["paid", "pending_verification", "initiated", "failed", "cancelled"];

/** One payment status for an order that may have several payment attempts. */
export function overallPaymentStatus(payments: { status: string }[] | null | undefined): string {
  if (!payments || payments.length === 0) return "none";
  for (const s of PRIORITY) if (payments.some((p) => p.status === s)) return s;
  return "none";
}

export const PROGRESS_STEPS = [
  "Order placed",
  "Payment",
  "Payment confirmed",
  "Gift card processing",
  "Gift card delivered",
  "Order completed",
] as const;

/** `current` = index of the step in progress; steps before it are done. 6 = everything done. */
export function orderProgress(status: string, fulfillment: string): { current: number; failed: boolean } {
  if (status === "failed" || status === "cancelled") return { current: 1, failed: true };
  if (status === "completed") return { current: PROGRESS_STEPS.length, failed: false };
  if (status === "processing") return { current: fulfillment === "delivered" ? 5 : 3, failed: false };
  return { current: 1, failed: false }; // pending_payment, payment_verification
}

export function paymentStepLabel(status: string): string {
  return status === "payment_verification" ? "Payment verification" : "Payment pending";
}
