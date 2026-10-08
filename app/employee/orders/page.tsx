// app/employee/orders/page.tsx
import { getOrderList } from "@/lib/actions/orders";
import { getWaTemplateData } from "@/lib/actions/wa-templates";
import { parseOrderListQuery } from "@/lib/utils/order-query";
import { EmployeeOrdersClient } from "@/components/employee/EmployeeOrdersClient";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseOrderListQuery(await searchParams);

  const [result, templateData] = await Promise.all([
    getOrderList(query),
    getWaTemplateData(),
  ]);

  return (
    <EmployeeOrdersClient
      result={result}
      query={query}
      now={new Date().toISOString()}
      templateData={templateData}
    />
  );
}
