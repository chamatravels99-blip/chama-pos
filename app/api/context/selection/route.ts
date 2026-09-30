import { NextRequest, NextResponse } from "next/server";
import {
  AuthenticationError,
  AuthorizationError,
  getEffectiveTenantContext,
  getTenantContext,
  isPlatformRole,
  setSelectedBranchContext,
  setSelectedBusinessContext,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

function selectionResponse(context: Awaited<ReturnType<typeof getEffectiveTenantContext>>) {
  return {
    success: true,
    businessId: context.businessId,
    branchId: context.activeBranchId || null,
  };
}

export async function GET() {
  try {
    return NextResponse.json(selectionResponse(await getEffectiveTenantContext()));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/context/selection error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to retrieve selected context." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentContext = await getTenantContext();
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid context selection." }, { status: 400 });
    }

    let selectedContext = await getEffectiveTenantContext();
    if (Object.prototype.hasOwnProperty.call(body, "businessId")) {
      if (!isPlatformRole(currentContext.role)) {
        throw new AuthorizationError("Forbidden: Business users cannot change their business context.");
      }
      if (typeof body.businessId !== "string") {
        return NextResponse.json({ error: "A business must be selected." }, { status: 400 });
      }
      selectedContext = await setSelectedBusinessContext(body.businessId);
    }

    if (Object.prototype.hasOwnProperty.call(body, "branchId")) {
      if (typeof body.branchId !== "string") {
        return NextResponse.json({ error: "A valid branch selection is required." }, { status: 400 });
      }
      selectedContext = await setSelectedBranchContext(body.branchId);
    }

    if (!Object.prototype.hasOwnProperty.call(body, "businessId") && !Object.prototype.hasOwnProperty.call(body, "branchId")) {
      return NextResponse.json({ error: "Business or branch selection is required." }, { status: 400 });
    }

    return NextResponse.json(selectionResponse(selectedContext));
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }
    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("POST /api/context/selection error:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to update selected context." }, { status: 500 });
  }
}