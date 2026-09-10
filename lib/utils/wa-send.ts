// lib/utils/wa-send.ts
//
// Outbound WhatsApp delivery for promo blasts.
//
// Two providers:
//   • "manual" — no API. We generate wa.me click-to-chat links and let the
//     admin send them by hand (or build a WhatsApp Broadcast List). Always
//     available, zero setup, zero cost, no ban risk.
//   • "fonnte" — https://fonnte.com free REST gateway. One HTTP call per
//     message (or per batch of identical messages). Set FONNTE_TOKEN to enable.
//
// The provider is chosen automatically: Fonnte if FONNTE_TOKEN is set,
// otherwise manual.

import { parseE164 } from "@/lib/utils/phone";

export type WaProvider = "manual" | "fonnte";

/** Which provider is active, based on env config. */
export function getWaProvider(): WaProvider {
  return process.env.FONNTE_TOKEN ? "fonnte" : "manual";
}

/**
 * E.164 ("+62812…") → bare international digits ("62812…"), which is the shape
 * wa.me and every gateway expects. Falls back to a digit-strip for anything
 * that didn't parse.
 */
export function toWaNumber(phone: string): string {
  const parsed = parseE164(phone);
  if (parsed) return `${parsed.country.code}${parsed.localNumber}`;
  return phone.replace(/\D/g, "").replace(/^0+/, "");
}

/** wa.me click-to-chat link with the message pre-filled. */
export function waMeLink(phone: string, message: string): string {
  return `https://wa.me/${toWaNumber(phone)}?text=${encodeURIComponent(message)}`;
}

export interface WaSendResult {
  ok:     boolean;
  error?: string;
  /** Fonnte queue id(s), when available. */
  id?:    string;
}

/**
 * Send through Fonnte. `target` is one bare number OR a comma-joined list of
 * numbers (Fonnte accepts up to a few hundred per call; we chunk at 100 in the
 * caller). The same `message` goes to every number in `target`.
 *
 * Docs: https://docs.fonnte.com/  →  POST https://api.fonnte.com/send
 *   header: Authorization: <device token>
 *   body:   target, message, countryCode
 */
export async function sendViaFonnte(
  target:  string,
  message: string,
): Promise<WaSendResult> {
  const token = process.env.FONNTE_TOKEN;
  if (!token) return { ok: false, error: "FONNTE_TOKEN is not configured." };

  try {
    const body = new URLSearchParams({
      target,
      message,
      // Our numbers already carry their country code — tell Fonnte not to
      // prepend a default one.
      countryCode: "0",
    });

    const res = await fetch("https://api.fonnte.com/send", {
      method:  "POST",
      headers: { Authorization: token },
      body,
    });

    const data = (await res.json().catch(() => null)) as
      | { status?: boolean; reason?: string; detail?: string; id?: unknown; invalid?: unknown }
      | null;

    if (!res.ok) {
      return { ok: false, error: `Fonnte HTTP ${res.status}` };
    }
    if (!data || data.status !== true) {
      return {
        ok: false,
        error: data?.reason || data?.detail || "Fonnte rejected the request.",
      };
    }

    const id = Array.isArray(data.id)
      ? String(data.id[0])
      : data.id != null
        ? String(data.id)
        : undefined;

    return { ok: true, id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error calling Fonnte.",
    };
  }
}
