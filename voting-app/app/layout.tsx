import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "동아리 투표",
  description: "질문 하나, 선택지 하나를 골라 투표하고 결과를 확인하세요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <header className="border-b border-black/10 dark:border-white/15">
          <div className="mx-auto w-full max-w-xl px-4 py-3">
            <Link href="/" className="font-semibold">
              동아리 투표
            </Link>
          </div>
        </header>
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
