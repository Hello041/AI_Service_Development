import { safeReturnPath } from "@/lib/voter-name";
import { getVoterName } from "@/lib/voter";
import { NameForm } from "./name-form";

export default async function NamePage({ searchParams }: PageProps<"/name">) {
  const { next } = await searchParams;
  const currentName = await getVoterName();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{currentName ? "이름 변경" : "이름을 입력해 주세요"}</h1>
        <p className="text-sm text-zinc-500">
          화면 오른쪽 위에 표시되고, 기명 투표에서는 표에 함께 남습니다.
        </p>
      </div>
      <NameForm
        next={safeReturnPath(typeof next === "string" ? next : null)}
        currentName={currentName ?? ""}
      />
    </div>
  );
}
