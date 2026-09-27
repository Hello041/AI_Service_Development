import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  SESSION_TTL_MS,
  verifyPassword,
  verifySessionToken,
} from "./admin-auth";

const COOKIE_NAME = "admin_session";

function requireEnv(name: "ADMIN_PASSWORD" | "SESSION_SECRET"): string {
  const value = process.env[name];
  if (!value) throw new Error(`환경변수 ${name}가 설정되지 않았습니다.`);
  return value;
}

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;
  return verifySessionToken(token, requireEnv("SESSION_SECRET"), Date.now());
}

// 운영자 화면과 운영자 서버 액션은 모두 이 검사를 먼저 거친다.
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export async function logIn(password: string): Promise<boolean> {
  if (!verifyPassword(password, requireEnv("ADMIN_PASSWORD"))) return false;
  (await cookies()).set(
    COOKIE_NAME,
    createSessionToken(requireEnv("SESSION_SECRET"), Date.now()),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_MS / 1000,
    },
  );
  return true;
}

export async function logOut(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}
