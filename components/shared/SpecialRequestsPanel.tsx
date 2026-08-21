// components/shared/SpecialRequestsPanel.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Lock, MessageSquarePlus, ArrowUp, ArrowDown } from "lucide-react";
import { addSpecialRequest, removeSpecialRequest } from "@/lib/actions/special-requests";
import { formatUSD } from "@/lib/utils/order-form";
import type { OrderSpecialRequest } from "@/lib/db/schema";

interface Props {
  orderId:         number;
  specialRequests: OrderSpecialRequest[];
  isPaid:          boolean;
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "9px 12px",
  border: "1.5px solid #e2e8f0", borderRadius: "8px",
  fontSize: "13px", color: "#1e293b", outline: "none",
  background: "#f8fafc", fontFamily: "inherit",
};

export function SpecialRequestsPanel({ orderId, specialRequests, isPaid }: Props) {
  const router = useRouter();
  const [adding,      setAdding]      = useState(false);
  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState("");
  const [direction,   setDirection]   = useState<"add" | "subtract">("add");
  const [error,       setError]       = useState<string | null>(null);
  const [isPending,   start]          = useTransition();
  const [deletingId,  setDeletingId]  = useState<number | null>(null);

  const handleAdd = () => {
    setError(null);
    start(async () => {
      const result = await addSpecialRequest(orderId, description, parseFloat(amount), direction);
      if (result.success) {
        setDescription(""); setAmount(""); setDirection("add"); setAdding(false);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to add special request.");
      }
    });
  };

  const handleDelete = (id: number) => {
    setDeletingId(id);
    start(async () => {
      const result = await removeSpecialRequest(id, orderId);
      setDeletingId(null);
      if (result.success) router.refresh();
      else setError(result.error ?? "Failed to remove special request.");
    });
  };

  return (
    <div style={{ padding: "14px 0", display: "flex", flexDirection: "column", gap: "10px" }}>
      {specialRequests.length === 0 && !adding && (
        <p style={{ fontSize: "12px", color: "#94a3b8", padding: "4px 0" }}>
          No special requests on this order yet.
        </p>
      )}

      {specialRequests.map((r) => {
        const value = parseFloat(r.priceAdjustment);
        const isPositive = value >= 0;
        return (
          <div key={r.id} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "10px 12px", borderRadius: "8px",
            background: "#f8fafc", border: "1.5px solid #e8edf2",
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: "7px", flexShrink: 0,
              background: isPositive ? "#f0fdf4" : "#fff1f2",
              border: `1.5px solid ${isPositive ? "#86efac" : "#fda4af"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {isPositive
                ? <ArrowUp size={11} style={{ color: "#16a34a" }} />
                : <ArrowDown size={11} style={{ color: "#e11d48" }} />}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{r.description}</p>
              <p style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>
                {new Date(r.createdAt).toLocaleString()}
              </p>
            </div>
            <span style={{ fontSize: "13px", fontWeight: 800, color: isPositive ? "#16a34a" : "#e11d48", flexShrink: 0 }}>
              {isPositive ? "+" : "−"}{formatUSD(Math.abs(value))}
            </span>
            {!isPaid && (
              <button
                onClick={() => handleDelete(r.id)}
                disabled={isPending && deletingId === r.id}
                style={{
                  flexShrink: 0, background: "#fff1f2", border: "1px solid #fda4af",
                  borderRadius: "6px", width: 26, height: 26,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                {isPending && deletingId === r.id
                  ? <Loader2 size={11} className="animate-spin" style={{ color: "#be123c" }} />
                  : <Trash2 size={11} style={{ color: "#be123c" }} />}
              </button>
            )}
          </div>
        );
      })}

      {isPaid ? (
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          padding: "9px 12px", borderRadius: "8px",
          background: "#f8fafc", border: "1.5px solid #e2e8f0",
        }}>
          <Lock size={12} style={{ color: "#94a3b8", flexShrink: 0 }} />
          <p style={{ fontSize: "11px", color: "#94a3b8" }}>
            This order is paid — special requests are locked to keep the total consistent with the payment.
          </p>
        </div>
      ) : adding ? (
        <div style={{
          padding: "12px", borderRadius: "10px",
          border: "1.5px solid #b6def5", background: "#edf7fd",
          display: "flex", flexDirection: "column", gap: "10px",
        }}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did the customer ask for? e.g. 'Extra stain removal on jacket'"
            rows={2}
            style={{ ...inputStyle, resize: "vertical", background: "white" }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1.5px solid #e2e8f0", flexShrink: 0 }}>
              <button
                type="button" onClick={() => setDirection("add")}
                style={{
                  padding: "9px 12px", border: "none", cursor: "pointer",
                  background: direction === "add" ? "#16a34a" : "white",
                  color: direction === "add" ? "white" : "#64748b",
                  fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px",
                }}
              >
                <ArrowUp size={11} /> Add
              </button>
              <button
                type="button" onClick={() => setDirection("subtract")}
                style={{
                  padding: "9px 12px", border: "none", cursor: "pointer",
                  background: direction === "subtract" ? "#e11d48" : "white",
                  color: direction === "subtract" ? "white" : "#64748b",
                  fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px",
                }}
              >
                <ArrowDown size={11} /> Reduce
              </button>
            </div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number" min="0" step="0.01" placeholder="0.00"
              style={{ ...inputStyle, background: "white" }}
            />
          </div>
          {error && <p style={{ fontSize: "11px", fontWeight: 600, color: "#be123c" }}>{error}</p>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => { setAdding(false); setError(null); }}
              style={{ flex: 1, padding: "9px", borderRadius: "8px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "12px", fontWeight: 700, color: "#64748b", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={isPending}
              style={{
                flex: 2, padding: "9px", borderRadius: "8px", border: "none",
                background: isPending ? "#94a3b8" : "linear-gradient(135deg,#1a7fba,#2496d6)",
                color: "white", fontSize: "12px", fontWeight: 800, cursor: isPending ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              }}
            >
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              Save Request
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
            padding: "10px", borderRadius: "8px", border: "1.5px dashed #b6def5",
            background: "#edf7fd", color: "#1a7fba", fontSize: "12px", fontWeight: 700, cursor: "pointer",
          }}
        >
          <MessageSquarePlus size={13} /> Add Special Request
        </button>
      )}
    </div>
  );
}
