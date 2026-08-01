// components/admin/ReviewsClient.tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Star, CheckCircle2, EyeOff, Trash2, Loader2, AlertTriangle, MessageSquareText,
} from "lucide-react";
import { approveReview, unapproveReview, deleteReview } from "@/lib/actions/admin-reviews";
import type { ReviewItem } from "@/lib/actions/admin-reviews";

// ─── Star rating ──────────────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={13} fill={i < count ? "#ffcc00" : "none"} stroke={i < count ? "#ffcc00" : "#cbd5e1"} strokeWidth={1.5} />
      ))}
    </div>
  );
}

// ─── Confirm delete modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({
  review, onConfirm, onClose, isPending,
}: {
  review: ReviewItem; onConfirm: () => void; onClose: () => void; isPending: boolean;
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !isPending) onClose(); }}
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
            Delete this review?
          </p>
          <p style={{ fontSize: "13px", color: "#64748b", lineHeight: 1.5 }}>
            Permanently deletes the review from <strong>{review.authorName}</strong>. This cannot be undone.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", width: "100%" }}>
          <button onClick={onClose} disabled={isPending} style={{
            flex: 1, padding: "10px", borderRadius: "8px",
            border: "1.5px solid #e2e8f0", background: "white",
            fontSize: "13px", fontWeight: 700, color: "#64748b", cursor: isPending ? "not-allowed" : "pointer",
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

// ─── Review card ──────────────────────────────────────────────────────────────

function ReviewCard({ review, onChanged }: { review: ReviewItem; onChanged: () => void }) {
  const [isPending, start] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = () => {
    setError(null);
    start(async () => {
      const result = await approveReview(review.id);
      if (result.success) onChanged();
      else setError(result.error ?? "Failed to approve.");
    });
  };

  const handleUnapprove = () => {
    setError(null);
    start(async () => {
      const result = await unapproveReview(review.id);
      if (result.success) onChanged();
      else setError(result.error ?? "Failed to unpublish.");
    });
  };

  const handleDelete = () => {
    setError(null);
    start(async () => {
      const result = await deleteReview(review.id);
      if (result.success) {
        setShowConfirm(false);
        onChanged();
      } else {
        setError(result.error ?? "Failed to delete.");
      }
    });
  };

  return (
    <div style={{
      background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0",
      boxShadow: "0 1px 6px rgba(0,0,0,0.04)", padding: "16px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: review.accentColor,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontWeight: 800, fontSize: 12 }}>{review.initials}</span>
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>{review.authorName}</p>
            <p style={{ fontSize: "11px", color: "#94a3b8" }}>{review.authorRole}</p>
            <div style={{ marginTop: 5 }}><StarRow count={review.rating} /></div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            fontSize: "10px", fontWeight: 700,
            color: review.isActive ? "#16a34a" : "#d97706",
            background: review.isActive ? "#f0fdf4" : "#fffbeb",
            border: `1px solid ${review.isActive ? "#86efac" : "#fcd34d"}`,
            padding: "3px 9px", borderRadius: "999px", whiteSpace: "nowrap",
          }}>
            {review.isActive ? "Published" : "Pending"}
          </span>
          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
            {new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </span>
        </div>
      </div>

      <p style={{ marginTop: 12, fontSize: "13px", color: "#475569", lineHeight: 1.6 }}>
        {review.body}
      </p>

      {error && (
        <div style={{ marginTop: 10, background: "#fff1f2", border: "1.5px solid #fda4af", borderRadius: "7px", padding: "8px 12px" }}>
          <p style={{ fontSize: "12px", fontWeight: 600, color: "#be123c" }}>{error}</p>
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {review.isActive ? (
          <button onClick={handleUnapprove} disabled={isPending} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: "11px", fontWeight: 700, color: "#d97706",
            background: "#fffbeb", padding: "6px 12px", borderRadius: "6px",
            border: "1px solid #fcd34d", cursor: isPending ? "not-allowed" : "pointer",
          }}>
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <EyeOff size={11} />}
            Unpublish
          </button>
        ) : (
          <button onClick={handleApprove} disabled={isPending} style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: "11px", fontWeight: 700, color: "#16a34a",
            background: "#f0fdf4", padding: "6px 12px", borderRadius: "6px",
            border: "1px solid #86efac", cursor: isPending ? "not-allowed" : "pointer",
          }}>
            {isPending ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
            Approve
          </button>
        )}
        <button onClick={() => setShowConfirm(true)} disabled={isPending} style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontSize: "11px", fontWeight: 700, color: "#be123c",
          background: "#fff1f2", padding: "6px 12px", borderRadius: "6px",
          border: "1px solid #fda4af", cursor: isPending ? "not-allowed" : "pointer",
        }}>
          <Trash2 size={11} /> Delete
        </button>
      </div>

      {showConfirm && (
        <ConfirmDeleteModal review={review} isPending={isPending} onConfirm={handleDelete} onClose={() => setShowConfirm(false)} />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Filter = "all" | "pending" | "published";

export function ReviewsClient({ reviews }: { reviews: ReviewItem[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  const pendingCount   = reviews.filter((r) => !r.isActive).length;
  const publishedCount = reviews.filter((r) => r.isActive).length;

  const filtered = reviews.filter((r) => {
    if (filter === "pending")   return !r.isActive;
    if (filter === "published") return r.isActive;
    return true;
  });

  const handleChanged = () => router.refresh();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: "Sora,sans-serif", fontWeight: 800, fontSize: "26px", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: "4px" }}>
          Reviews
        </h1>
        <p style={{ fontSize: "13px", color: "#94a3b8" }}>
          {reviews.length} submission{reviews.length !== 1 ? "s" : ""} from the public review form
          {pendingCount > 0 && <> · <strong style={{ color: "#d97706" }}>{pendingCount} pending approval</strong></>}
        </p>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: "6px" }}>
        {([
          ["all",       `All (${reviews.length})`],
          ["pending",   `Pending (${pendingCount})`],
          ["published", `Published (${publishedCount})`],
        ] as const).map(([value, label]) => {
          const active = filter === value;
          return (
            <button
              key={value}
              onClick={() => setFilter(value as Filter)}
              style={{
                padding: "6px 14px", borderRadius: "999px", border: "1.5px solid",
                borderColor: active ? "#1a7fba" : "#e2e8f0",
                background:  active ? "#edf7fd" : "white",
                color:       active ? "#1a7fba" : "#64748b",
                fontSize: "11px", fontWeight: 700, cursor: "pointer", transition: "all 0.12s",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{
          background: "white", borderRadius: "12px", border: "1.5px solid #e2e8f0",
          padding: "48px 20px", textAlign: "center",
        }}>
          <MessageSquareText size={28} style={{ color: "#cbd5e1", margin: "0 auto 10px", display: "block" }} />
          <p style={{ fontSize: "14px", fontWeight: 600, color: "#94a3b8" }}>
            {filter === "all" ? "No reviews submitted yet" : `No ${filter} reviews`}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map((review) => (
            <ReviewCard key={review.id} review={review} onChanged={handleChanged} />
          ))}
        </div>
      )}
    </div>
  );
}
