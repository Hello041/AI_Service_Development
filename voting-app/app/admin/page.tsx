import { requireAdmin } from "@/lib/admin-session";
import { logOutAction } from "./actions";

export default async function AdminDashboardPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">운영자 대시보드</h1>
        <form action={logOutAction}>
          <button type="submit" className="text-sm underline">
            로그아웃
          </button>
        </form>
      </div>
      <p className="text-zinc-500">아직 투표가 없습니다.</p>
    </div>
  );
}
