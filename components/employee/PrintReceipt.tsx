// components/employee/PrintReceipt.tsx
//
// Bluetooth thermal printing (ESC/POS text) is the one and only print path —
// this is the printer actually in use, on every device. The browser/PDF HTML
// path below only ever runs as a last resort when Web Bluetooth itself isn't
// supported by the browser (Safari/Firefox), never as an equal alternative.
// Both paths render the exact same content (lib/utils/receipt-lines.ts).
import { mergeReceiptSettings, buildReceiptContent, charsPerLineFor, type ReceiptData } from "@/lib/utils/receipt-lines";
import { printer, isBluetoothSupported } from "@/lib/utils/bluetooth-printer";
import { buildEscPosReceipt } from "@/lib/utils/escpos-receipt";
import { toast } from "sonner";

export type { ReceiptData };

// ─── Bluetooth print (the only real print path) ────────────────────────────────

async function printViaBluetooth(data: ReceiptData): Promise<boolean> {
  if (!isBluetoothSupported()) return false; // Safari / Firefox — no Web Bluetooth at all

  try {
    if (!printer.isConnected) {
      toast.info("Printer not connected — pick your printer to continue.");
      await printer.connect();
    }
    await printer.write(buildEscPosReceipt(data));
    return true;
  } catch (err) {
    console.warn("Bluetooth print failed:", err);
    toast.error("Couldn't print the receipt. Reconnect the Bluetooth printer and try again.");
    // Bluetooth is the only real printer here — don't silently fall back to a
    // differently-formatted browser print dialog after a connection error.
    return true;
  }
}

// ─── iframe / window.print() — last resort only, unsupported browsers ────────

function printViaIframe(html: string, delayMs: number): void {
  // Use Blob URL instead of document.write() — avoids Safari crashes
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;";
  iframe.src = url;

  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(iframe);
        URL.revokeObjectURL(url); // free memory
      }, 2000);
    }, delayMs);
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Renders the exact same content as the ESC/POS path — just as plain monospace HTML for printing. */
function buildFallbackHtml(data: ReceiptData): string {
  const s            = mergeReceiptSettings(data.settings);
  const charsPerLine = charsPerLineFor(s.paperWidth);
  const lines        = buildReceiptContent(data, charsPerLine);

  const bodyHtml = lines
    .map((segments) => {
      const html = segments
        .map((seg) => (seg.bold ? `<b>${escapeHtml(seg.text)}</b>` : escapeHtml(seg.text)))
        .join("");
      return `<div>${html || "&nbsp;"}</div>`;
    })
    .join("");

  const fontSizePx = s.fontSize === "large" ? 22 : 12;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Receipt - ${escapeHtml(data.orderNumber)}</title>
<style>
  @page { size: ${s.paperWidth} auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { width: ${s.paperWidth}; background: white; }
  body {
    font-family: 'Courier New', monospace; font-size: ${fontSizePx}px;
    color: #000; background: white; width: ${s.paperWidth};
    padding: ${s.paperPadding};
  }
  div { white-space: pre-wrap; word-break: break-word; line-height: 1.5; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function printReceipt(data: ReceiptData): Promise<void> {
  // 1. Bluetooth thermal printing — the only real print path
  const printedViaBluetooth = await printViaBluetooth(data);
  if (printedViaBluetooth) return;

  // 2. Last resort only: browser this app is running in has no Web Bluetooth
  // support at all (Safari/Firefox) — open the OS print dialog instead.
  const s = mergeReceiptSettings(data.settings);
  printViaIframe(buildFallbackHtml(data), s.printDelayMs);
}
