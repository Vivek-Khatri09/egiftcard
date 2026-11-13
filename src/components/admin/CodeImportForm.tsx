"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Issue = { row: number; reason: string };
type Report = { total: number; imported: number; duplicateCount: number; invalidCount: number; duplicates: Issue[]; invalid: Issue[] };

export default function CodeImportForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Report | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const file = fd.get("file");
    if (!(file instanceof File) || file.size === 0) return setError("Choose an .xlsx file first.");
    setBusy(true); setError(""); setReport(null);
    try {
      const res = await fetch("/api/admin/codes/import", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.ok) setError(json.error ?? "The upload failed.");
      else { setReport(json as Report); form.reset(); router.refresh(); }
    } catch {
      setError("The upload failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Bulk upload from Excel</h2>
        <a href="/api/admin/codes/template" className="text-sm font-semibold text-brand-700 hover:underline">Download template</a>
      </div>
      <input type="hidden" name="productId" value={productId} />
      <div>
        <label htmlFor="file" className="label">Excel file (.xlsx)</label>
        <input id="file" name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="text-sm" />
        <p className="mt-1 text-xs text-ink-muted">Columns: <code>code</code> (required), <code>pin</code> (optional). Up to 5000 rows and 4 MB. Every code is added to this product.</p>
      </div>
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Importing…" : "Upload and import"}</button>

      {error && <p role="alert" className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
      {report && (
        <div role="status" className="space-y-3 rounded-xl bg-surface-alt p-4 text-sm">
          <p className="font-semibold">
            Imported {report.imported} of {report.total} rows. {report.duplicateCount} duplicate{report.duplicateCount === 1 ? "" : "s"} skipped, {report.invalidCount} invalid.
          </p>
          {report.invalid.length > 0 && (
            <div>
              <p className="font-medium text-rose-700">Invalid rows{report.invalidCount > report.invalid.length ? ` (first ${report.invalid.length})` : ""}</p>
              <ul className="list-disc pl-5 text-ink-soft">{report.invalid.map((i) => <li key={`i${i.row}`}>Row {i.row}: {i.reason}</li>)}</ul>
            </div>
          )}
          {report.duplicates.length > 0 && (
            <div>
              <p className="font-medium text-amber-700">Duplicates{report.duplicateCount > report.duplicates.length ? ` (first ${report.duplicates.length})` : ""}</p>
              <ul className="list-disc pl-5 text-ink-soft">{report.duplicates.map((i) => <li key={`d${i.row}`}>Row {i.row}: {i.reason}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
