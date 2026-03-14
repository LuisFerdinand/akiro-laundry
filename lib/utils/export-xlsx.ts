// lib/utils/export-xlsx.ts
/**
 * Client-side XLSX export using the `xlsx` (SheetJS) package.
 * Install: npm install xlsx
 */
import * as XLSX from "xlsx";

interface ExportOptions {
  filename:    string;
  sheetName?:  string;
}

/**
 * Takes an array of plain objects and downloads an Excel file.
 * Keys of the first object become column headers.
 */
export function exportToXlsx<T extends Record<string, unknown>>(
  rows:    T[],
  options: ExportOptions,
): void {
  const { filename, sheetName = "Sheet1" } = options;

  // Build worksheet from JSON; header order follows key insertion order
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-size columns
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => {
    const maxLen = Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length),
    );
    return { wch: Math.min(maxLen + 2, 50) };
  });
  ws["!cols"] = colWidths;

  // Style the header row (bold + blue fill) using SheetJS-style cell props
  // Note: full styling requires the "xlsx-style" fork; basic SheetJS only
  // supports structure. The header will still be clearly labelled.
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddr]) continue;
    ws[cellAddr].s = {
      font:      { bold: true, color: { rgb: "FFFFFF" } },
      fill:      { fgColor: { rgb: "1A7FBA" } },
      alignment: { horizontal: "center" },
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Trigger browser download
  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}