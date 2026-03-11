// components/admin/UsersClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Save, Loader2, Trash2, Edit2, CheckCircle2,
  Users, Shield, ShieldCheck, ShieldOff, KeyRound,
  AlertTriangle, ChevronDown, UserCog,
} from "lucide-react";
import {
  updateUser, updateUserRole, changeUserPassword, deleteUser,
} from "@/lib/actions/admin-users";
import type { UserItem } from "@/lib/actions/admin-users";

// ─── Shared styles ────────────────────────────────────────────────────────────

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

const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
  (e.currentTarget.style.borderColor = "#b6def5");
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
  (e.currentTarget.style.borderColor = "#e2e8f0");

// ─── Role config ──────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  admin:    { label: "Admin",    color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", Icon: ShieldCheck },
  employee: { label: "Employee", color: "#1a7fba", bg: "#edf7fd", border: "#b6def5", Icon: Shield      },
  user:     { label: "User",     color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", Icon: ShieldOff   },
};

// ─── Confirm Delete ───────────────────────────────────────────────────────────

function ConfirmDeleteModal({
  user, onConfirm, onClose, isPending,
}: {
  user: UserItem; onConfirm: () => void; onClose: () => void; isPending: boolean;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
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
            Delete "{user.name}"?
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
            This will permanently delete the account for <strong>{user.email}</strong>. This action cannot be undone.
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

// ─── Edit User Modal ──────────────────────────────────────────────────────────

function EditUserModal({
  user, currentAdminId, onClose, onSuccess,
}: {
  user: UserItem; currentAdminId: number; onClose: () => void; onSuccess: (msg: string) => void;
}) {
  const [name,  setName]  = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const handleSave = () => {
    setError(null);
    start(async () => {
      const result = await updateUser(user.id, { name, email }, currentAdminId);
      if (result.success) onSuccess("User updated successfully.");
      else setError(result.error ?? "Failed.");
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0",
        boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
        width: "100%", maxWidth: "420px", overflow: "hidden",
      }}>
        <div style={{
          background: "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
          padding: "18px 22px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Edit User</p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "2px" }}>Edit Profile</p>
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
            <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div>
            <label style={labelStyle}>Email Address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
          {error && (
            <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
            </div>
          )}
          <button onClick={handleSave} disabled={isPending} style={{
            height: 46, borderRadius: "9px", border: "none",
            background: isPending ? "#94a3b8" : "linear-gradient(135deg,#1a7fba,#2496d6 55%,#0f5a85)",
            boxShadow: isPending ? "none" : "0 4px 14px rgba(26,127,186,0.3)",
            color: "white", fontSize: "14px", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
          }}>
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Change Password Modal ────────────────────────────────────────────────────

function ChangePasswordModal({
  user, currentAdminId, onClose, onSuccess,
}: {
  user: UserItem; currentAdminId: number; onClose: () => void; onSuccess: (msg: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [isPending, start]      = useTransition();

  const handleSave = () => {
    setError(null);
    if (password !== confirm) { setError("Passwords do not match."); return; }
    start(async () => {
      const result = await changeUserPassword(user.id, password, currentAdminId);
      if (result.success) onSuccess("Password changed successfully.");
      else setError(result.error ?? "Failed.");
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0",
        boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
        width: "100%", maxWidth: "420px", overflow: "hidden",
      }}>
        <div style={{
          background: "linear-gradient(135deg,#d97706,#f59e0b 55%,#b45309)",
          padding: "18px 22px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Security</p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "2px" }}>Change Password</p>
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
          <div style={{ padding: "10px 14px", background: "#fffbeb", border: "1.5px solid #fcd34d", borderRadius: "8px" }}>
            <p style={{ fontSize: "12px", color: "#92400e", fontWeight: 600 }}>
              Setting a new password for <strong>{user.name}</strong> ({user.email})
            </p>
          </div>
          <div>
            <label style={labelStyle}>New Password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Min. 6 characters" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div>
            <label style={labelStyle}>Confirm Password</label>
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} type="password" placeholder="Repeat password" style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
          {error && (
            <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
            </div>
          )}
          <button onClick={handleSave} disabled={isPending} style={{
            height: 46, borderRadius: "9px", border: "none",
            background: isPending ? "#94a3b8" : "linear-gradient(135deg,#d97706,#f59e0b 55%,#b45309)",
            boxShadow: isPending ? "none" : "0 4px 14px rgba(217,119,6,0.3)",
            color: "white", fontSize: "14px", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
          }}>
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><KeyRound size={14} /> Set New Password</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Role Modal ───────────────────────────────────────────────────────────────

function RoleModal({
  user, currentAdminId, onClose, onSuccess,
}: {
  user: UserItem; currentAdminId: number; onClose: () => void; onSuccess: (msg: string) => void;
}) {
  const [role,  setRole]  = useState<"admin" | "employee" | "user">(user.role);
  const [error, setError] = useState<string | null>(null);
  const [isPending, start] = useTransition();

  const handleSave = () => {
    setError(null);
    start(async () => {
      const result = await updateUserRole(user.id, role, currentAdminId);
      if (result.success) onSuccess(`Role updated to ${role}.`);
      else setError(result.error ?? "Failed.");
    });
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: "rgba(15,23,42,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "white", borderRadius: "14px", border: "1.5px solid #e2e8f0",
        boxShadow: "0 24px 60px rgba(0,0,0,0.15)",
        width: "100%", maxWidth: "420px", overflow: "hidden",
      }}>
        <div style={{
          background: "linear-gradient(135deg,#7c3aed,#8b5cf6 55%,#6d28d9)",
          padding: "18px 22px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <p style={{ fontSize: "10px", fontWeight: 800, color: "rgba(255,255,255,0.65)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Permissions</p>
            <p style={{ fontSize: "16px", fontWeight: 800, color: "white", marginTop: "2px" }}>Change Role</p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.15)", border: "1.5px solid rgba(255,255,255,0.25)",
            borderRadius: "7px", width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
          }}>
            <X size={14} style={{ color: "white" }} />
          </button>
        </div>
        <div style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <p style={{ fontSize: "13px", color: "#64748b" }}>
            Changing role for <strong style={{ color: "#1e293b" }}>{user.name}</strong>
          </p>

          {(["admin", "employee", "user"] as const).map((r) => {
            const cfg = ROLE_CONFIG[r];
            const Icon = cfg.Icon;
            const selected = role === r;
            return (
              <button key={r} onClick={() => setRole(r)} style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "14px 16px", borderRadius: "10px", cursor: "pointer",
                border: `1.5px solid ${selected ? cfg.color : "#e2e8f0"}`,
                background: selected ? cfg.bg : "white",
                textAlign: "left", width: "100%",
                transition: "all 0.12s",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "8px", flexShrink: 0,
                  background: selected ? `${cfg.color}22` : "#f8fafc",
                  border: `1.5px solid ${selected ? cfg.border : "#e2e8f0"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={16} style={{ color: selected ? cfg.color : "#94a3b8" }} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: selected ? cfg.color : "#1e293b" }}>{cfg.label}</p>
                  <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "1px" }}>
                    {r === "admin"    && "Full access to all admin features"}
                    {r === "employee" && "Can manage orders and customers"}
                    {r === "user"     && "Standard customer account"}
                  </p>
                </div>
                {selected && (
                  <div style={{ marginLeft: "auto", width: 18, height: 18, borderRadius: "50%", background: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CheckCircle2 size={12} style={{ color: "white" }} />
                  </div>
                )}
              </button>
            );
          })}

          {error && (
            <div style={{ background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "10px 14px" }}>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
            </div>
          )}

          <button onClick={handleSave} disabled={isPending} style={{
            height: 46, borderRadius: "9px", border: "none",
            background: isPending ? "#94a3b8" : "linear-gradient(135deg,#7c3aed,#8b5cf6 55%,#6d28d9)",
            boxShadow: isPending ? "none" : "0 4px 14px rgba(124,58,237,0.3)",
            color: "white", fontSize: "14px", fontWeight: 800,
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.6 : 1,
          }}>
            {isPending ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><ShieldCheck size={14} /> Update Role</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type ModalKind = "edit" | "password" | "role" | "delete";

interface Props {
  users:          UserItem[];
  currentAdminId: number;
}

export function UsersClient({ users, currentAdminId }: Props) {
  const router = useRouter();

  const [activeModal, setActiveModal] = useState<{ kind: ModalKind; user: UserItem } | null>(null);
  const [toast,       setToast]       = useState<string | null>(null);
  const [isPending,   start]          = useTransition();

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const handleSuccess = (msg: string) => {
    setActiveModal(null);
    showToast(msg);
    router.refresh();
  };

  const handleDeleteConfirm = () => {
    if (!activeModal) return;
    start(async () => {
      const result = await deleteUser(activeModal.user.id, currentAdminId);
      setActiveModal(null);
      if (result.success) {
        showToast("User deleted.");
        router.refresh();
      } else {
        showToast(`Error: ${result.error}`);
      }
    });
  };

  const admins    = users.filter((u) => u.role === "admin");
  const employees = users.filter((u) => u.role === "employee");
  const regular   = users.filter((u) => u.role === "user");

  return (
    <>
      {/* Modals */}
      {activeModal?.kind === "edit" && (
        <EditUserModal user={activeModal.user} currentAdminId={currentAdminId} onClose={() => setActiveModal(null)} onSuccess={handleSuccess} />
      )}
      {activeModal?.kind === "password" && (
        <ChangePasswordModal user={activeModal.user} currentAdminId={currentAdminId} onClose={() => setActiveModal(null)} onSuccess={handleSuccess} />
      )}
      {activeModal?.kind === "role" && (
        <RoleModal user={activeModal.user} currentAdminId={currentAdminId} onClose={() => setActiveModal(null)} onSuccess={handleSuccess} />
      )}
      {activeModal?.kind === "delete" && (
        <ConfirmDeleteModal user={activeModal.user} onConfirm={handleDeleteConfirm} onClose={() => setActiveModal(null)} isPending={isPending} />
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

        {/* Header */}
        <div>
          <h1 style={{
            fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px",
            color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px",
          }}>Users & Roles</h1>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            {users.length} account{users.length !== 1 ? "s" : ""} · {admins.length} admin{admins.length !== 1 ? "s" : ""}, {employees.length} employee{employees.length !== 1 ? "s" : ""}, {regular.length} user{regular.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px" }}>
          {[
            { label: "Admins",    count: admins.length,    color: "#7c3aed", bg: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: "#ddd6fe", Icon: ShieldCheck },
            { label: "Employees", count: employees.length, color: "#1a7fba", bg: "linear-gradient(135deg,#edf7fd,#c8e9f8)", border: "#b6def5", Icon: Shield      },
            { label: "Users",     count: regular.length,   color: "#64748b", bg: "linear-gradient(135deg,#f8fafc,#f1f5f9)", border: "#e2e8f0", Icon: Users       },
          ].map(({ label, count, color, bg, border, Icon }) => (
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
                <p style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "22px", color: "#0f172a", marginTop: "1px" }}>{count}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{
          background: "white", borderRadius: "12px",
          border: "1.5px solid #e2e8f0",
          boxShadow: "0 1px 6px rgba(0,0,0,0.04)", overflow: "hidden",
        }}>
          {users.length === 0 ? (
            <div style={{ padding: "60px", textAlign: "center" }}>
              <Users size={28} style={{ color: "#cbd5e1", margin: "0 auto 10px", display: "block" }} />
              <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>No users found</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    {["User", "Email", "Role", "Joined", "Actions"].map((h) => (
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
                  {users.map((u, i) => {
                    const rc  = ROLE_CONFIG[u.role];
                    const Icon = rc.Icon;
                    const isMe = u.id === currentAdminId;
                    const isOtherAdmin = u.role === "admin" && !isMe;

                    return (
                      <tr key={u.id}
                        style={{ background: i % 2 === 0 ? "white" : "#fafafa", transition: "background 0.1s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                      >
                        {/* User */}
                        <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                              background: isMe
                                ? "linear-gradient(135deg,#7c3aed,#8b5cf6)"
                                : "linear-gradient(135deg,#1a7fba,#2496d6)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <span style={{ fontSize: "12px", fontWeight: 800, color: "white" }}>
                                {u.name[0]?.toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{u.name}</p>
                                {isMe && (
                                  <span style={{ fontSize: "9px", fontWeight: 800, color: "#7c3aed", background: "#f5f3ff", border: "1px solid #ddd6fe", padding: "1px 6px", borderRadius: "999px" }}>
                                    You
                                  </span>
                                )}
                              </div>
                              <p style={{ fontSize: "10px", color: "#94a3b8" }}>ID #{u.id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                          <span style={{ fontSize: "12px", color: "#475569" }}>{u.email}</span>
                        </td>

                        {/* Role */}
                        <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: "5px",
                            fontSize: "10px", fontWeight: 700,
                            color: rc.color, background: rc.bg,
                            border: `1px solid ${rc.border}`,
                            padding: "3px 9px", borderRadius: "999px",
                          }}>
                            <Icon size={9} />
                            {rc.label}
                          </span>
                        </td>

                        {/* Joined */}
                        <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                          <span style={{ fontSize: "11px", color: "#94a3b8" }}>
                            {new Date(u.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "13px 16px", borderBottom: "1px solid #f1f5f9" }}>
                          {isOtherAdmin ? (
                            <span style={{ fontSize: "11px", color: "#cbd5e1", fontStyle: "italic" }}>Protected</span>
                          ) : (
                            <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                              {/* Edit */}
                              {!isOtherAdmin && (
                                <button onClick={() => setActiveModal({ kind: "edit", user: u })} style={{
                                  display: "inline-flex", alignItems: "center", gap: "4px",
                                  fontSize: "11px", fontWeight: 700, color: "#1a7fba",
                                  background: "#edf7fd", padding: "4px 9px",
                                  borderRadius: "6px", border: "1px solid #b6def5", cursor: "pointer",
                                }}>
                                  <Edit2 size={10} /> Edit
                                </button>
                              )}
                              {/* Role — only for non-admins and not self */}
                              {!isMe && !isOtherAdmin && (
                                <button onClick={() => setActiveModal({ kind: "role", user: u })} style={{
                                  display: "inline-flex", alignItems: "center", gap: "4px",
                                  fontSize: "11px", fontWeight: 700, color: "#7c3aed",
                                  background: "#f5f3ff", padding: "4px 9px",
                                  borderRadius: "6px", border: "1px solid #ddd6fe", cursor: "pointer",
                                }}>
                                  <UserCog size={10} /> Role
                                </button>
                              )}
                              {/* Password — only for non-admins */}
                              {!isMe && !isOtherAdmin && (
                                <button onClick={() => setActiveModal({ kind: "password", user: u })} style={{
                                  display: "inline-flex", alignItems: "center", gap: "4px",
                                  fontSize: "11px", fontWeight: 700, color: "#d97706",
                                  background: "#fffbeb", padding: "4px 9px",
                                  borderRadius: "6px", border: "1px solid #fcd34d", cursor: "pointer",
                                }}>
                                  <KeyRound size={10} /> Password
                                </button>
                              )}
                              {/* Delete — only for non-admins */}
                              {!isMe && !isOtherAdmin && (
                                <button onClick={() => setActiveModal({ kind: "delete", user: u })} style={{
                                  display: "inline-flex", alignItems: "center", gap: "4px",
                                  fontSize: "11px", fontWeight: 700, color: "#be123c",
                                  background: "#fff1f2", padding: "4px 9px",
                                  borderRadius: "6px", border: "1px solid #fda4af", cursor: "pointer",
                                }}>
                                  <Trash2 size={10} /> Delete
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}