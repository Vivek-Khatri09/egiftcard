import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getAdminOrNull } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  if (!(await getAdminOrNull())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Codes");
  sheet.columns = [{ header: "code", key: "code", width: 40 }, { header: "pin", key: "pin", width: 20 }];
  sheet.getRow(1).font = { bold: true };
  const help = wb.addWorksheet("Instructions");
  [
    "1. Put one gift card code per row in the 'code' column, starting on row 2.",
    "2. The 'pin' column is optional. Leave it empty if the card has no PIN.",
    "3. Choose the product on the upload form. Every code in the file is added to that product.",
    "4. Duplicates (inside the file or already in your inventory) are skipped and reported.",
    "5. Maximum 5000 rows and 4 MB per upload.",
  ].forEach((line) => help.addRow([line]));
  help.getColumn(1).width = 100;

  const buf = await wb.xlsx.writeBuffer();
  return new Response(new Uint8Array(buf as unknown as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="egiftcard-codes-template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
