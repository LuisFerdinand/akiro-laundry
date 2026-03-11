// components/admin/CustomerDetailClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Phone, MapPin, ShoppingBag,
  TrendingUp, Calendar, Edit2, Save, X, Loader2,
  CheckCircle2, ArrowUpRight, Clock, Waves, PackageCheck,
} from "lucide-react";
import { updateCustomer } from "@/lib/actions/admin-customers";
import { formatUSD, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import type { CustomerDetail } from "@/lib/actions/admin-customers";

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  pending:    { color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
  processing: { color: "#1a7fba", bg: "#edf7fd", border: "#b6def5" },
  done:       { color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
  picked_up:  { color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
};

interface Props { customer: CustomerDetail }

export function CustomerDetailClient({ customer }: Props) {
  const router = useRouter();

  const [editing,  setEditing]  = useState(false);
  const [name,     setName]     = useState(customer.name);
  const [phone,    setPhone]    = useState(customer.phone);
  const [address,  setAddress]  = useState(customer.address);
  const [error,    setError]    = useState<string | null>(null);
  const [saved,    setSaved]    = useState(false);
  const [isPending, start]      = useTransition();

  const handleSave = () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("All fields are required."); return;
    }
    setError(null);
    start(async () => {
      const result = await updateCustomer(customer.id, { name, phone, address });
      if (result.success) {
        setSaved(true);
        setEditing(false);
        router.refresh();
      } else {
        setError(result.error ?? "Failed to save.");
      }
    });
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box" as const,
    padding: "10px 14px",
    border: "1.5px solid #b6def5", borderRadius: "8px",
    fontSize: "14px", color: "#1e293b", outline: "none",
    background: "white",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Back */}
      <Link href="/admin/customers" style={{
        display: "inline-flex", alignItems: "center", gap: "6px",
        fontSize: "12px", fontWeight: 700, color: "#64748b", textDecoration: "none",
      }}>
        <ArrowLeft size={13} /> Back to Customers
      </Link>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "linear-gradient(135deg,#1a7fba,#2496d6)",
            boxShadow: "0 4px 16px rgba(26,127,186,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "20px", color: "white" }}>
              {customer.name[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <h1 style={{
              fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "24px",
              color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "2px",
            }}>{customer.name}</h1>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              Customer since {new Date(customer.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "9px 16px", borderRadius: "8px",
            border: "1.5px solid #e2e8f0", background: "white",
            fontSize: "13px", fontWeight: 700, color: "#475569", cursor: "pointer",
          }}>
            <Edit2 size={13} /> Edit
          </button>
        )}
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>

        {/* Left — Info card */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: editing ? "1.5px solid #b6def5" : "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
          transition: "border-color 0.15s",
        }}>
          <div style={{
            padding: "12px 20px",
            background: editing ? "linear-gradient(135deg,#edf7fd,#c8e9f8)" : "linear-gradient(135deg,#f8fafc,#f1f5f9)",
            borderBottom: "1.5px solid #e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 4, height: 16, borderRadius: "2px", background: "linear-gradient(180deg,#1a7fba,#2496d6)" }} />
              <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {editing ? "Editing Info" : "Customer Info"}
              </p>
            </div>
            {editing && (
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => { setEditing(false); setName(customer.name); setPhone(customer.phone); setAddress(customer.address); setError(null); }}
                  style={{ padding: "4px 10px", borderRadius: "6px", border: "1.5px solid #e2e8f0", background: "white", fontSize: "11px", fontWeight: 700, color: "#64748b", cursor: "pointer" }}>
                  <X size={11} style={{ display: "inline", marginRight: 4 }} />Cancel
                </button>
                <button onClick={handleSave} disabled={isPending} style={{
                  padding: "4px 12px", borderRadius: "6px", border: "none",
                  background: "linear-gradient(135deg,#1a7fba,#2496d6)",
                  fontSize: "11px", fontWeight: 800, color: "white", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: "4px",
                }}>
                  {isPending ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Save
                </button>
              </div>
            )}
          </div>

          <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            {error && (
              <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "9px 13px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
              </div>
            )}
            {saved && !editing && (
              <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "7px", padding: "9px 13px", display: "flex", alignItems: "center", gap: "6px" }}>
                <CheckCircle2 size={13} style={{ color: "#16a34a" }} />
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#14532d" }}>Changes saved successfully.</p>
              </div>
            )}

            {/* Name */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: editing ? "6px" : "4px" }}>
                <User size={12} style={{ color: "#94a3b8" }} />
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Name</span>
              </div>
              {editing
                ? <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
                : <p style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b" }}>{name}</p>}
            </div>

            {/* Phone */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: editing ? "6px" : "4px" }}>
                <Phone size={12} style={{ color: "#94a3b8" }} />
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Phone</span>
              </div>
              {editing
                ? <input value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
                : <p style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b" }}>{phone}</p>}
            </div>

            {/* Address */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: editing ? "6px" : "4px" }}>
                <MapPin size={12} style={{ color: "#94a3b8" }} />
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Address</span>
              </div>
              {editing
                ? <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                    style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "inherit" }} />
                : <p style={{ fontSize: "15px", fontWeight: 600, color: "#1e293b" }}>{address}</p>}
            </div>
          </div>
        </div>

        {/* Right — Stats */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {[
            { label: "Total Orders",  value: customer.totalOrders.toString(),    icon: ShoppingBag, color: "#1a7fba", bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "#b6def5" },
            { label: "Total Spent",   value: formatUSD(customer.totalSpent),     icon: TrendingUp,  color: "#16a34a", bg: "linear-gradient(135deg,#f0fdf4,#dcfce7)", border: "#86efac" },
            { label: "Last Order",    value: customer.lastOrderDate
                ? new Date(customer.lastOrderDate).toLocaleDateString("en-US", { dateStyle: "medium" })
                : "No orders yet",                                                icon: Calendar,    color: "#d97706", bg: "linear-gradient(135deg,#fffbeb,#fef3c7)", border: "#fcd34d" },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div key={label} style={{
              background: "white", borderRadius: "10px",
              border: "1.5px solid #e2e8f0", padding: "16px 18px",
              display: "flex", alignItems: "center", gap: "14px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            }}>
              <div style={{ width: 38, height: 38, borderRadius: "9px", background: bg, border: `1.5px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon size={16} style={{ color }} />
              </div>
              <div>
                <p style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
                <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "18px", color: "#0f172a", marginTop: "1px" }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      {customer.recentOrders.length > 0 && (
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
        }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "14px", color: "#0f172a" }}>Recent Orders</p>
            <Link href={`/admin/orders?search=${customer.name}`} style={{ fontSize: "11px", fontWeight: 700, color: "#1a7fba", textDecoration: "none", background: "#edf7fd", padding: "4px 12px", borderRadius: "999px", border: "1px solid #b6def5" }}>
              View all →
            </Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Order #", "Total", "Payment", "Status", "Date", ""].map((h) => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customer.recentOrders.map((o, i) => {
                  const sc = STATUS_CONFIG[o.status] ?? STATUS_CONFIG.pending;
                  const isPaid = o.paymentStatus === "paid";
                  return (
                    <tr key={o.id} style={{ background: i % 2 === 0 ? "white" : "#fafafa" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                    >
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a7fba", fontFamily: "monospace" }}>{o.orderNumber}</span>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>{formatUSD(parseFloat(o.totalPrice))}</span>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: isPaid ? "#16a34a" : "#d97706", background: isPaid ? "#f0fdf4" : "#fffbeb", border: `1px solid ${isPaid ? "#86efac" : "#fcd34d"}`, padding: "3px 8px", borderRadius: "999px" }}>
                          {isPaid ? "Paid" : "Unpaid"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: sc.color, background: sc.bg, border: `1px solid ${sc.border}`, padding: "3px 8px", borderRadius: "999px" }}>
                          {ORDER_STATUS_LABELS[o.status] ?? o.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                          {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
                        <Link href={`/admin/orders/${o.id}`} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 700, color: "#1a7fba", textDecoration: "none", background: "#edf7fd", padding: "4px 10px", borderRadius: "6px", border: "1px solid #b6def5" }}>
                          View <ArrowUpRight size={10} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}