import { NextResponse, type NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { z } from "zod";
import { getAdminOrNull } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { writeAudit } from "@/lib/audit";
import { hashCode, validateCode } from "@/lib/code-utils";
import { limited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_ROWS = 5000;
const CHUNK = 500;
const REPORT_LIMIT = 50;

type RowIssue = { row: number; reason: string };
const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

export async function POST(request: NextRequest) {
  // CSRF defence in depth (cookies are also SameSite=Lax): the request must come from this site.
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return fail("Forbidden", 403);

  const admin = await getAdminOrNull();
  if (!admin) return fail("Forbidden", 403);
  if (await limited("code-import", 20, 3600, admin.user.id)) return fail("Too many uploads. Please wait a while and try again.", 429);

  const form = await request.formData();
  const productId = String(form.get("productId") ?? "");
  const file = form.get("file");
  if (!z.string().uuid().safeParse(productId).success) return fail("Choose a valid product.");
  if (!(file instanceof File)) return fail("Choose an .xlsx file to upload.");
  if (!file.name.toLowerCase().endsWith(".xlsx")) return fail("Only .xlsx files are supported. Download the template for the right format.");
  if (file.size === 0) return fail("The file is empty.");
  if (file.size > MAX_BYTES) return fail("The file is too large (4 MB maximum).");

  const db = createAdminClient();
  const { data: product } = await db.from("products").select("id, purchase_cost_npr").eq("id", productId).maybeSingle();
  if (!product) return fail("Product not found.", 404);

  // ---- Parse the workbook ----
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(Buffer.from(await file.arrayBuffer()) as unknown as ExcelJS.Buffer);
  } catch {
    return fail("That file could not be read. Make sure it is a valid .xlsx spreadsheet.");
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return fail("The workbook has no sheets.");

  let codeCol = 0;
  let pinCol = 0;
  sheet.getRow(1).eachCell((cell, col) => {
    const h = cell.text.trim().toLowerCase();
    if (h === "code") codeCol = col;
    if (h === "pin") pinCol = col;
  });
  if (!codeCol) return fail('The first row must contain a column headed "code".');
  if (sheet.rowCount - 1 > MAX_ROWS) return fail(`Too many rows (maximum ${MAX_ROWS} per upload). Split the file and upload in parts.`);

  // ---- Validate rows ----
  const invalid: RowIssue[] = [];
  const duplicatesInFile: RowIssue[] = [];
  const seen = new Set<string>();
  const candidates: { row: number; code: string; pin: string | null; hash: string }[] = [];
  let total = 0;

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const code = String(row.getCell(codeCol).text ?? "").trim();
    const pin = pinCol ? String(row.getCell(pinCol).text ?? "").trim() : "";
    if (!code && !pin) continue; // blank row
    total++;
    const problem = validateCode(code) ?? (pin.length > 64 ? "PIN is too long (maximum 64 characters)" : null);
    if (problem) { invalid.push({ row: r, reason: problem }); continue; }
    const hash = hashCode(code);
    if (seen.has(hash)) { duplicatesInFile.push({ row: r, reason: "Duplicate of an earlier row in this file" }); continue; }
    seen.add(hash);
    candidates.push({ row: r, code, pin: pin || null, hash });
  }
  if (total === 0) return fail("No codes were found below the header row.");

  // ---- Duplicates already in the database ----
  const existing = new Set<string>();
  for (let i = 0; i < candidates.length; i += CHUNK) {
    const hashes = candidates.slice(i, i + CHUNK).map((c) => c.hash);
    const { data, error } = await db.from("gift_card_codes").select("code_hash").in("code_hash", hashes);
    if (error) return fail("We couldn't check for duplicates. Nothing was imported.", 500);
    (data ?? []).forEach((d: { code_hash: string }) => existing.add(d.code_hash));
  }
  const duplicatesInDb: RowIssue[] = [];
  const toInsert = candidates.filter((c) => {
    if (existing.has(c.hash)) { duplicatesInDb.push({ row: c.row, reason: "This code already exists in your inventory" }); return false; }
    return true;
  });

  // ---- Insert ----
  const { data: batch, error: batchErr } = await db
    .from("code_import_batches")
    .insert({ product_id: productId, filename: file.name.slice(0, 200), total_rows: total, created_by: admin.user.id })
    .select("id")
    .single();
  if (batchErr || !batch) return fail("We couldn't start the import. Nothing was imported.", 500);

  let imported = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const rows = toInsert.slice(i, i + CHUNK).map((c) => ({
      product_id: productId, code: c.code, pin: c.pin, code_hash: c.hash,
      cost_npr: product.purchase_cost_npr, import_batch_id: batch.id, created_by: admin.user.id,
    }));
    // ignoreDuplicates covers a race with another upload; the unique hash still protects the database.
    const { data, error } = await db.from("gift_card_codes").upsert(rows, { onConflict: "code_hash", ignoreDuplicates: true }).select("id");
    if (error) {
      await db.from("code_import_batches").update({ imported_rows: imported }).eq("id", batch.id);
      return fail(`The import stopped part-way (${imported} codes were saved). Fix the problem and upload the remaining codes.`, 500);
    }
    imported += (data ?? []).length;
  }

  const dupCount = duplicatesInFile.length + duplicatesInDb.length;
  await db.from("code_import_batches").update({ imported_rows: imported, duplicate_rows: dupCount, invalid_rows: invalid.length }).eq("id", batch.id);
  if (imported > 0) {
    await db.from("inventory_events").insert({ product_id: productId, event_type: "imported", quantity: imported, actor_id: admin.user.id, note: `Excel import: ${file.name.slice(0, 100)}` });
    await writeAudit(admin.user.id, "inventory.codes_imported", "product", productId, { batch_id: batch.id, imported, duplicates: dupCount, invalid: invalid.length });
  }

  return NextResponse.json({
    ok: true, total, imported,
    duplicateCount: dupCount, invalidCount: invalid.length,
    duplicates: [...duplicatesInFile, ...duplicatesInDb].slice(0, REPORT_LIMIT),
    invalid: invalid.slice(0, REPORT_LIMIT),
  });
}
