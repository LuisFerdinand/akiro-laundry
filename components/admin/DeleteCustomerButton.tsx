// components/admin/DeleteCustomerButton.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { deleteCustomer } from "@/lib/actions/admin-customers";

interface Props {
  customerId:   number;
  customerName: string;
  /** Where to navigate after a successful delete. Omit to just refresh the current page. */
  redirectTo?:  string;
  /** Render as a small pill (for table rows) instead of the larger header-style button. */
  compact?:     boolean;
}

export function DeleteCustomerButton({ customerId, customerName, redirectTo, compact = false }: Props) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, start]            = useTransition();
  const [error, setError]             = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    start(async () => {
      const result = await deleteCustomer(customerId);
      if (result.success) {
        setShowConfirm(false);
        if (redirectTo) router.push(redirectTo);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to delete customer.");
      }
    });
  };

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
          style={{
            display: "inline-flex", alignItems: "center", gap: "4px",
            fontSize: "11px", fontWeight: 700, color: "#be123c",
            background: "#fff1f2", padding: "4px 10px",
            borderRadius: "6px", border: "1px solid #fda4af",
            cursor: "pointer", whiteSpace: "nowrap",
          }}
        >
          <Trash2 size={10} /> Delete
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(true); }}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "9px 16px", borderRadius: "8px",
            border: "1.5px solid #fda4af", background: "#fff1f2",
            fontSize: "13px", fontWeight: 700, color: "#be123c", cursor: "pointer",
          }}
        >
          <Trash2 size={13} /> Delete
        </button>
      )}

      {showConfirm && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget && !isPending) setShowConfirm(false); }}
        >
          <div style={{
            background: "white", borderRadius: "14px", border: "1.5px solid #fda4af",
            boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
            width: "100%", maxWidth: "380px", padding: "28px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%",
              background: "#fff1f2", border: "1.5px solid #fda4af",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <AlertTriangle size={22} style={{ color: "#be123c" }} />
            </div>
            <div>
              <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "16px", color: "#0f172a", marginBottom: "6px" }}>
                Delete &quot;{customerName}&quot;?
              </p>
              <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
                This will permanently delete this customer record. This action cannot be undone.
              </p>
            </div>
            {error && (
              <div style={{ width: "100%", background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
              </div>
            )}
            <div style={{ display: "flex", gap: "10px", width: "100%" }}>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowConfirm(false); }}
                disabled={isPending}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px",
                  border: "1.5px solid #e2e8f0", background: "white",
                  fontSize: "13px", fontWeight: 700, color: "#64748b",
                  cursor: isPending ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(); }}
                disabled={isPending}
                style={{
                  flex: 1, padding: "10px", borderRadius: "8px", border: "none",
                  background: isPending ? "#94a3b8" : "linear-gradient(135deg,#dc2626,#ef4444)",
                  fontSize: "13px", fontWeight: 800, color: "white",
                  cursor: isPending ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                }}
              >
                {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
