import "server-only";

const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function siteUrl() {
  return SITE();
}

/**
 * SAFETY: on the Vercel PRODUCTION deployment the gateway sandboxes are refused. A sandbox payment "completes" with
 * fake money, so allowing it in production would hand out real gift card codes for free.
 */
const productionDeploy = () => process.env.VERCEL_ENV === "production";

/** eSewa ePay v2. In test mode the published eSewa sandbox credentials are used when none are configured. */
export function esewaConfig() {
  const live = process.env.ESEWA_ENV === "live";
  const productCode = process.env.ESEWA_PRODUCT_CODE || (live ? "" : "EPAYTEST");
  const secret = process.env.ESEWA_SECRET_KEY || (live ? "" : "8gBm/:&EnhH.1/q");
  return {
    live,
    configured: Boolean(productCode && secret) && !(productionDeploy() && !live),
    productCode,
    secret,
    formUrl: live ? "https://epay.esewa.com.np/api/epay/main/v2/form" : "https://rc-epay.esewa.com.np/api/epay/main/v2/form",
    statusUrl: live ? "https://epay.esewa.com.np/api/epay/transaction/status/" : "https://rc.esewa.com.np/api/epay/transaction/status/",
    successUrl: `${SITE()}/api/payments/esewa/success`,
    failureUrl: `${SITE()}/api/payments/esewa/failure`,
  };
}

/** Khalti ePayment. There is no default secret: sandbox keys come from test-admin.khalti.com. */
export function khaltiConfig() {
  const live = process.env.KHALTI_ENV === "live";
  const base = (process.env.KHALTI_BASE_URL || (live ? "https://khalti.com/api/v2" : "https://dev.khalti.com/api/v2")).replace(/\/$/, "");
  const secret = process.env.KHALTI_SECRET_KEY ?? "";
  return {
    live,
    configured: Boolean(secret) && !(productionDeploy() && !live),
    secret,
    initiateUrl: `${base}/epayment/initiate/`,
    lookupUrl: `${base}/epayment/lookup/`,
    returnUrl: `${SITE()}/api/payments/khalti/return`,
    websiteUrl: SITE(),
  };
}

/** Which payment methods customers can choose. Set PAYMENT_METHODS in .env.local, e.g. PAYMENT_METHODS=esewa */
export function enabledMethods(): { esewa: boolean; khalti: boolean; bank_transfer: boolean } {
  const list = (process.env.PAYMENT_METHODS ?? "esewa,khalti,bank_transfer").split(",").map((m) => m.trim());
  return {
    esewa: list.includes("esewa") && esewaConfig().configured,
    khalti: list.includes("khalti") && khaltiConfig().configured,
    bank_transfer: list.includes("bank_transfer"),
  };
}
