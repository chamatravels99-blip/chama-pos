import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return NextResponse.json({ success: true, message: "Logged out successfully." });
}

export async function GET() {
  await destroySession();
  return NextResponse.json({ success: true, message: "Logged out successfully." });
}
