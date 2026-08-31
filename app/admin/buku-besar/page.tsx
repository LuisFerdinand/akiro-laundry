// app/admin/buku-besar/page.tsx
import { getFinanceRecap, getFinancePieData, getFinanceCategoryOptions } from "@/lib/actions/finance";
import { financePeriodRange, type FinancePeriod } from "@/lib/utils/business-time";
import { BukuBesarClient } from "@/components/admin/BukuBesarClient";

export default async function BukuBesarPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const sp     = await searchParams;
  const period = (sp.period ?? "this_month") as FinancePeriod;
  const range  = financePeriodRange(period);

  const [recap, pies, options] = await Promise.all([
    getFinanceRecap(range.from, range.to),
    getFinancePieData(range.from, range.to),
    getFinanceCategoryOptions(),
  ]);

  return (
    <div style={{ padding: "32px 40px" }}>
      <BukuBesarClient recap={recap} pies={pies} options={options} period={period} range={range} />
    </div>
  );
}
