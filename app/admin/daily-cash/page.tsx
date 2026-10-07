// app/admin/daily-cash/page.tsx
import { getCashBook } from "@/lib/actions/finance";
import { resolveCashBookPeriod, type CashBookSearchParams } from "@/lib/utils/cash-book-period";
import { DailyCashClient } from "@/components/admin/DailyCashClient";

export default async function DailyCashPage({
  searchParams,
}: {
  searchParams: Promise<CashBookSearchParams>;
}) {
  // Defaults to today; ?view=weekly|monthly&date=… or ?view=custom&from=…&to=…
  const period = resolveCashBookPeriod(await searchParams);
  const book   = await getCashBook(period.from, period.to);

  return (
    <div style={{ padding: "32px 40px" }}>
      <DailyCashClient period={period} book={book} />
    </div>
  );
}
