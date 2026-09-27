import type { AdminPollView } from "@/lib/polls";

// 기명 투표에서 선택지별로 누가 골랐는지. 운영자 화면에만 쓴다 (ADR-0003).
export function VoterNames({ poll }: { poll: AdminPollView }) {
  if (!poll.votersByOption) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium">누가 골랐나요 (표를 던진 순서)</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {poll.votersByOption.map(({ optionId, names }) => {
          const option = poll.options.find((o) => o.id === optionId);
          return (
            <li key={optionId} className="break-words">
              <span className="font-medium">
                {option?.text} ({names.length})
              </span>
              <span className="text-zinc-500"> — {names.length > 0 ? names.join(", ") : "없음"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
