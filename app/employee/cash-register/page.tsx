// app/employee/cash-register/page.tsx  (or employee if you prefer)
// Server component that renders the cash register dashboard

import { getCashRegisterState } from "@/lib/actions/payments";
import { CashRegisterClient } from "@/components/employee/CashRegisterClient";

export default async function CashRegisterPage() {
  const state = await getCashRegisterState();
  return <CashRegisterClient initialState={state} />;
}