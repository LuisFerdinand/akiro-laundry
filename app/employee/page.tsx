// app/employee/page.tsx
import { auth } from "@/auth";
import { getEmployeeDashboard } from "@/lib/actions/orders";
import { getWaTemplateData } from "@/lib/actions/wa-templates";
import { EmployeeDashboard } from "@/components/employee/dashboard/EmployeeDashboard";

export default async function EmployeeDashboardPage() {
  const [data, templateData, session] = await Promise.all([
    getEmployeeDashboard(),
    getWaTemplateData(),
    auth(),
  ]);

  return (
    <EmployeeDashboard
      data={data}
      staffName={session?.user?.name ?? null}
      now={new Date().toISOString()}
      templateData={templateData}
    />
  );
}
