// lib/utils/receipt-raster.ts
//
// Renders the exact receipt HTML used for browser printing (see
// components/employee/PrintReceipt.tsx's buildReceiptHtml) into an ESC/POS
// raster bitmap, so Bluetooth thermal printing looks identical to the
// browser-print/template output — instead of being reconstructed with plain
// ESC/POS text commands, which can never replicate custom fonts, colors, the
// logo image, or exact spacing.

import html2canvas from "html2canvas";
import { ESC_POS } from "./bluetooth-printer";

const GS = 0x1d;

/** Most 58mm thermal heads print 384 dots wide; 80mm heads print 576. */
export function dotWidthFor(paperWidth: string): number {
  return paperWidth.includes("80") ? 576 : 384;
}

/** Renders the receipt HTML off-screen and captures it as a canvas exactly `widthPx` wide. */
async function renderHtmlToCanvas(html: string, widthPx: number): Promise<HTMLCanvasElement> {
  const blob = new Blob([html], { type: "text/html" });
  const url  = URL.createObjectURL(blob);

  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    `position:fixed;top:-9999px;left:-9999px;width:${widthPx}px;height:1px;border:0;visibility:hidden;`;
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload  = () => resolve();
      iframe.onerror = () => reject(new Error("Failed to load receipt HTML for printing."));
      iframe.src = url;
    });

    const doc = iframe.contentDocument;
    if (!doc) throw new Error("Could not access receipt iframe document.");

    // Let the @import web font finish loading before rasterizing — otherwise
    // the capture can happen with the fallback system font still showing.
    try {
      await (doc as unknown as { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    } catch { /* not fatal — proceed with whatever font is currently applied */ }
    await new Promise((r) => setTimeout(r, 250));

    return await html2canvas(doc.body, {
      width:           widthPx,
      windowWidth:     widthPx,
      backgroundColor: "#ffffff",
      scale:           1,
      useCORS:         true,
    });
  } finally {
    document.body.removeChild(iframe);
    URL.revokeObjectURL(url);
  }
}

/** Floyd–Steinberg dithers the canvas to 1-bit and packs it into ESC/POS GS v 0 raster bytes. */
function canvasToRasterCommand(canvas: HTMLCanvasElement): Uint8Array {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);

  for (let i = 0; i < width * height; i++) {
    const r = imageData.data[i * 4];
    const g = imageData.data[i * 4 + 1];
    const b = imageData.data[i * 4 + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Floyd–Steinberg dithering — gives light background tints / gradients a
  // print-friendly halftone pattern instead of collapsing to solid blocks.
  const black = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx    = y * width + x;
      const oldVal = gray[idx];
      const newVal = oldVal < 128 ? 0 : 255;
      const err     = oldVal - newVal;
      black[idx] = newVal === 0 ? 1 : 0;

      if (x + 1 < width)                     gray[idx + 1]         += (err * 7) / 16;
      if (x - 1 >= 0 && y + 1 < height)       gray[idx + width - 1] += (err * 3) / 16;
      if (y + 1 < height)                    gray[idx + width]     += (err * 5) / 16;
      if (x + 1 < width && y + 1 < height)    gray[idx + width + 1] += (err * 1) / 16;
    }
  }

  const bytesPerRow = Math.ceil(width / 8);
  const raster = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (black[y * width + x]) {
        raster[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x % 8);
      }
    }
  }

  // GS v 0 m xL xH yL yH d1...dk — normal-mode raster bit image
  const header = new Uint8Array([
    GS, 0x76, 0x30, 0x00,
    bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
  ]);

  const command = new Uint8Array(header.length + raster.length);
  command.set(header, 0);
  command.set(raster, header.length);
  return command;
}

/**
 * Builds the full print job (init + rasterized receipt + feed + cut) for a Bluetooth
 * thermal printer. `html` must already have its <body> width set to `widthPx` (see
 * buildReceiptHtml's `opts.widthPx`) — otherwise the captured canvas won't fill the
 * printer's actual dot width.
 */
export async function buildReceiptRaster(html: string, widthPx: number): Promise<Uint8Array> {
  const canvas = await renderHtmlToCanvas(html, widthPx);
  const raster  = canvasToRasterCommand(canvas);

  const feedAndCut = new Uint8Array([0x0a, 0x0a, 0x0a, 0x0a, ...ESC_POS.CUT_PAPER]);

  const result = new Uint8Array(ESC_POS.INIT.length + raster.length + feedAndCut.length);
  result.set(new Uint8Array(ESC_POS.INIT), 0);
  result.set(raster, ESC_POS.INIT.length);
  result.set(feedAndCut, ESC_POS.INIT.length + raster.length);
  return result;
}
