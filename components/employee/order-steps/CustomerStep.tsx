// components/employee/order-steps/CustomerStep.tsx
"use client";

import { useState, useRef } from "react";
import { User, Phone, MapPin, Loader2, X, CheckCircle2 } from "lucide-react";
import { CustomerFormData } from "@/lib/utils/order-form";
import { searchCustomersByPhone } from "@/lib/actions/orders";
import type { Customer } from "@/lib/db/schema";

interface CustomerStepProps {
  data: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
  errors: Record<string, string>;
}

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

// Highlight the matching portion of the phone number
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <span>{text}</span>;
  const normalText = text.replace(/\s/g, "");
  const normalQuery = query.replace(/\s/g, "");
  const idx = normalText.indexOf(normalQuery);
  if (idx === -1) return <span>{text}</span>;

  // Map back to original string positions (with spaces)
  let matchStart = -1;
  let matchEnd = -1;
  let stripped = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== " ") {
      if (stripped === idx) matchStart = i;
      if (stripped === idx + normalQuery.length - 1) matchEnd = i + 1;
      stripped++;
    }
  }

  if (matchStart === -1) return <span>{text}</span>;

  return (
    <span>
      {text.slice(0, matchStart)}
      <span
        className="font-black rounded px-0.5"
        style={{ color: "#1a7fba", background: "#dff0fb" }}
      >
        {text.slice(matchStart, matchEnd)}
      </span>
      {text.slice(matchEnd)}
    </span>
  );
}

export function CustomerStep({ data, onChange, errors }: CustomerStepProps) {
  const [phoneRaw, setPhoneRaw]         = useState(data.phone || "");
  const [lookupState, setLookupState]   = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const [suggestions, setSuggestions]   = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef                     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isExistingSelected = !!data.existingCustomerId;

  const handlePhoneChange = (value: string) => {
    setPhoneRaw(value);

    // Reset if user edits after a selection
    if (data.existingCustomerId) {
      onChange({ name: "", phone: value, address: "" });
      setLookupState("idle");
      setSuggestions([]);
      setShowDropdown(false);
    } else {
      onChange({ ...data, phone: value });
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const normalized = value.replace(/\D/g, "");
    if (normalized.length < 3) {
      setLookupState("idle");
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setLookupState("loading");

    debounceRef.current = setTimeout(async () => {
      const results = await searchCustomersByPhone(normalized);
      if (results.length > 0) {
        setSuggestions(results);
        setShowDropdown(true);
        setLookupState("found");
      } else {
        setSuggestions([]);
        setShowDropdown(false);
        setLookupState("not-found");
      }
    }, 300);
  };

  const selectCustomer = (c: Customer) => {
    setShowDropdown(false);
    setLookupState("found");
    setPhoneRaw(c.phone);
    onChange({
      existingCustomerId: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address ?? "",
    });
  };

  const clearAll = () => {
    setPhoneRaw("");
    setLookupState("idle");
    setSuggestions([]);
    setShowDropdown(false);
    onChange({ name: "", phone: "", address: "" });
  };

  return (
    <div className="space-y-5">

      {/* Phone search field */}
      <Field label="Phone Number" error={errors.phone}>
        <div className="relative">
          <div className="relative flex items-center">
            <div
              className="absolute left-3.5 z-10 pointer-events-none flex items-center justify-center w-8 h-8 rounded"
              style={{
                background: "linear-gradient(135deg, #edf7fd 0%, #c8e9f8 100%)",
                border: "1.5px solid #b6def5",
              }}
            >
              <Phone size={14} style={{ color: "#1a7fba" }} />
            </div>

            <input
              className="w-full h-12 pl-14 pr-16 rounded-md border-2 text-sm font-medium text-slate-800 placeholder:text-slate-300 placeholder:font-normal bg-white outline-none transition-all duration-150"
              style={{ borderColor: errors.phone ? "#fca5a5" : isExistingSelected ? "#b6def5" : "#e2e8f0" }}
              placeholder="Start typing a number..."
              value={phoneRaw}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onFocus={(e) => {
                if (!errors.phone && !isExistingSelected) e.currentTarget.style.borderColor = "#1a7fba";
                e.currentTarget.style.boxShadow = "0 0 0 3.5px rgba(26,127,186,0.12)";
                if (suggestions.length > 0 && !isExistingSelected) setShowDropdown(true);
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = errors.phone
                  ? "#fca5a5"
                  : isExistingSelected
                  ? "#b6def5"
                  : "#e2e8f0";
                e.currentTarget.style.boxShadow = "none";
                // Delay hide so click on dropdown registers
                setTimeout(() => setShowDropdown(false), 150);
              }}
              readOnly={isExistingSelected}
            />

            <div className="absolute right-3.5 flex items-center gap-1">
              {lookupState === "loading" && (
                <Loader2 size={15} className="animate-spin" style={{ color: "#1a7fba" }} />
              )}
              {isExistingSelected && (
                <CheckCircle2 size={15} style={{ color: "#3ecb9a" }} />
              )}
              {(isExistingSelected || (phoneRaw.length > 0 && lookupState !== "idle")) && (
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
                  {/* Avatar */}
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{c.name}</p>
                    <p className="text-xs font-mono font-semibold" style={{ color: "#607080" }}>
                      <HighlightMatch text={c.phone} query={phoneRaw} />
                    </p>
                  </div>

                  {/* Select pill */}
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

      {/* Selected existing customer card */}
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
            <p className="text-xs font-medium text-slate-500">{data.phone}</p>
            {data.address && (
              <p className="text-xs text-slate-400 truncate mt-0.5">{data.address}</p>
            )}
          </div>
          <CheckCircle2 size={18} style={{ color: "#3ecb9a", flexShrink: 0 }} />
        </div>
      )}

      {/* No match hint */}
      {lookupState === "not-found" && !isExistingSelected && phoneRaw.length >= 3 && (
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

      {/* Name & Address — always visible unless existing customer is selected */}
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
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>
          </Field>
        </div>
      )}

    </div>
  );
}