import { NextResponse } from "next/server";
import {
  AuthenticationError,
  AuthorizationError,
  getTenantContext,
  isPlatformRole,
} from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db/connection";
import { Business } from "@/models/Business";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantContext = await getTenantContext();
    if (!isPlatformRole(tenantContext.role)) {
      throw new AuthorizationError("Forbidden: Platform access is required.");
    }

    await connectToDatabase();
    const businesses = await Business.find({
      status: "active",
      isActive: { $ne: false },
    })
      .select("_id name slug")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ success: true, businesses });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    console.error("GET /api/businesses error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve businesses." }, { status: 500 });
  }
}