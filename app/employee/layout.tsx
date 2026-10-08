// app/employee/layout.tsx
import { EmployeeShell } from "@/components/employee/layout/EmployeeShell";

// Employee pages read live DB state (orders, cash register) but call no
// dynamic API (auth() etc., unlike /admin), so Next.js would otherwise
// statically prerender them at build time and serve stale data forever in
// production. Force per-request rendering for the whole segment.
export const dynamic = "force-dynamic";

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return <EmployeeShell>{children}</EmployeeShell>;
}
