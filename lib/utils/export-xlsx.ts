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

// ─── Multi-sheet export ───────────────────────────────────────────────────────

export interface SheetSpec {
  name: string;
  rows: Record<string, unknown>[];
  /** Optional: column keys whose cells should use a numeric (accounting) format. */
  numberColumns?: string[];
}

/**
 * Writes one workbook with several named sheets. Each sheet's column headers come
 * from the keys of its first row. Columns listed in `numberColumns` are written
 * as real numbers with a `#,##0.00` accounting format.
 */
export function exportSheetsToXlsx(sheets: SheetSpec[], filename: string): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const rows = sheet.rows.length > 0 ? sheet.rows : [{ " ": "No data" }];
    const ws = XLSX.utils.json_to_sheet(rows);

    const keys = Object.keys(rows[0] ?? {});
    ws["!cols"] = keys.map((key) => {
      const maxLen = Math.max(
        key.length,
        ...rows.map((r) => String(r[key] ?? "").length),
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });

    // Accounting number format for the requested columns
    const numCols = new Set(sheet.numberColumns ?? []);
    if (numCols.size > 0) {
      const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
      for (let c = range.s.c; c <= range.e.c; c++) {
        if (!numCols.has(keys[c])) continue;
        for (let r = range.s.r + 1; r <= range.e.r; r++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          if (cell && typeof cell.v === "number") {
            cell.t = "n";
            cell.z = "#,##0.00";
          }
        }
      }
    }

    // Sheet names: max 31 chars, no []:*?/\
    const safeName = sheet.name.replace(/[[\]:*?/\\]/g, "").slice(0, 31) || "Sheet";
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  XLSX.writeFile(wb, filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
}

// ─── Finance workbook (accounting-style Debit / Credit) ───────────────────────

export interface FinanceLedgerRow {
  createdAt: Date | string;
  description: string;
  categoryLabel: string;
  debit: number;
  credit: number;
  balanceAfter: number;
}

export interface FinanceRecapInput {
  income:  { label: string; total: number }[];
  expense: { label: string; total: number }[];
  totalIncome: number;
  totalExpense: number;
  operatingExpense: number;
  netProfit: number;
  netCashFlow: number;
}

export interface FinancePieInput {
  title: string;
  segments: { label: string; value: number }[];
}

export function exportFinanceWorkbook(
  data: {
    from: string;
    to: string;
    ledger: FinanceLedgerRow[];
    recap: FinanceRecapInput;
    pies: FinancePieInput[];
  },
  filename: string,
): void {
  const dateFmt = (d: Date | string) =>
    new Date(d).toLocaleString("en-US", {
      year: "numeric", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  // ── Sheet 1: Ledger ──
  const ledgerRows: Record<string, unknown>[] = data.ledger.map((e) => ({
    Date:        dateFmt(e.createdAt),
    Description: e.description,
    Category:    e.categoryLabel,
    Debit:       e.debit || "",
    Credit:      e.credit || "",
    Balance:     e.balanceAfter,
  }));
  ledgerRows.push({
    Date: "", Description: "TOTAL", Category: "",
    Debit:  data.ledger.reduce((s, e) => s + e.debit, 0),
    Credit: data.ledger.reduce((s, e) => s + e.credit, 0),
    Balance: "",
  });

  // ── Sheet 2: Recap ──
  const recapRows: Record<string, unknown>[] = [];
  recapRows.push({ Section: "INCOME", Category: "", Debit: "", Credit: "" });
  for (const r of data.recap.income) {
    recapRows.push({ Section: "", Category: r.label, Debit: "", Credit: r.total });
  }
  recapRows.push({ Section: "", Category: "Total Income", Debit: "", Credit: data.recap.totalIncome });
  recapRows.push({ Section: "", Category: "", Debit: "", Credit: "" });
  recapRows.push({ Section: "EXPENSE", Category: "", Debit: "", Credit: "" });
  for (const r of data.recap.expense) {
    recapRows.push({ Section: "", Category: r.label, Debit: r.total, Credit: "" });
  }
  recapRows.push({ Section: "", Category: "Total Cash Out", Debit: data.recap.totalExpense, Credit: "" });
  recapRows.push({ Section: "", Category: "Operating Expense (excl. change)", Debit: data.recap.operatingExpense, Credit: "" });
  recapRows.push({ Section: "", Category: "", Debit: "", Credit: "" });
  recapRows.push({ Section: "RESULT", Category: "Net Profit", Debit: "", Credit: data.recap.netProfit });
  recapRows.push({ Section: "RESULT", Category: "Net Cash Flow", Debit: "", Credit: data.recap.netCashFlow });

  // ── Sheet 3: Pie Charts ──
  const pieRows: Record<string, unknown>[] = [];
  for (const pie of data.pies) {
    const total = pie.segments.reduce((s, x) => s + x.value, 0) || 1;
    pieRows.push({ Chart: pie.title, Segment: "", Amount: "", "%": "" });
    for (const seg of pie.segments) {
      pieRows.push({
        Chart: "",
        Segment: seg.label,
        Amount: seg.value,
        "%": Math.round((seg.value / total) * 100),
      });
    }
    pieRows.push({ Chart: "", Segment: "", Amount: "", "%": "" });
  }

  exportSheetsToXlsx(
    [
      { name: "Ledger", rows: ledgerRows, numberColumns: ["Debit", "Credit", "Balance"] },
      { name: "Recap",  rows: recapRows,  numberColumns: ["Debit", "Credit"] },
      { name: "Pie Charts", rows: pieRows.length ? pieRows : [{ Chart: "No charts configured" }], numberColumns: ["Amount"] },
    ],
    filename,
  );
}