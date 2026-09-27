"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// 헤더 오른쪽 위 "OOO 님 · 변경". 변경 후에는 보고 있던 화면으로 돌아온다.
export function VoterNameBadge({ name }: { name: string }) {
  const pathname = usePathname();
  return (
    <span className="flex min-w-0 items-center gap-1 text-sm">
      <span className="truncate font-medium">{name} 님</span>
      {pathname !== "/name" && (
        <>
          <span aria-hidden className="text-zinc-400">·</span>
          <Link href={`/name?next=${encodeURIComponent(pathname)}`} className="shrink-0 underline">
            변경
          </Link>
        </>
      )}
    </span>
  );
}
