// lib/utils/escpos-receipt.ts
//
// Converts the shared receipt content (lib/utils/receipt-lines.ts) into raw
// ESC/POS bytes for direct Bluetooth thermal printing. Text-mode printing is
// used deliberately instead of rasterizing an image — it's universally
// supported even by cheap/clone thermal printers.

import { ESC_POS } from "./bluetooth-printer";
import { buildReceiptContent, charsPerLineFor, mergeReceiptSettings, type ReceiptData } from "./receipt-lines";

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
  const s            = mergeReceiptSettings(data.settings);
  const charsPerLine = charsPerLineFor(s.paperWidth);
  const lines        = buildReceiptContent(data, charsPerLine);

  const commands: (number[] | string)[] = [
    ESC_POS.INIT,
    ESC_POS.ALIGN_LEFT,
    s.fontSize === "large" ? ESC_POS.LARGE_SIZE : ESC_POS.NORMAL_SIZE,
  ];

  for (const segments of lines) {
    for (const seg of segments) {
      if (!seg.text) continue;
      if (seg.bold) commands.push(ESC_POS.BOLD_ON, seg.text, ESC_POS.BOLD_OFF);
      else commands.push(seg.text);
    }
    commands.push("\n");
  }

  commands.push("\n\n\n", ESC_POS.CUT_PAPER);
  return toBytes(commands);
}
