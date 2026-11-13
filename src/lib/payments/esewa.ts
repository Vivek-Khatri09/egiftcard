import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { esewaConfig } from "./config";

/** One amount string used for BOTH the signature and the form, so they can never disagree. */
export const fmtAmount = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

function sign(message: string, secret: string) {
  return createHmac("sha256", secret).update(message).digest("base64");
}

/** Fields for the browser to POST to eSewa. `transactionUuid` is our payment id (alphanumeric + hyphens). */
export function buildEsewaForm(transactionUuid: string, amountNpr: number) {
  const c = esewaConfig();
  const total = fmtAmount(amountNpr);
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  const signature = sign(`total_amount=${total},transaction_uuid=${transactionUuid},product_code=${c.productCode}`, c.secret);
  return {
    url: c.formUrl,
    fields: {
      amount: total,
      tax_amount: "0",
      total_amount: total,
      transaction_uuid: transactionUuid,
      product_code: c.productCode,
      product_service_charge: "0",
      product_delivery_charge: "0",
      success_url: c.successUrl,
      failure_url: c.failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    } as Record<string, string>,
  };
}

/** Decodes eSewa's ?data=... redirect and checks its signature. The payment is still confirmed only via the status API. */
export function parseEsewaReturn(dataParam: string): { transaction_uuid: string; total_amount: string } | null {
  try {
    const obj = JSON.parse(Buffer.from(dataParam, "base64").toString("utf8")) as Record<string, string>;
    const names = String(obj.signed_field_names ?? "").split(",").filter(Boolean);
    if (names.length === 0 || !obj.signature) return null;
    const message = names.map((n) => `${n}=${obj[n]}`).join(",");
    const expected = Buffer.from(sign(message, esewaConfig().secret));
    const given = Buffer.from(String(obj.signature));
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    return { transaction_uuid: String(obj.transaction_uuid), total_amount: String(obj.total_amount) };
  } catch {
    return null;
  }
}

export type EsewaStatus = { status: string; ref_id?: string | null; total_amount?: number | string; transaction_uuid?: string; product_code?: string };

/** Asks eSewa directly. The amount must match, otherwise eSewa answers NOT_FOUND. */
export async function esewaStatusCheck(transactionUuid: string, amountNpr: number): Promise<EsewaStatus | null> {
  const c = esewaConfig();
  const url = `${c.statusUrl}?product_code=${encodeURIComponent(c.productCode)}&total_amount=${encodeURIComponent(fmtAmount(amountNpr))}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    return (await res.json()) as EsewaStatus;
  } catch {
    return null;
  }
}
