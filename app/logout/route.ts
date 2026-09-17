import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await destroySession();
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}
