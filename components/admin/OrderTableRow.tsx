// components/admin/OrderTableRow.tsx
"use client";

import Link from "next/link";
import { formatUSD, ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/utils/order-form";
import type { OrderWithCustomer } from "@/lib/actions/orders";

interface OrderTableRowProps {
  order: OrderWithCustomer;
  index: number;
}

export function OrderTableRow({ order, index }: OrderTableRowProps) {
  const baseBg = index % 2 === 0 ? "white" : "#fafafa";

  return (
    <tr
      style={{ background: baseBg, transition: "background 0.1s", cursor: "pointer" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f9ff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = baseBg; }}
    >
      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
        <Link href={`/admin/orders/${order.id}`} style={{ textDecoration: "none" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#1a7fba", fontFamily: "monospace" }}>
            {order.orderNumber}
          </span>
        </Link>
      </td>

      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: 26, height: 26, borderRadius: "50%",
            background: "linear-gradient(135deg,#1a7fba,#2496d6)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "white" }}>
              {order.customerName[0]?.toUpperCase()}
            </span>
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>{order.customerName}</p>
            <p style={{ fontSize: "10px", color: "#94a3b8" }}>{order.customerPhone}</p>
          </div>
        </div>
      </td>

      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
        <span style={{ fontSize: "12px", color: "#64748b" }}>{order.serviceName}</span>
      </td>

      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#1e293b" }}>
          {formatUSD(parseFloat(order.totalPrice))}
        </span>
      </td>

      <td style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9" }}>
        <span
          className={ORDER_STATUS_COLORS[order.status]}
          style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "999px" }}
        >
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </td>
    </tr>
  );
}