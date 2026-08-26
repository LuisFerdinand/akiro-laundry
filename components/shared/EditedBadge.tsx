// components/shared/EditedBadge.tsx
import { Pencil } from "lucide-react";

interface Props {
  editCount: number;
  /** Use the smaller table-row sizing instead of the default detail-page sizing. */
  compact?: boolean;
}

/** Small pill shown on orders that have been corrected after creation. Renders nothing when editCount is 0. */
export function EditedBadge({ editCount, compact = false }: Props) {
  if (!editCount) return null;

  return (
    <span
      title={`Edited ${editCount} time${editCount > 1 ? "s" : ""} since it was created`}
      style={{
        display: "inline-flex", alignItems: "center", gap: compact ? 3 : 4,
        fontSize: compact ? "9px" : "10px", fontWeight: 700,
        color: "#7c3aed", background: "#f5f3ff", border: "1px solid #c4b5fd",
        padding: compact ? "2px 6px" : "3px 8px", borderRadius: "999px",
        whiteSpace: "nowrap",
      }}
    >
      <Pencil size={compact ? 8 : 9} />
      Edited ×{editCount}
    </span>
  );
}
