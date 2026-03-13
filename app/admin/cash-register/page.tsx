// app/admin/cash-register/page.tsx  (full replacement / reference)
//
// Adds `initialCategories` prop fetch so CashRegisterAdmin can render categories SSR.

import { getCashRegisterState } from "@/lib/actions/payments";
import { getExpenseCategories } from "@/lib/actions/payments";
import { getRevenueStats }      from "@/lib/actions/admin-orders"; // your existing import
import { CashRegisterAdmin }    from "@/components/admin/CashRegisterAdmin";

export default async function CashRegisterPage() {
  const [state, revenue, categories] = await Promise.all([
    getCashRegisterState(),
    getRevenueStats(),
    getExpenseCategories(),    // all categories (hard delete means no inactive rows)
  ]);

  return (
    <div style={{ padding: "32px 40px" }}>
      <CashRegisterAdmin
        initialState={state}
        revenue={revenue}
        initialCategories={categories}
      />
    </div>
  );
}