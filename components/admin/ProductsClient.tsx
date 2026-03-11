/* eslint-disable react/no-unescaped-entities */
// components/admin/ProductsClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Save, Loader2, Trash2, Edit2, CheckCircle2,
  Droplets, Wind, ToggleLeft, ToggleRight, AlertTriangle, Package,
} from "lucide-react";
import {
  createSoap,    updateSoap,    deleteSoap,
  createPewangi, updatePewangi, deletePewangi,
} from "@/lib/actions/admin-products";
import { formatUSD } from "@/lib/utils/order-form";
import type { SoapItem, PewangiItem } from "@/lib/actions/admin-products";

type ProductItem = SoapItem | PewangiItem;

// ─── Shared input styles ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  padding: "10px 14px",
  border: "1.5px solid #e2e8f0", borderRadius: "8px",
  fontSize: "14px", color: "#1e293b", outline: "none",
  background: "#f8fafc", fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 800,
  color: "#94a3b8", textTransform: "uppercase",
  letterSpacing: "0.1em", marginBottom: "6px",
};

const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  (e.currentTarget.style.borderColor = "#b6def5");
const onBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
  (e.currentTarget.style.borderColor = "#e2e8f0");

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({
  label, onConfirm, onClose, isPending,
}: {
  label: string; onConfirm: () => void; onClose: () => void; isPending: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
            Delete "{label}"?
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
            This cannot be undone. If this item is linked to existing orders, the deletion will fail.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", width: "100%" }}>
          <button onClick={onClose} style={{
            flex: 1, padding: "10px", borderRadius: "8px",
            border: "1.5px solid #e2e8f0", background: "white",
            fontSize: "13px", fontWeight: 700, color: "#64748b", cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={isPending} style={{
            flex: 1, padding: "10px", borderRadius: "8px", border: "none",
            background: isPending ? "#94a3b8" : "linear-gradient(135deg,#dc2626,#ef4444)",
            fontSize: "13px", fontWeight: 800, color: "white",
            cursor: isPending ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}>
            {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Modal ────────────────────────────────────────────────────────────

function ProductModal({
  type, existing, onClose, onSuccess,
}: {
  type: "soap" | "pewangi";
  existing?: ProductItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit  = !!existing;
  const isSoap  = type === "soap";
  const label   = isSoap ? "Detergent" : "Fragrance";
  const color   = isSoap ? "#0891b2" : "#7c3aed";

  const [name,     setName]     = useState(existing?.name       ?? "");
  const [brand,    setBrand]    = useState(existing?.brand      ?? "");
  const [price,    setPrice]    = useState(existing?.pricePerKg ?? "");
  const [isActive, setIsActive] = useState(existing?.isActive   ?? true);
  const [error,    setError]    = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  const handleSubmit = () => {
    setError(null);
    start(async () => {
      const data = { name, brand, pricePerKg: price, isActive };
      const result = isSoap
        ? isEdit ? await updateSoap(existing!.id, data)    : await createSoap(data)
        : isEdit ? await updatePewangi(existing!.id, data) : await createPewangi(data);
      if (result.success) onSuccess();
      else setError(result.error ?? "Failed.");
    });
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0",
        boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
        width: "100%", maxWidth: "420px", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg,${color},${color}cc)`,
          padding: "18px 22px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {isEdit ? `Edit ${label}` : `New ${label}`}
            </p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "2px" }}>
              {isEdit ? `Edit ${label}` : `Add ${label}`}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)",
            borderRadius: "7px", width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <X size={14} style={{ color: "white" }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Name *</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder={isSoap ? "e.g. Rinso Ultra" : "e.g. Molto Purple"}
              style={inputStyle} onFocus={onFocus} onBlur={onBlur}
            />
          </div>
          <div>
            <label style={labelStyle}>Brand</label>
            <input
              value={brand} onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Unilever"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur}
            />
          </div>
          <div>
            <label style={labelStyle}>Price per KG *</label>
            <input
              value={price} onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00" type="number" min="0" step="0.01"
              style={inputStyle} onFocus={onFocus} onBlur={onBlur}
            />
          </div>

          {isEdit && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "#f8fafc", borderRadius: "8px", border: "1.5px solid #e2e8f0" }}>
              <div>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>Active</p>
                <p style={{ fontSize: "11px", color: "#94a3b8" }}>Inactive items won't appear in new orders</p>
              </div>
              <button onClick={() => setIsActive(!isActive)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                {isActive
                  ? <ToggleRight size={32} style={{ color }} />
                  : <ToggleLeft  size={32} style={{ color: "#94a3b8" }} />}
              </button>
            </div>
          )}

          {error && (
            <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={isPending} style={{
            height: 46, borderRadius: "9px", border: "none",
            background: isPending ? "#94a3b8" : `linear-gradient(135deg,${color},${color}cc)`,
            boxShadow: isPending ? "none" : `0 4px 14px ${color}44`,
            color: "white", fontSize: "14px", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
          }}>
            {isPending
              ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
              : <><Save size={14} /> {isEdit ? "Save Changes" : `Create ${label}`}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Table ────────────────────────────────────────────────────────────

function ProductTable({
  items, color, emptyIcon: EmptyIcon, emptyLabel,
  onEdit, onDelete,
}: {
  items: ProductItem[];
  color: string;
  emptyIcon: React.ElementType;
  emptyLabel: string;
  onEdit:   (item: ProductItem) => void;
  onDelete: (item: ProductItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div style={{ padding: "50px", textAlign: "center" }}>
        <EmptyIcon size={28} style={{ color: "#cbd5e1", margin: "0 auto 10px", display: "block" }} />
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>{emptyLabel}</p>
        <p style={{ fontSize: "12px", color: "#cbd5e1", marginTop: "4px" }}>Click "Add" to get started</p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            {["Name", "Brand", "Price / KG", "Status", ""].map((h) => (
              <th key={h} style={{
                padding: "11px 16px", textAlign: "left",
                fontSize: "10px", fontWeight: 800, color: "#94a3b8",
                textTransform: "uppercase", letterSpacing: "0.08em",
                borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id}
              style={{ background: i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.1s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
            >
              <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{item.name}</p>
              </td>
              <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "12px", color: "#64748b" }}>{item.brand ?? "—"}</span>
              </td>
              <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                  {formatUSD(parseFloat(item.pricePerKg))}
                </span>
              </td>
              <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{
                  fontSize: "10px", fontWeight: 700, padding: "3px 9px", borderRadius: "999px",
                  background: item.isActive ? "#f0fdf4" : "#f8fafc",
                  border: `1px solid ${item.isActive ? "#86efac" : "#e2e8f0"}`,
                  color: item.isActive ? "#16a34a" : "#94a3b8",
                }}>
                  {item.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => onEdit(item)} style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    fontSize: "11px", fontWeight: 700, color: "#1a7fba",
                    background: "#edf7fd", padding: "4px 10px",
                    borderRadius: "6px", border: "1px solid #b6def5", cursor: "pointer",
                  }}>
                    <Edit2 size={10} /> Edit
                  </button>
                  <button onClick={() => onDelete(item)} style={{
                    display: "inline-flex", alignItems: "center", gap: "4px",
                    fontSize: "11px", fontWeight: 700, color: "#be123c",
                    background: "#fff1f2", padding: "4px 10px",
                    borderRadius: "6px", border: "1px solid #fda4af", cursor: "pointer",
                  }}>
                    <Trash2 size={10} /> Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon, title, count, color, onAdd, addLabel, children,
}: {
  icon: React.ElementType; title: string; count: number;
  color: string; onAdd: () => void; addLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
      {/* Card header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "9px",
            background: `${color}18`, border: `1.5px solid ${color}40`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <h2 style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "17px", color: "#0f172a", letterSpacing: "-0.01em" }}>
              {title}
            </h2>
            <p style={{ fontSize: "11px", color: "#94a3b8" }}>{count} item{count !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={onAdd} style={{
          display: "flex", alignItems: "center", gap: "6px",
          padding: "8px 14px", borderRadius: "8px", border: "none",
          background: `linear-gradient(135deg,${color},${color}cc)`,
          boxShadow: `0 3px 10px ${color}44`,
          color: "white", fontSize: "12px", fontWeight: 800, cursor: "pointer",
        }}>
          <Plus size={13} /> {addLabel}
        </button>
      </div>
      {/* Table card */}
      <div style={{
        background: "white", borderRadius: "12px",
        border: "1.5px solid #e2e8f0",
        boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  soaps:       SoapItem[];
  pewangiList: PewangiItem[];
}

type ModalState = { open: boolean; type: "soap" | "pewangi"; existing?: ProductItem };
type DeleteState = { item: ProductItem; type: "soap" | "pewangi" } | null;

export function ProductsClient({ soaps, pewangiList }: Props) {
  const router = useRouter();

  const [modal,        setModal]        = useState<ModalState>({ open: false, type: "soap" });
  const [deleteTarget, setDeleteTarget] = useState<DeleteState>(null);
  const [toast,        setToast]        = useState<string | null>(null);
  const [isPending,    start]           = useTransition();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSuccess = (msg: string) => {
    setModal({ open: false, type: "soap" });
    showToast(msg);
    router.refresh();
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    start(async () => {
      const result = deleteTarget.type === "soap"
        ? await deleteSoap(deleteTarget.item.id)
        : await deletePewangi(deleteTarget.item.id);
      setDeleteTarget(null);
      if (result.success) {
        showToast("Item deleted.");
        router.refresh();
      } else {
        showToast(`Error: ${result.error}`);
      }
    });
  };

  return (
    <>
      {modal.open && (
        <ProductModal
          type={modal.type}
          existing={modal.existing}
          onClose={() => setModal({ open: false, type: "soap" })}
          onSuccess={() => handleSuccess(modal.existing ? "Item updated." : "Item created.")}
        />
      )}
      {deleteTarget && (
        <ConfirmDeleteModal
          label={deleteTarget.item.name}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          isPending={isPending}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: "24px", right: "24px", zIndex: 200,
          background: "white", borderRadius: "10px",
          border: "1.5px solid #86efac", boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          padding: "12px 18px", display: "flex", alignItems: "center", gap: "10px",
        }}>
          <CheckCircle2 size={16} style={{ color: "#16a34a", flexShrink: 0 }} />
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#14532d" }}>{toast}</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Page header */}
        <div>
          <h1 style={{
            fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px",
            color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px",
          }}>Products</h1>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            Manage detergents and fragrances used in orders
          </p>
        </div>

        {/* Two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px", alignItems: "start" }}>

          {/* Detergents */}
          <SectionCard
            icon={Droplets}
            title="Detergents"
            count={soaps.length}
            color="#0891b2"
            onAdd={() => setModal({ open: true, type: "soap" })}
            addLabel="Add Detergent"
          >
            <ProductTable
              items={soaps}
              color="#0891b2"
              emptyIcon={Droplets}
              emptyLabel="No detergents yet"
              onEdit={(item) => setModal({ open: true, type: "soap", existing: item })}
              onDelete={(item) => setDeleteTarget({ item, type: "soap" })}
            />
          </SectionCard>

          {/* Fragrances */}
          <SectionCard
            icon={Wind}
            title="Fragrances"
            count={pewangiList.length}
            color="#7c3aed"
            onAdd={() => setModal({ open: true, type: "pewangi" })}
            addLabel="Add Fragrance"
          >
            <ProductTable
              items={pewangiList}
              color="#7c3aed"
              emptyIcon={Wind}
              emptyLabel="No fragrances yet"
              onEdit={(item) => setModal({ open: true, type: "pewangi", existing: item })}
              onDelete={(item) => setDeleteTarget({ item, type: "pewangi" })}
            />
          </SectionCard>
        </div>
      </div>
    </>
  );
}