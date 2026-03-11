/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/users/page.tsx
import { getAdminUsers }  from "@/lib/actions/admin-users";
import { UsersClient }    from "@/components/admin/UsersClient";
import { auth }           from "@/auth";
import { redirect }       from "next/navigation";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const users = await getAdminUsers();

  return (
    <UsersClient
      users={users}
      currentAdminId={Number((session.user as any).id)}
    />
  );
}