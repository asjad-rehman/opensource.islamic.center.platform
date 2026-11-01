import type { Metadata } from "next";
import AdminLoginForm from "@/components/admin-login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="page-enter" style={{ maxWidth: 480, margin: "56px auto", padding: "0 16px" }}>
      <AdminLoginForm />
    </div>
  );
}
