// app/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user?.role;
  if (role === "admin")    redirect("/admin");
  if (role === "employee") redirect("/employee");

  redirect("/login");
}