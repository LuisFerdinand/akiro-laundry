// app/admin/buku-kecil/page.tsx
import { getCashRegisterState, getExpenseCategories } from "@/lib/actions/payments";
import { getLedger } from "@/lib/actions/finance";
import { financePeriodRange, type FinancePeriod } from "@/lib/utils/business-time";
import { BukuKecilClient } from "@/components/admin/BukuKecilClient";

export default async function BukuKecilPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp     = await searchParams;
  const period = (sp.period ?? "this_month") as FinancePeriod;
  const range  = financePeriodRange(period);

  const [state, categories, ledger] = await Promise.all([
    getCashRegisterState(),
    getExpenseCategories(),
    getLedger(range.from, range.to),
  ]);

  return (
    <div style={{ padding: "32px 40px" }}>
      <BukuKecilClient
        balance={state.balance}
        lastUpdatedAt={state.lastUpdatedAt}
        categories={categories}
        ledger={ledger}
        period={period}
        range={range}
      />
    </div>
  );
}
