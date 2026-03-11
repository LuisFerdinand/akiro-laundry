// app/admin/cash-register/page.tsx
import { getCashRegisterState } from "@/lib/actions/payments";
import { getRevenueStats }      from "@/lib/actions/admin-orders";
import { CashRegisterAdmin }    from "@/components/admin/CashRegisterAdmin";

export default async function AdminCashRegisterPage() {
  const [state, revenue] = await Promise.all([
    getCashRegisterState(),
    getRevenueStats(),
  ]);
  return <CashRegisterAdmin initialState={state} revenue={revenue} />;
}