import { NextResponse } from "next/server";
import {
  AuthenticationError,
  AuthorizationError,
  getTenantContext,
} from "@/lib/auth/session";
import { TenantSecurityError } from "@/lib/db/tenant-context";
import { getCurrentBusiness } from "@/lib/business/business-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantContext = await getTenantContext();
    const business = await getCurrentBusiness(tenantContext);
    if (!business) {
      return NextResponse.json({ error: "No business is associated with this account." }, { status: 404 });
    }
    return NextResponse.json({ success: true, business });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError || error instanceof TenantSecurityError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/businesses/me error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve business information." }, { status: 500 });
  }
}