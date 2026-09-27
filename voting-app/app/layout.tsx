import type { Metadata } from "next";
import Link from "next/link";
import { getVoterName } from "@/lib/voter";
import "./globals.css";
import { VoterNameBadge } from "./voter-name-badge";

export const metadata: Metadata = {
  title: "동아리 투표",
  description: "질문 하나, 선택지 하나를 골라 투표하고 결과를 확인하세요.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const voterName = await getVoterName();
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/15">
          <div className="mx-auto flex w-full max-w-xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="shrink-0 font-semibold">
              동아리 투표
            </Link>
            <div className="flex min-w-0 items-center gap-3">
              {voterName && <VoterNameBadge name={voterName} />}
              {/* 로그인되어 있으면 /admin이 바로 대시보드를 보여준다. */}
              <Link
                href="/admin"
                className="shrink-0 rounded-lg border border-black/15 px-3 py-1 text-sm dark:border-white/20"
              >
                운영자 로그인
              </Link>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
