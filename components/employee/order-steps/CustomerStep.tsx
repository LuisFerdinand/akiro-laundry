// components/employee/order-steps/CustomerStep.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { User, MapPin, Loader2, X, CheckCircle2, ChevronDown } from "lucide-react";
import { CustomerFormData } from "@/lib/utils/order-form";
import { searchCustomersByPhone } from "@/lib/actions/orders";
import type { Customer } from "@/lib/db/schema";
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY,
  type CountryCode,
  buildE164,
  parseE164,
  formatPhone,
  stripTrunkPrefix,
  validateLocalNumber,
  toSearchDigits,
  digitsOnly,
} from "@/lib/utils/phone";

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-xs font-semibold px-1" style={{ color: "#e05252" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function IconInput({
  icon: Icon,
  error,
  ...props
}: {
  icon: React.ElementType;
  error?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative flex items-center">
      <div
        className="absolute left-3.5 pointer-events-none flex items-center justify-center w-8 h-8 rounded"
        style={{
          background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
          border: "1.5px solid #b6def5",
        }}
      >
        <Icon size={14} style={{ color: "#1a7fba" }} />
      </div>
      <input
        className="w-full h-12 pl-14 pr-4 rounded-md border-2 text-sm font-medium text-slate-800 placeholder:text-slate-300 placeholder:font-normal bg-white outline-none transition-all duration-150"
        style={{ borderColor: error ? "#fca5a5" : "#e2e8f0" }}
        onFocus={(e) => {
          if (!error) e.currentTarget.style.borderColor = "#1a7fba";
          e.currentTarget.style.boxShadow = error
            ? "0 0 0 3.5px rgba(239,68,68,0.12)"
            : "0 0 0 3.5px rgba(26,127,186,0.12)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? "#fca5a5" : "#e2e8f0";
          e.currentTarget.style.boxShadow = "none";
        }}
        {...props}
      />
    </div>
  );
}

// Highlight matching digits in the dropdown list
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const normalText  = digitsOnly(text);
  const normalQuery = digitsOnly(query);
  const idx = normalText.indexOf(normalQuery);
  if (idx === -1) return <span>{text}</span>;

  let matchStart = -1, matchEnd = -1, digitsSeen = 0;
  for (let i = 0; i < text.length; i++) {
    if (/\d/.test(text[i])) {
      if (digitsSeen === idx)                            matchStart = i;
      if (digitsSeen === idx + normalQuery.length - 1)  matchEnd   = i + 1;
      digitsSeen++;
    }
  }
  if (matchStart === -1) return <span>{text}</span>;

  return (
    <span>
      {text.slice(0, matchStart)}
      <span className="font-black rounded px-0.5" style={{ color: "#1a7fba", background: "#dff0fb" }}>
        {text.slice(matchStart, matchEnd)}
      </span>
      {text.slice(matchEnd)}
    </span>
  );
}

// ─── Country Code Selector ────────────────────────────────────────────────────

function CountrySelector({
  selected,
  onChange,
  disabled,
}: {
  selected: CountryCode;
  onChange: (c: CountryCode) => void;
  disabled?: boolean;
}) {
  const [open, setOpen]     = useState(false);
  const [search, setSearch] = useState("");
  const ref                 = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search.replace(/\D/g, ""))
  );

  return (
    <div ref={ref} className="relative shrink-0">
      {/* Trigger button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen((o) => !o); setSearch(""); } }}
        className="h-12 flex items-center gap-1.5 px-3 rounded-l-md transition-all duration-150 select-none"
        style={{
          background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
          borderTopWidth: 2,
          borderBottomWidth: 2,
          borderLeftWidth: 2,
          borderRightWidth: 0,
          borderStyle: "solid",
          borderColor: open ? "#1a7fba" : "#e2e8f0",
          minWidth: 100,
          boxShadow: open ? "0 0 0 3.5px rgba(26,127,186,0.12)" : "none",
          cursor: disabled ? "default" : "pointer",
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <span className="text-lg leading-none">{selected.flag}</span>
        <span className="text-sm font-black" style={{ color: "#1a7fba" }}>
          +{selected.code}
        </span>
        {!disabled && (
          <ChevronDown
            size={13}
            style={{
              color: "#1a7fba",
              transition: "transform 0.15s",
              transform: open ? "rotate(180deg)" : "none",
            }}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-30 left-0 top-full mt-1.5 rounded-md overflow-hidden"
          style={{
            background: "white",
            border: "1.5px solid #c8e9f8",
            boxShadow: "0 8px 32px rgba(26,127,186,0.14), 0 2px 8px rgba(0,0,0,0.06)",
            width: 260,
          }}
        >
          {/* Search */}
          <div className="p-2" style={{ borderBottom: "1px solid #e2e8f0" }}>
            <input
              autoFocus
              placeholder="Search country…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 px-3 text-sm rounded border outline-none"
              style={{ borderColor: "#c8e9f8", color: "#1e293b" }}
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            {filtered.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No matches</p>
            )}
            {filtered.map((c) => (
              <button
                key={c.iso}
                type="button"
                onMouseDown={() => { onChange(c); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                style={{
                  background: c.iso === selected.iso ? "#edf7fd" : "white",
                }}
                onMouseEnter={(e) => {
                  if (c.iso !== selected.iso)
                    (e.currentTarget as HTMLElement).style.background = "#f8fcff";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background =
                    c.iso === selected.iso ? "#edf7fd" : "white";
                }}
              >
                <span className="text-xl leading-none shrink-0">{c.flag}</span>
                <span className="flex-1 text-sm font-medium text-slate-700 truncate">{c.name}</span>
                <span className="text-xs font-black shrink-0" style={{ color: "#1a7fba" }}>
                  +{c.code}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CustomerStepProps {
  data: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
  errors: Record<string, string>;
}

export function CustomerStep({ data, onChange, errors }: CustomerStepProps) {
  // Initialise country + local number from existing data.phone (E.164)
  const initParsed = data.phone ? parseE164(data.phone) : null;
  const [country, setCountry]     = useState<CountryCode>(initParsed?.country ?? DEFAULT_COUNTRY);
  const [localRaw, setLocalRaw]   = useState(initParsed?.localNumber ?? "");

  const [lookupState, setLookupState]   = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const [suggestions, setSuggestions]   = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [phoneError, setPhoneError]     = useState<string | null>(null);
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExistingSelected = !!data.existingCustomerId;

  // ── Derived values ──────────────────────────────────────────────────────────

  /** The E.164 string we'd store, or null if the local part is empty */
  const currentE164 = buildE164(country, localRaw);

  const hasError    = !!(phoneError ?? errors.phone);
  const borderColor = hasError
    ? "#fca5a5"
    : isExistingSelected
    ? "#b6def5"
    : "#e2e8f0";

  // ── Handlers ────────────────────────────────────────────────────────────────

  /**
   * Called whenever the user changes the country selector.
   * We keep whatever local digits they've already typed.
   */
  const handleCountryChange = (newCountry: CountryCode) => {
    setCountry(newCountry);
    setPhoneError(null);
    const e164 = buildE164(newCountry, localRaw);
    onChange({ ...data, phone: e164 ?? "", existingCustomerId: undefined });
    // Re-trigger search with new country
    if (localRaw.length >= 3) triggerSearch(newCountry, localRaw);
  };

  /**
   * Called on every keystroke in the number input.
   * Strips non-digits (and any stray "+") immediately.
   */
  const handleLocalChange = (raw: string) => {
    // Only allow digits (and spaces/dashes for readability — we strip them)
    const cleaned = raw.replace(/[^\d\s\-().]/g, "");
    setLocalRaw(cleaned);
    setPhoneError(null);

    const e164 = buildE164(country, cleaned);

    if (isExistingSelected) {
      // User is editing after a selection — reset
      onChange({ name: "", phone: e164 ?? cleaned, address: "" });
      setLookupState("idle");
      setSuggestions([]);
      setShowDropdown(false);
    } else {
      onChange({ ...data, phone: e164 ?? cleaned });
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const searchDigs = toSearchDigits(cleaned);
    if (searchDigs.length < 3) {
      setLookupState("idle");
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLookupState("loading");
    debounceRef.current = setTimeout(() => triggerSearch(country, cleaned), 300);
  };

  const triggerSearch = async (c: CountryCode, raw: string) => {
    const searchDigs = toSearchDigits(raw);
    if (searchDigs.length < 3) return;

    // Only validate length once the user has typed enough
    if (searchDigs.length >= c.localDigits[0]) {
      const err = validateLocalNumber(c, raw);
      if (err) {
        setPhoneError(err);
        setLookupState("idle");
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }
    }

    const results = await searchCustomersByPhone(searchDigs);
    if (results.length > 0) {
      setSuggestions(results);
      setShowDropdown(true);
      setLookupState("found");
    } else {
      setSuggestions([]);
      setShowDropdown(false);
      setLookupState("not-found");
    }
  };

  const selectCustomer = (c: Customer) => {
    setShowDropdown(false);
    setPhoneError(null);
    setLookupState("found");
    // Parse stored E.164 back to parts
    const parsed = parseE164(c.phone);
    if (parsed) {
      setCountry(parsed.country);
      setLocalRaw(parsed.localNumber);
    } else {
      setLocalRaw(digitsOnly(c.phone));
    }
    onChange({
      existingCustomerId: c.id,
      name:    c.name,
      phone:   c.phone,
      address: c.address ?? "",
    });
  };

  const clearAll = () => {
    setLocalRaw("");
    setPhoneError(null);
    setLookupState("idle");
    setSuggestions([]);
    setShowDropdown(false);
    setCountry(DEFAULT_COUNTRY);
    onChange({ name: "", phone: "", address: "" });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Phone field ───────────────────────────────────────────────────── */}
      <Field label="Phone Number" error={phoneError ?? errors.phone}>
        <div className="relative">
          <div className="flex items-stretch">

            {/* Country code selector */}
            <CountrySelector
              selected={country}
              onChange={handleCountryChange}
              disabled={isExistingSelected}
            />

            {/* Local number input */}
            <div className="relative flex-1 flex items-center">
              <input
                className="w-full h-12 pl-4 pr-16 rounded-r-md text-sm font-medium text-slate-800 placeholder:text-slate-300 placeholder:font-normal bg-white outline-none transition-all duration-150"
                style={{
                  borderWidth: 2,
                  borderStyle: "solid",
                  borderColor,
                }}
                placeholder={country.placeholder}
                value={localRaw}
                onChange={(e) => handleLocalChange(e.target.value)}
                onFocus={(e) => {
                  if (!hasError && !isExistingSelected) e.currentTarget.style.borderColor = "#1a7fba";
                  e.currentTarget.style.boxShadow = hasError
                    ? "0 0 0 3.5px rgba(239,68,68,0.12)"
                    : "0 0 0 3.5px rgba(26,127,186,0.12)";
                  if (suggestions.length > 0 && !isExistingSelected) setShowDropdown(true);
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = borderColor;
                  e.currentTarget.style.boxShadow   = "none";
                  setTimeout(() => setShowDropdown(false), 150);
                }}
                readOnly={isExistingSelected}
                inputMode="tel"
                autoComplete="tel-national"
              />

              {/* Right-side icons */}
              <div className="absolute right-3.5 flex items-center gap-1">
                {lookupState === "loading" && (
                  <Loader2 size={15} className="animate-spin" style={{ color: "#1a7fba" }} />
                )}
                {isExistingSelected && (
                  <CheckCircle2 size={15} style={{ color: "#3ecb9a" }} />
                )}
                {(isExistingSelected || (localRaw.length > 0 && lookupState !== "idle")) && (
                  <button
                    type="button"
                    className="w-6 h-6 rounded-sm flex items-center justify-center transition-colors"
                    style={{ color: "#94a3b8" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                    onClick={clearAll}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Format hint */}
          {!hasError && !isExistingSelected && localRaw.length === 0 && (
            <p className="text-[10px] font-medium text-slate-400 mt-1.5 px-1">
              Select country code, then enter your local number (leading 0 is removed automatically)
            </p>
          )}

          {/* Live search dropdown */}
          {showDropdown && suggestions.length > 0 && !isExistingSelected && (
            <div
              className="absolute z-20 left-0 right-0 top-full mt-1.5 rounded-md overflow-hidden"
              style={{
                background: "white",
                border: "1.5px solid #c8e9f8",
                boxShadow: "0 8px 32px rgba(26,127,186,0.14), 0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <div
                className="px-4 py-2"
                style={{
                  background: "linear-gradient(135deg, #edf7fd 0%, #dff0fb 100%)",
                  borderBottom: "1px solid #c8e9f8",
                }}
              >
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#1a7fba" }}>
                  {suggestions.length} match{suggestions.length > 1 ? "es" : ""} found
                </p>
              </div>

              {suggestions.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={() => selectCustomer(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                  style={{ borderBottom: i < suggestions.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fcff")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                >
                  <div
                    className="w-9 h-9 rounded flex items-center justify-center font-bold text-sm shrink-0"
                    style={{
                      background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
                      border: "1.5px solid #b6def5",
                      color: "#1a7fba",
                    }}
                  >
                    {c.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs font-mono font-semibold" style={{ color: "#607080" }}>
                      <HighlightMatch text={formatPhone(c.phone)} query={toSearchDigits(localRaw)} />
                    </p>
                  </div>
                  <div
                    className="shrink-0 text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-sm"
                    style={{ background: "#edf7fd", color: "#1a7fba", border: "1px solid #b6def5" }}
                  >
                    Select
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Field>

      {/* ── Selected existing customer card ──────────────────────────────── */}
      {isExistingSelected && (
        <div
          className="flex items-center gap-3 p-4 rounded-md"
          style={{
            background: "linear-gradient(135deg, #edf7fd 0%, #dff5f0 100%)",
            border: "2px solid #b6def5",
          }}
        >
          <div
            className="w-11 h-11 rounded flex items-center justify-center font-bold text-white text-base shrink-0"
            style={{
              background: "linear-gradient(135deg, #1a7fba 0%, #2496d6 100%)",
              boxShadow: "0 4px 12px rgba(26,127,186,0.3)",
            }}
          >
            {data.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm text-slate-800 truncate">{data.name}</p>
              <span
                className="text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-wide shrink-0"
                style={{ background: "#c8e9f8", color: "#0f5a85" }}
              >
                Existing
              </span>
            </div>
            <p className="text-xs font-mono font-medium text-slate-500 mt-0.5">
              {data.phone ? formatPhone(data.phone) : ""}
            </p>
            {data.address && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{data.address}</p>
            )}
          </div>
          <CheckCircle2 size={18} style={{ color: "#3ecb9a", flexShrink: 0 }} />
        </div>
      )}

      {/* ── No match hint ─────────────────────────────────────────────────── */}
      {lookupState === "not-found" && !isExistingSelected && toSearchDigits(localRaw).length >= 3 && (
        <div
          className="flex items-start gap-2.5 px-3.5 py-2.5 rounded"
          style={{
            background: "linear-gradient(135deg, #fff8ed 0%, #fff3e0 100%)",
            border: "1.5px solid #fcd9a0",
          }}
        >
          <span className="text-base mt-0.5">👤</span>
          <p className="text-xs font-semibold" style={{ color: "#92601a" }}>
            No customer found. Fill in the details below to create a new one.
          </p>
        </div>
      )}

      {/* ── Name & Address ────────────────────────────────────────────────── */}
      {!isExistingSelected && (
        <div className="space-y-4">
          <Field label="Full Name" error={errors.name}>
            <IconInput
              icon={User}
              placeholder="John Doe"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
              error={errors.name}
            />
          </Field>

          <Field label="Address" error={errors.address}>
            <div className="relative">
              <div
                className="absolute left-3.5 top-3.5 pointer-events-none flex items-center justify-center w-8 h-8 rounded"
                style={{
                  background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
                  border: "1.5px solid #b6def5",
                }}
              >
                <MapPin size={14} style={{ color: "#1a7fba" }} />
              </div>
              <textarea
                className="w-full pl-14 pr-4 pt-3.5 pb-3.5 rounded-md border-2 text-sm font-medium text-slate-800 placeholder:text-slate-300 placeholder:font-normal bg-white resize-none outline-none transition-all duration-150"
                style={{ borderColor: errors.address ? "#fca5a5" : "#e2e8f0" }}
                placeholder="123 Main St, City..."
                rows={3}
                value={data.address}
                onChange={(e) => onChange({ ...data, address: e.target.value })}
                onFocus={(e) => {
                  if (!errors.address) e.currentTarget.style.borderColor = "#1a7fba";
                  e.currentTarget.style.boxShadow = "0 0 0 3.5px rgba(26,127,186,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = errors.address ? "#fca5a5" : "#e2e8f0";
                  e.currentTarget.style.boxShadow   = "none";
                }}
              />
            </div>
          </Field>
        </div>
      )}
    </div>
  );
}