import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-session";
import { LoginForm } from "./login-form";

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">운영자 로그인</h1>
      <LoginForm />
    </div>
  );
}
