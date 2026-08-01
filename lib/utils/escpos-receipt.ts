// lib/utils/escpos-receipt.ts
//
// Converts the shared receipt line model (lib/utils/receipt-lines.ts) into raw
// ESC/POS bytes for direct Bluetooth thermal printing. Text-mode printing is
// used deliberately instead of rasterizing an image — it's universally
// supported even by cheap/clone thermal printers, whereas image raster
// commands (GS v 0) are inconsistently implemented and produced illegible
// output on the printer actually in use here.

import { ESC_POS } from "./bluetooth-printer";
import { buildReceiptLines, charsPerLineFor, type ReceiptData } from "./receipt-lines";

export type { ReceiptData };

function toBytes(commands: (number[] | string)[]): Uint8Array {
  const encoder = new TextEncoder();
  const arrays: Uint8Array[] = commands.map((cmd) =>
    typeof cmd === "string" ? encoder.encode(cmd) : new Uint8Array(cmd)
  );
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

export function buildEscPosReceipt(data: ReceiptData): Uint8Array {
  const paperWidth   = data.settings?.paperWidth ?? "58mm";
  const charsPerLine = charsPerLineFor(paperWidth);
  const lines        = buildReceiptLines(data, charsPerLine);

  const commands: (number[] | string)[] = [ESC_POS.INIT];

  for (const line of lines) {
    commands.push(line.align === "center" ? ESC_POS.ALIGN_CENTER : ESC_POS.ALIGN_LEFT);
    if (line.bold) commands.push(ESC_POS.BOLD_ON);
    if (line.big)  commands.push(ESC_POS.DOUBLE_HEIGHT);
    commands.push(`${line.text}\n`);
    if (line.big)  commands.push(ESC_POS.NORMAL_SIZE);
    if (line.bold) commands.push(ESC_POS.BOLD_OFF);
  }

  commands.push(ESC_POS.ALIGN_LEFT, "\n\n\n", ESC_POS.CUT_PAPER);
  return toBytes(commands);
}
