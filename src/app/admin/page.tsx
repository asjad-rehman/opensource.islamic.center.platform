import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import AdminDashboard from "@/components/admin/admin-dashboard";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  const user = token ? verifyToken(token) : null;

  if (!user) {
    redirect("/admin/login");
  }

  return <AdminDashboard user={user} />;
}
