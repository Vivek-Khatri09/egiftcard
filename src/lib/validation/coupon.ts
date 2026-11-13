import { z } from "zod";

const optNum = (label: string) => z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, `Enter a valid ${label}, or leave empty`);

export const couponSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, "3 to 32 letters, numbers, - or _"),
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number({ invalid_type_error: "Enter a number" }).gt(0, "Must be greater than 0").max(10_000_000),
  maxDiscount: optNum("amount"),
  minPurchase: optNum("amount"),
  usageLimit: z.string().trim().regex(/^(\d{1,7})?$/, "Enter a whole number, or leave empty"),
  expiresAt: z.string().trim().regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})?$/, "Invalid date"),
});
