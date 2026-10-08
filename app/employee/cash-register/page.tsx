// app/employee/cash-register/page.tsx
// Server component that renders the cash register dashboard
import { getCashDrawerToday, getCashRegisterState } from "@/lib/actions/payments";
import { CashRegisterClient } from "@/components/employee/CashRegisterClient";

export default async function CashRegisterPage() {
  const [state, today] = await Promise.all([
    getCashRegisterState(60),
    getCashDrawerToday(),
  ]);
  return <CashRegisterClient state={state} today={today} now={new Date().toISOString()} />;
}
