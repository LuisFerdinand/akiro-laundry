// components/public/Navbar.tsx
import { auth } from "@/auth";
import NavbarClient from "./NavbarClient";
import type { CmsNavbar, CmsNavLink } from "@/lib/db/schema/cms";

type NavbarData = (CmsNavbar & { links: CmsNavLink[] }) | null;

export default async function Navbar({ data }: { data: NavbarData }) {
  const session = await auth();
  const role    = session?.user?.role ?? null; // "admin" | "employee" | "user" | null

  const dashboardHref =
    role === "admin"    ? "/admin"    :
    role === "employee" ? "/employee" : null;

  return <NavbarClient data={data} dashboardHref={dashboardHref} role={role} />;
}