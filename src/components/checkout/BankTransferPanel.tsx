"use client";

import { useActionState, useState } from "react";
import { submitBankTransfer } from "@/app/actions/checkout";
import { emptyFormState } from "@/lib/validation/form";
import { createClient } from "@/lib/supabase/client";
import { Field, FieldError, FormMessage } from "@/components/auth/Field";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

export default function BankTransferPanel({ orderId, userId }: { orderId: string; userId: string }) {
  const [state, action, pending] = useActionState(submitBankTransfer, emptyFormState);
  const [proofPath, setProofPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(""); setProofPath("");
    const ext = TYPES[file.type];
    if (!ext) return setFileError("Use a JPG, PNG, WebP or PDF file.");
    if (file.size > 5 * 1024 * 1024) return setFileError("The file must be 5 MB or smaller.");
    setUploading(true);
    const path = `${userId}/${orderId}-${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("payment-proofs").upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return setFileError("Upload failed. Please try again.");
    setProofPath(path);
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="proofPath" value={proofPath} />
      <FormMessage ok={false} message={state.message} />
      <Field id="reference" label="Bank transaction reference" defaultValue={state.values.reference} error={state.errors.reference} autoComplete="off" hint="The reference or ID your bank shows after the transfer." />
      <div>
        <label htmlFor="proof" className="label">Payment proof (screenshot or PDF)</label>
        <input id="proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={onFile} disabled={uploading} className="text-sm" />
        {uploading && <p className="mt-1 text-xs text-ink-soft">Uploading…</p>}
        {proofPath && <p className="mt-1 text-xs text-emerald-700">Proof uploaded.</p>}
        <FieldError message={fileError || state.errors.proof} />
      </div>
      <button type="submit" className="btn-primary" disabled={pending || uploading || !proofPath}>{pending ? "Submitting…" : "Submit payment for verification"}</button>
      <p className="text-xs text-ink-muted">Your gift cards are delivered after our team has verified the transfer.</p>
    </form>
  );
}
