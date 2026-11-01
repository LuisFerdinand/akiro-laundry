// app/admin/buku-besar/page.tsx
import { getFinanceCategoryOptions, getFinancePieData, getGeneralLedger } from "@/lib/actions/finance";
import { resolveFinanceRange } from "@/lib/utils/finance-period";
import { BukuBesarClient } from "@/components/admin/BukuBesarClient";

export default async function BukuBesarPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  // ?period=this_month (preset) or ?from=…&to=… (custom range)
  const range = resolveFinanceRange(await searchParams);

  const [ledger, pies, options] = await Promise.all([
    getGeneralLedger(range.from, range.to),
    getFinancePieData(range.from, range.to),
    getFinanceCategoryOptions(),
  ]);

  return (
    <div style={{ padding: "32px 40px" }}>
      <BukuBesarClient ledger={ledger} pies={pies} options={options} range={range} />
    </div>
  );
}
