// components/shared/EditedBadge.tsx
import { Pencil } from "lucide-react";
import { formatDateTimeBiz } from "@/lib/utils/business-time";

interface Props {
  editCount: number;
  /** orders.editedAfterPaymentAt — set when the order was changed after a payment was on file. */
  editedAfterPaymentAt?: Date | string | null;
  /** Use the smaller table-row sizing instead of the default detail-page sizing. */
  compact?: boolean;
}

/**
 * Small pill shown on orders that have been corrected after creation. Renders
 * nothing when editCount is 0. Orders changed after they were paid get an amber
 * "after payment" variant so they stand out when reconciling cash.
 */
export function EditedBadge({ editCount, editedAfterPaymentAt, compact = false }: Props) {
  if (!editCount) return null;

  const afterPayment = !!editedAfterPaymentAt;
  const times = `${editCount} time${editCount > 1 ? "s" : ""}`;
  const title = afterPayment
    ? `Edited ${times} — last changed after payment on ${formatDateTimeBiz(editedAfterPaymentAt)}. The cash register was not changed.`
    : `Edited ${times} since it was created`;

  return (
    <span
      title={title}
      style={{
        display: "inline-flex", alignItems: "center", gap: compact ? 3 : 4,
        fontSize: compact ? "9px" : "10px", fontWeight: 700,
        color:      afterPayment ? "#b45309" : "#7c3aed",
        background: afterPayment ? "#fffbeb" : "#f5f3ff",
        border:     `1px solid ${afterPayment ? "#fcd34d" : "#c4b5fd"}`,
        padding: compact ? "2px 6px" : "3px 8px", borderRadius: "999px",
        whiteSpace: "nowrap",
      }}
    >
      <Pencil size={compact ? 8 : 9} />
      Edited ×{editCount}{afterPayment && " · after payment"}
    </span>
  );
}
