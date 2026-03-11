// components/admin/SettingsClient.tsx
"use client";

import { useState, useTransition } from "react";
import {
  KeyRound, Save, Loader2, CheckCircle2, Eye, EyeOff,
  ShieldCheck, User, Mail,
} from "lucide-react";
import { changeAdminPassword } from "@/lib/actions/admin-users";

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "10px", fontWeight: 800,
  color: "#94a3b8", textTransform: "uppercase",
  letterSpacing: "0.1em", marginBottom: "6px",
};

// ─── Password input with show/hide toggle ─────────────────────────────────────

function PasswordInput({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", boxSizing: "border-box",
          padding: "10px 42px 10px 14px",
          border: "1.5px solid #e2e8f0", borderRadius: "8px",
          fontSize: "14px", color: "#1e293b", outline: "none",
          background: "#f8fafc", fontFamily: "inherit",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "#b6def5")}
        onBlur={(e)  => (e.currentTarget.style.borderColor = "#e2e8f0")}
      />
      <button
        onClick={() => setShow(!show)}
        style={{
          position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: "#94a3b8", display: "flex", alignItems: "center",
        }}
      >
        {show ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  adminId:    number;
  adminName:  string;
  adminEmail: string;
}

export function SettingsClient({ adminId, adminName, adminEmail }: Props) {
  const [current,  setCurrent]  = useState("");
  const [newPass,  setNewPass]  = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);
  const [isPending, start]      = useTransition();

  const handleSubmit = () => {
    setError(null);
    setSuccess(false);
    if (newPass !== confirm) { setError("New passwords do not match."); return; }
    if (newPass.length < 6)  { setError("Password must be at least 6 characters."); return; }

    start(async () => {
      const result = await changeAdminPassword(adminId, current, newPass);
      if (result.success) {
        setSuccess(true);
        setCurrent("");
        setNewPass("");
        setConfirm("");
      } else {
        setError(result.error ?? "Failed to change password.");
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Header */}
      <div>
        <h1 style={{
          fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px",
          color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px",
        }}>Settings</h1>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>Manage your account and security preferences</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>

        {/* Profile card (read-only) */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 20px",
            background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
            borderBottom: "1.5px solid #e2e8f0",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <div style={{ width: 4, height: 16, borderRadius: "2px", background: "linear-gradient(180deg,#7c3aed,#8b5cf6)" }} />
            <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Your Profile
            </p>
          </div>

          <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Avatar */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#7c3aed,#8b5cf6)",
                boxShadow: "0 4px 16px rgba(124,58,237,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "22px", color: "white" }}>
                  {adminName[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "16px", color: "#0f172a" }}>{adminName}</p>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: "5px",
                  fontSize: "10px", fontWeight: 700, color: "#7c3aed",
                  background: "#f5f3ff", border: "1px solid #ddd6fe",
                  padding: "2px 8px", borderRadius: "999px", marginTop: "3px",
                }}>
                  <ShieldCheck size={9} /> Admin
                </span>
              </div>
            </div>

            {/* Info rows */}
            {[
              { icon: User, label: "Name",  value: adminName  },
              { icon: Mail, label: "Email", value: adminEmail },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label}>
                <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "5px" }}>
                  <Icon size={12} style={{ color: "#94a3b8" }} />
                  <span style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
                </div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#1e293b", paddingLeft: "2px" }}>{value}</p>
              </div>
            ))}

            <div style={{ padding: "10px 14px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: "8px" }}>
              <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: 1.5 }}>
                To change your name or email, contact another admin or update the record directly in the database.
              </p>
            </div>
          </div>
        </div>

        {/* Change password card */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 20px",
            background: "linear-gradient(135deg,#f8fafc,#f1f5f9)",
            borderBottom: "1.5px solid #e2e8f0",
            display: "flex", alignItems: "center", gap: "8px",
          }}>
            <div style={{ width: 4, height: 16, borderRadius: "2px", background: "linear-gradient(180deg,#d97706,#f59e0b)" }} />
            <p style={{ fontSize: "10px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Change Password
            </p>
          </div>

          <div style={{ padding: "22px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Current Password</label>
              <PasswordInput value={current} onChange={setCurrent} placeholder="Enter current password" />
            </div>
            <div>
              <label style={labelStyle}>New Password</label>
              <PasswordInput value={newPass} onChange={setNewPass} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <PasswordInput value={confirm} onChange={setConfirm} placeholder="Repeat new password" />
            </div>

            {error && (
              <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
              </div>
            )}
            {success && (
              <div style={{ background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "7px", padding: "10px 14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <CheckCircle2 size={14} style={{ color: "#16a34a", flexShrink: 0 }} />
                <p style={{ fontSize: "12px", fontWeight: 600, color: "#14532d" }}>Password changed successfully.</p>
              </div>
            )}

            <button onClick={handleSubmit} disabled={isPending} style={{
              height: 46, borderRadius: "9px", border: "none",
              background: isPending ? "#94a3b8" : "linear-gradient(135deg,#d97706,#f59e0b 55%,#b45309)",
              boxShadow: isPending ? "none" : "0 4px 14px rgba(217,119,6,0.3)",
              color: "white", fontSize: "14px", fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
              marginTop: "4px",
            }}>
              {isPending
                ? <><Loader2 size={14} className="animate-spin" /> Updating…</>
                : <><KeyRound size={14} /> Update Password</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}