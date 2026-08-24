// components/admin/SegmentedControl.tsx
"use client";

export function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value:   T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", background: "#f1f5f9", borderRadius: "10px", padding: "3px", gap: "2px" }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              border: "none", cursor: "pointer",
              padding: "6px 13px", borderRadius: "7px",
              fontSize: "11.5px", fontWeight: 700,
              fontFamily: "inherit",
              background: active ? "white" : "transparent",
              color: active ? "#0f172a" : "#64748b",
              boxShadow: active ? "0 1px 4px rgba(15,23,42,0.1)" : "none",
              transition: "background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
