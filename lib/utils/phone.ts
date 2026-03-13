/**
 * lib/utils/phone.ts
 *
 * Multi-country phone utilities.
 *
 * Storage format: E.164  →  +{countryCode}{localNumber}
 * e.g.  +67078234567   (Timor-Leste mobile)
 *       +61412345678   (Australia mobile)
 *       +6281234567890 (Indonesia mobile)
 *
 * Rules:
 *  - Numbers are always stored with their full country code prefix.
 *  - Numbers CANNOT start with 0 in storage — leading 0 is treated as a
 *    local trunk prefix and stripped before the country code is prepended.
 *  - The country code itself is chosen by the user via a selector UI;
 *    we do NOT try to auto-detect the country from the digits alone.
 */

// ─── Country catalogue ────────────────────────────────────────────────────────

export interface CountryCode {
  /** ISO 3166-1 alpha-2 code, used as a stable key */
  iso:    string;
  /** Human-readable name */
  name:   string;
  /** Numeric country calling code (without "+") */
  code:   string;
  /** Emoji flag — purely cosmetic */
  flag:   string;
  /**
   * Rough local subscriber length range (excluding trunk/country prefix).
   * Used only for soft validation hints, not hard rejection.
   */
  localDigits: [number, number];
  /** Example local format shown as placeholder */
  placeholder: string;
}

/**
 * Ordered list of country codes, starting with the most relevant for
 * Timor-Leste (default first, then regional neighbours, then global).
 */
export const COUNTRY_CODES: CountryCode[] = [
  // ── Default ───────────────────────────────────────────────────────────────
  { iso: "TL", name: "Timor-Leste",  code: "670", flag: "🇹🇱", localDigits: [7, 8],  placeholder: "7823 4567"       },

  // ── Regional / common in TL ───────────────────────────────────────────────
  { iso: "ID", name: "Indonesia",    code: "62",  flag: "🇮🇩", localDigits: [9, 12], placeholder: "812 3456 7890"   },
  { iso: "AU", name: "Australia",    code: "61",  flag: "🇦🇺", localDigits: [9, 9],  placeholder: "412 345 678"     },
  { iso: "PT", name: "Portugal",     code: "351", flag: "🇵🇹", localDigits: [9, 9],  placeholder: "912 345 678"     },
  { iso: "BR", name: "Brazil",       code: "55",  flag: "🇧🇷", localDigits: [10,11], placeholder: "11 91234-5678"   },
  { iso: "MO", name: "Macao",        code: "853", flag: "🇲🇴", localDigits: [8, 8],  placeholder: "6612 3456"       },
  { iso: "SG", name: "Singapore",    code: "65",  flag: "🇸🇬", localDigits: [8, 8],  placeholder: "9123 4567"       },
  { iso: "MY", name: "Malaysia",     code: "60",  flag: "🇲🇾", localDigits: [9, 10], placeholder: "12-345 6789"     },
  { iso: "PH", name: "Philippines",  code: "63",  flag: "🇵🇭", localDigits: [10,10], placeholder: "917 123 4567"    },
  { iso: "PG", name: "Papua New Guinea", code: "675", flag: "🇵🇬", localDigits: [7,8], placeholder: "7123 4567"    },

  // ── Global ────────────────────────────────────────────────────────────────
  { iso: "US", name: "United States", code: "1",  flag: "🇺🇸", localDigits: [10,10], placeholder: "202 555 0123"   },
  { iso: "GB", name: "United Kingdom",code: "44", flag: "🇬🇧", localDigits: [10,10], placeholder: "7700 900123"    },
  { iso: "CN", name: "China",         code: "86", flag: "🇨🇳", localDigits: [11,11], placeholder: "131 2345 6789"  },
  { iso: "JP", name: "Japan",         code: "81", flag: "🇯🇵", localDigits: [10,11], placeholder: "90-1234-5678"   },
  { iso: "IN", name: "India",         code: "91", flag: "🇮🇳", localDigits: [10,10], placeholder: "98765 43210"    },
  { iso: "NZ", name: "New Zealand",   code: "64", flag: "🇳🇿", localDigits: [8, 9],  placeholder: "21 123 4567"    },
];

export const DEFAULT_COUNTRY = COUNTRY_CODES[0]; // Timor-Leste

/** Look up a CountryCode entry by ISO code. */
export function getCountryByIso(iso: string): CountryCode {
  return COUNTRY_CODES.find((c) => c.iso === iso) ?? DEFAULT_COUNTRY;
}

/** Look up a CountryCode entry by numeric calling code string. */
export function getCountryByCode(code: string): CountryCode | undefined {
  return COUNTRY_CODES.find((c) => c.code === code);
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Strip all non-digit characters from a string.
 */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/**
 * Given raw user input for the "local" part of a number (i.e. the digits
 * they typed after choosing a country code), return just the subscriber
 * digits — stripping any leading 0 (trunk prefix).
 *
 * Examples:
 *   "078234567"  → "78234567"   (TL mobile with trunk 0)
 *   "7823 4567"  → "78234567"
 *   "78234567"   → "78234567"
 */
export function stripTrunkPrefix(localRaw: string): string {
  const d = digitsOnly(localRaw);
  return d.startsWith("0") ? d.slice(1) : d;
}

// ─── Build / parse E.164 ──────────────────────────────────────────────────────

/**
 * Combine a CountryCode and a raw local input into an E.164 string.
 *
 * The local input may contain spaces, dashes, or a leading trunk 0 — all
 * are handled automatically.
 *
 * Returns null if the result would be empty or nonsensical.
 */
export function buildE164(country: CountryCode, localRaw: string): string | null {
  const local = stripTrunkPrefix(localRaw);
  if (!local) return null;
  return `+${country.code}${local}`;
}

/**
 * Parse an E.164 string back into { country, localNumber }.
 *
 * We try each country code from longest to shortest to avoid ambiguous
 * prefix matches (e.g. +1 vs +670 vs +353).
 *
 * Returns null if no known country prefix matches.
 */
export function parseE164(e164: string): { country: CountryCode; localNumber: string } | null {
  if (!e164.startsWith("+")) return null;
  const digits = e164.slice(1); // strip leading "+"

  // Sort longest code first so "+6712345" doesn't match "+6" (China)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);

  for (const country of sorted) {
    if (digits.startsWith(country.code)) {
      const localNumber = digits.slice(country.code.length);
      return { country, localNumber };
    }
  }
  return null;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Format an E.164 phone number for human-readable display.
 *
 * Uses simple grouping rules per country.  Falls back to
 * "+{code} {localDigits}" when no specific rule exists.
 */
export function formatPhone(e164: string): string {
  const parsed = parseE164(e164);
  if (!parsed) return e164;

  const { country, localNumber: l } = parsed;

  switch (country.iso) {
    case "TL":
      // 8-digit mobile: XXXX XXXX  |  7-digit landline: XXX XXXX
      if (l.length === 8) return `+670 ${l.slice(0, 4)} ${l.slice(4)}`;
      if (l.length === 7) return `+670 ${l.slice(0, 3)} ${l.slice(3)}`;
      break;
    case "AU":
      // 9 digits: XXX XXX XXX
      if (l.length === 9) return `+61 ${l.slice(0, 3)} ${l.slice(3, 6)} ${l.slice(6)}`;
      break;
    case "ID":
      // 9–12 digits: XXX XXXX XXXX (approximate)
      if (l.length >= 9) return `+62 ${l.slice(0, 3)} ${l.slice(3, 7)} ${l.slice(7)}`;
      break;
    case "SG":
      // 8 digits: XXXX XXXX
      if (l.length === 8) return `+65 ${l.slice(0, 4)} ${l.slice(4)}`;
      break;
    case "US":
    case "CA":
      // 10 digits: (XXX) XXX-XXXX
      if (l.length === 10) return `+1 (${l.slice(0, 3)}) ${l.slice(3, 6)}-${l.slice(6)}`;
      break;
  }

  // Generic fallback: group into 3–4 digit chunks
  const chunks: string[] = [];
  let remaining = l;
  while (remaining.length > 4) {
    chunks.push(remaining.slice(0, 3));
    remaining = remaining.slice(3);
  }
  if (remaining) chunks.push(remaining);
  return `+${country.code} ${chunks.join(" ")}`;
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate a raw local input for a given country.
 * Returns an error string, or null if the input looks OK.
 *
 * This is intentionally lenient — we only hard-reject obviously wrong
 * lengths.  Edge cases (VoIP, satellite, special numbers) are allowed.
 */
export function validateLocalNumber(country: CountryCode, localRaw: string): string | null {
  const local = stripTrunkPrefix(localRaw);

  if (!local) return "Phone number is required.";
  if (!/^\d+$/.test(local)) return "Phone number must contain digits only.";

  const [minLen, maxLen] = country.localDigits;
  if (local.length < minLen) {
    return `Too short — ${country.name} numbers have ${minLen}–${maxLen} digits.`;
  }
  if (local.length > maxLen) {
    return `Too long — ${country.name} numbers have ${minLen}–${maxLen} digits.`;
  }

  return null;
}

// ─── Search helpers ───────────────────────────────────────────────────────────

/**
 * Given the raw local input the user is typing, return the digit string
 * to use for a DB ILIKE search against stored E.164 numbers.
 *
 * We strip the trunk prefix so "078234567" and "78234567" hit the same rows.
 */
export function toSearchDigits(localRaw: string): string {
  return stripTrunkPrefix(localRaw);
}

// ─── Legacy TL helpers (kept for backward compatibility) ─────────────────────
// These delegate to the new generic functions.

/** @deprecated Use buildE164 + getCountryByIso("TL") */
export function normalizeTLPhone(raw: string): string | null {
  if (!raw?.trim()) return null;
  // If it already has a country code prefix, parse it directly
  if (raw.startsWith("+")) return parseE164(raw) ? raw : null;
  const tl = getCountryByIso("TL");
  const result = buildE164(tl, raw);
  // Only valid for TL if local length is 7–8
  if (!result) return null;
  const local = stripTrunkPrefix(raw);
  if (local.length < 7 || local.length > 8) return null;
  return result;
}

/** @deprecated Use formatPhone */
export const formatTLPhone = formatPhone;

/** @deprecated Use stripTrunkPrefix */
export const extractLocalNumber = stripTrunkPrefix;

/** @deprecated Use validateLocalNumber(getCountryByIso("TL"), raw) */
export function validateTLPhone(raw: string): string | null {
  return validateLocalNumber(getCountryByIso("TL"), raw);
}