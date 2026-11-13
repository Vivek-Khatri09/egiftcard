"use client";

import { useActionState, useState } from "react";
import { saveProduct } from "@/app/actions/admin-products";
import { emptyFormState } from "@/lib/validation/form";
import { createClient } from "@/lib/supabase/client";
import { Field, FormMessage, FieldError } from "@/components/auth/Field";
import ProductImage from "@/components/ui/ProductImage";

export type ProductFormValues = {
  id: string; categoryId: string; brand: string; name: string; description: string;
  denominationLabel: string; denominationValue: string; denominationCurrency: string;
  sellingPrice: string; purchaseCost: string; lowStockThreshold: string; imagePath: string;
  isActive: boolean; isFeatured: boolean;
};

export const blankProduct: ProductFormValues = {
  id: "", categoryId: "", brand: "", name: "", description: "", denominationLabel: "", denominationValue: "",
  denominationCurrency: "", sellingPrice: "", purchaseCost: "", lowStockThreshold: "5", imagePath: "", isActive: true, isFeatured: false,
};

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export default function ProductForm({ initial, categories }: { initial: ProductFormValues; categories: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveProduct, emptyFormState);
  const [imagePath, setImagePath] = useState(initial.imagePath);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState("");

  const v = (k: keyof ProductFormValues) => (state.values[k as string] ?? String(initial[k] ?? ""));
  const checked = (k: "isActive" | "isFeatured") => (Object.keys(state.values).length ? state.values[k] === "on" : initial[k]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgError("");
    const ext = TYPES[file.type];
    if (!ext) return setImgError("Use a JPG, PNG or WebP image.");
    if (file.size > 1024 * 1024) return setImgError("The image must be 1 MB or smaller.");
    setUploading(true);
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return setImgError("Upload failed. Please try again.");
    setImagePath(path);
  }

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage ok={state.ok} message={state.message} />
      <input type="hidden" name="id" value={initial.id} />
      <input type="hidden" name="imagePath" value={imagePath} />

      <div className="card grid gap-4 p-6 sm:grid-cols-2">
        <Field id="brand" label="Brand" defaultValue={v("brand")} error={state.errors.brand} />
        <Field id="name" label="Product name" defaultValue={v("name")} error={state.errors.name} hint="e.g. Steam Gift Card $10" />
        <div>
          <label htmlFor="categoryId" className="label">Category</label>
          <select id="categoryId" name="categoryId" className="input" defaultValue={v("categoryId")}>
            <option value="">No category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <FieldError message={state.errors.categoryId} />
        </div>
        <Field id="denominationLabel" label="Denomination label" defaultValue={v("denominationLabel")} error={state.errors.denominationLabel} hint="Shown to customers, e.g. $10" />
        <Field id="denominationValue" label="Face value (optional)" defaultValue={v("denominationValue")} error={state.errors.denominationValue} />
        <Field id="denominationCurrency" label="Face value currency (optional)" defaultValue={v("denominationCurrency")} error={state.errors.denominationCurrency} hint="e.g. USD" />
      </div>

      <div className="card grid gap-4 p-6 sm:grid-cols-3">
        <Field id="sellingPrice" label="Selling price (Rs.)" type="number" defaultValue={v("sellingPrice")} error={state.errors.sellingPrice} />
        <Field id="purchaseCost" label="Purchase cost (Rs.)" type="number" defaultValue={v("purchaseCost")} error={state.errors.purchaseCost} hint="Never shown to customers. Used for profit." />
        <Field id="lowStockThreshold" label="Low-stock threshold" type="number" defaultValue={v("lowStockThreshold")} error={state.errors.lowStockThreshold} hint="Shows Low Stock at or below this number." />
      </div>

      <div className="card space-y-4 p-6">
        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea id="description" name="description" rows={4} className="input" defaultValue={v("description")} />
          <FieldError message={state.errors.description} />
        </div>
        <div>
          <span className="label">Product image</span>
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-48 overflow-hidden rounded-xl">
              <ProductImage brand={v("brand") || "Brand"} denomination={v("denominationLabel") || "$0"} imagePath={imagePath || null} alt="Product image preview" />
            </div>
            <div>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} disabled={uploading} aria-label="Upload product image" className="text-sm" />
              <p className="mt-1 text-xs text-ink-muted">JPG, PNG or WebP, up to 1 MB. Landscape 16:10 works best.</p>
              {uploading && <p className="text-xs text-ink-soft">Uploading…</p>}
              {imagePath && <button type="button" className="mt-1 text-xs font-semibold text-rose-700 hover:underline" onClick={() => setImagePath("")}>Remove image</button>}
              <FieldError message={imgError || state.errors.imagePath} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={checked("isActive")} /> Visible in the store</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isFeatured" defaultChecked={checked("isFeatured")} /> Featured on the home page</label>
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={pending || uploading}>{pending ? "Saving…" : initial.id ? "Save changes" : "Create product"}</button>
    </form>
  );
}
