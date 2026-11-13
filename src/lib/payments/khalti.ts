import "server-only";
import { khaltiConfig } from "./config";

export type KhaltiLookup = { pidx: string; status: string; total_amount: number; transaction_id: string | null; fee?: number; refunded?: boolean };

const headers = () => ({ Authorization: `Key ${khaltiConfig().secret}`, "Content-Type": "application/json" });

/** Starts a Khalti payment. Amount is converted to paisa here. Returns the pidx (store it!) and the page to send the customer to. */
export async function khaltiInitiate(args: { amountNpr: number; purchaseOrderId: string; purchaseOrderName: string; customer?: { name?: string; email?: string; phone?: string } }) {
  const c = khaltiConfig();
  try {
    const res = await fetch(c.initiateUrl, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        return_url: c.returnUrl,
        website_url: c.websiteUrl,
        amount: Math.round(args.amountNpr * 100),
        purchase_order_id: args.purchaseOrderId,
        purchase_order_name: args.purchaseOrderName,
        ...(args.customer ? { customer_info: args.customer } : {}),
      }),
    });
    const json = (await res.json()) as { pidx?: string; payment_url?: string };
    if (!res.ok || !json.pidx || !json.payment_url) return null;
    return { pidx: json.pidx, paymentUrl: json.payment_url };
  } catch {
    return null;
  }
}

/** The authoritative check: asks Khalti for the payment status by pidx. */
export async function khaltiLookup(pidx: string): Promise<KhaltiLookup | null> {
  try {
    const res = await fetch(khaltiConfig().lookupUrl, {
      method: "POST",
      headers: headers(),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({ pidx }),
    });
    if (!res.ok) return null;
    return (await res.json()) as KhaltiLookup;
  } catch {
    return null;
  }
}
