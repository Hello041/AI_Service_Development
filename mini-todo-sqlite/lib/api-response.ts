import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200): NextResponse<{ data: T }> {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status: number): NextResponse<{ error: { message: string } }> {
  return NextResponse.json({ error: { message } }, { status });
}
