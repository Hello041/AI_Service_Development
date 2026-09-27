import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { defaultDeadlineInput } from "@/lib/kst-time";
import { CreatePollForm } from "./create-poll-form";

export default async function NewPollPage() {
  await requireAdmin();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="text-sm underline">
        ← 대시보드
      </Link>
      <h1 className="text-xl font-semibold">새 투표 만들기</h1>
      <CreatePollForm defaultDeadline={defaultDeadlineInput(new Date())} />
    </div>
  );
}
