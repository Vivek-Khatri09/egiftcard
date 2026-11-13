import { z } from "zod";

const money = (label: string) =>
  z.coerce.number({ invalid_type_error: `Enter a valid ${label}` }).min(0, `${label} cannot be negative`).max(10_000_000, `${label} is too large`);

export const productSchema = z.object({
  categoryId: z.string().uuid().or(z.literal("")),
  brand: z.string().trim().min(1, "Enter the brand").max(60, "Too long"),
  name: z.string().trim().min(2, "Enter the product name").max(120, "Too long"),
  description: z.string().trim().max(2000, "Too long (2000 characters max)"),
  denominationLabel: z.string().trim().min(1, "Enter the denomination, e.g. $10").max(30, "Too long"),
  denominationValue: z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter a number, or leave empty"),
  denominationCurrency: z.string().trim().max(10, "Too long"),
  sellingPrice: money("selling price"),
  purchaseCost: money("purchase cost"),
  lowStockThreshold: z.coerce.number({ invalid_type_error: "Enter a whole number" }).int("Enter a whole number").min(0).max(100000),
  imagePath: z.string().trim().regex(/^([A-Za-z0-9._-]{1,120}\.(jpg|jpeg|png|webp))?$/i, "Invalid image file name"),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter a category name").max(60, "Too long"),
  sortOrder: z.coerce.number({ invalid_type_error: "Enter a number" }).int("Enter a whole number").min(0).max(1000),
});
