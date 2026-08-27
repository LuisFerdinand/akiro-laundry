// app/admin/marketing/page.tsx
import { getCampaigns, getPeriodMetrics, getCampaignComparison } from "@/lib/actions/marketing";
import { MarketingClient } from "@/components/admin/MarketingClient";

function toISO(d: Date) {
  return new Date(d).toISOString().slice(0, 10);
}

export default async function AdminMarketingPage() {
  const [campaigns, comparison] = await Promise.all([getCampaigns(), getCampaignComparison()]);

  let from: string;
  let to: string;
  let activeCampaignId: number | null = null;

  if (campaigns.length > 0) {
    from = toISO(campaigns[0].startDate);
    to = toISO(campaigns[0].endDate);
    activeCampaignId = campaigns[0].id;
  } else {
    const now = new Date();
    to = toISO(now);
    from = toISO(new Date(now.getTime() - 29 * 864e5));
  }

  const initialMetrics = await getPeriodMetrics(from, to);

  return (
    <MarketingClient
      campaigns={campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        channel: c.channel,
        spend: Number(c.spend),
        startDate: toISO(c.startDate),
        endDate: toISO(c.endDate),
        notes: c.notes,
      }))}
      comparison={comparison}
      initialMetrics={initialMetrics}
      initialWindow={{ from, to }}
      initialCampaignId={activeCampaignId}
    />
  );
}
