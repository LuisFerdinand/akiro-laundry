// app/admin/buku-kecil/page.tsx
import { getCashRegisterState, getExpenseCategories } from "@/lib/actions/payments";
import { getLedger } from "@/lib/actions/finance";
import { getReceivablesLedger } from "@/lib/actions/receivables";
import { resolveFinanceRange } from "@/lib/utils/finance-period";
import { BukuKecilClient, type BukuKecilTab } from "@/components/admin/BukuKecilClient";

export default async function BukuKecilPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string }>;
}) {
  const sp    = await searchParams;
  const tab: BukuKecilTab = sp.tab === "kas" ? "kas" : "piutang";
  // ?period=… (preset) or ?from=…&to=… (custom). Receivables are balances, so they
  // are read "as of" the end of the range; the cash tab lists the whole range.
  const range = resolveFinanceRange(sp);

  if (tab === "piutang") {
    const receivables = await getReceivablesLedger(range.to);
    return (
      <div style={{ padding: "32px 40px" }}>
        <BukuKecilClient tab={tab} range={range} receivables={receivables} cash={null} />
      </div>
    );
  }

  const [state, categories, ledger] = await Promise.all([
    getCashRegisterState(),
    getExpenseCategories(),
    getLedger(range.from, range.to),
  ]);

  return (
    <div style={{ padding: "32px 40px" }}>
      <BukuKecilClient
        tab={tab}
        range={range}
        receivables={null}
        cash={{ balance: state.balance, lastUpdatedAt: state.lastUpdatedAt, categories, ledger }}
      />
    </div>
  );
}
