// components/admin/CustomersClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, X, Loader2, Save,
  Users, Phone, MapPin, ShoppingBag,
  TrendingUp, ArrowUpRight, Calendar,
} from "lucide-react";
import { createCustomer } from "@/lib/actions/admin-customers";
import { formatUSD } from "@/lib/utils/order-form";
import type { CustomerWithStats } from "@/lib/actions/admin-customers";

// ─── Create Customer Modal ────────────────────────────────────────────────────

function CreateCustomerModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [address, setAddress] = useState("");
  const [error,   setError]   = useState<string | null>(null);
  const [isPending, start]    = useTransition();

  const handleSubmit = () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      setError("All fields are required."); return;
    }
    setError(null);
    start(async () => {
      const result = await createCustomer({ name, phone, address });
      if (result.success) onSuccess();
      else setError(result.error ?? "Failed to create customer.");
    });
  };

  const inputStyle = {
    width: "100%", boxSizing: "border-box" as const,
    padding: "10px 14px",
    border: "1.5px solid #e2e8f0", borderRadius: "8px",
    fontSize: "14px", color: "#1e293b", outline: "none",
    background: "#f8fafc",
  };

  const labelStyle = {
    display: "block", fontSize: "10px", fontWeight: 800,
    color: "#94a3b8", textTransform: "uppercase" as const,
    letterSpacing: "0.1em", marginBottom: "6px",
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(15,23,42,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px", backdropFilter: "blur(4px)",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "white", borderRadius: "14px",
        border: "1.5px solid #e2e8f0",
        boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
        width: "100%", maxWidth: "440px", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
          padding: "18px 22px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              New Customer
            </p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "2px" }}>Add Customer</p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)",
            borderRadius: "7px", width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <X size={14} style={{ color: "white" }} />
          </button>
        </div>

        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={labelStyle}>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maria Santos" style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#b6def5"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
          </div>
          <div>
            <label style={labelStyle}>Phone Number</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+670 7XXX XXXX" style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#b6def5"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
          </div>
          <div>
            <label style={labelStyle}>Address</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, area, city…" rows={2}
              style={{ ...inputStyle, resize: "vertical" as const, fontFamily: "inherit" }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#b6def5"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
          </div>

          {error && (
            <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={isPending} style={{
            height: 46, borderRadius: "9px", border: "none",
            background: isPending ? "#94a3b8" : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
            boxShadow: isPending ? "none" : "0 4px 14px rgba(26,127,186,0.3)",
            color: "white", fontSize: "14px", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: isPending ? "not-allowed" : "pointer",
            opacity: isPending ? 0.6 : 1,
          }}>
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Create Customer</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  customers:     CustomerWithStats[];
  initialSearch: string;
}

export function CustomersClient({ customers, initialSearch }: Props) {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const [search,     setSearch]     = useState(initialSearch);
  const [showModal,  setShowModal]  = useState(false);
  const [isPending,  start]         = useTransition();

  const handleSearch = (v: string) => {
    setSearch(v);
    const sp = new URLSearchParams(searchParams.toString());
    if (v) sp.set("search", v); else sp.delete("search");
    start(() => { router.push(`${pathname}?${sp.toString()}`); });
  };

  const handleCreated = () => {
    setShowModal(false);
    router.refresh();
  };

  return (
    <>
      {showModal && <CreateCustomerModal onClose={() => setShowModal(false)} onSuccess={handleCreated} />}

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{
              fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px",
              color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px",
            }}>Customers</h1>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>{customers.length} customer{customers.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => setShowModal(true)} style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "10px 18px", borderRadius: "9px", border: "none",
            background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
            boxShadow: "0 4px 14px rgba(26,127,186,0.3)",
            color: "white", fontSize: "13px", fontWeight: 800, cursor: "pointer",
          }}>
            <Plus size={15} /> Add Customer
          </button>
        </div>

        {/* Search */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0", padding: "14px 18px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <div style={{ position: "relative", maxWidth: "380px" }}>
            <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by name or phone…"
              style={{
                width: "100%", boxSizing: "border-box",
                paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                border: "1.5px solid #e2e8f0", borderRadius: "8px",
                fontSize: "13px", color: "#1e293b", outline: "none", background: "#f8fafc",
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
          opacity: isPending ? 0.6 : 1, transition: "opacity 0.15s",
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Customer", "Phone", "Address", "Orders", "Total Spent", "Last Order", ""].map((h) => (
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
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "48px", textAlign: "center" }}>
                      <Users size={28} style={{ color: "#cbd5e1", margin: "0 auto 10px", display: "block" }} />
                      <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>No customers found</p>
                    </td>
                  </tr>
                ) : customers.map((c, i) => (
                  <tr key={c.id}
                    style={{ background: i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.1s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                  >
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg,#1a7fba,#2496d6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ fontSize: "12px", fontWeight: 800, color: "white" }}>
                            {c.name[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{c.name}</p>
                          <p style={{ fontSize: "10px", color: "#94a3b8" }}>
                            Since {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "12px", color: "#475569" }}>{c.phone}</span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9", maxWidth: "200px" }}>
                      <span style={{ fontSize: "12px", color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {c.address}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{
                        fontSize: "12px", fontWeight: 700,
                        color: "#1a7fba", background: "#edf7fd",
                        border: "1px solid #b6def5", padding: "3px 8px", borderRadius: "999px",
                      }}>
                        {c.totalOrders}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                        {formatUSD(c.totalSpent)}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                        {c.lastOrderDate
                          ? new Date(c.lastOrderDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "No orders yet"}
                      </span>
                    </td>
                    <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                      <Link href={`/admin/customers/${c.id}`} style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        fontSize: "11px", fontWeight: 700, color: "#1a7fba",
                        textDecoration: "none", background: "#edf7fd",
                        padding: "4px 10px", borderRadius: "6px", border: "1px solid #b6def5",
                      }}>
                        View <ArrowUpRight size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}