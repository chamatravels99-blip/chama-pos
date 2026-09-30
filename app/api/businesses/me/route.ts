
import { NextResponse } from "next/server";

import {
  AuthenticationError,
  AuthorizationError,
  getEffectiveTenantContext,
  requirePermission,
} from "@/lib/auth/session";

import { TenantSecurityError } from "@/lib/db/tenant-context";

import {
  getCurrentBusiness,
  updateDefaultPrintFormat,
} from "@/lib/business/business-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tenantContext = await getEffectiveTenantContext();

    const business = await getCurrentBusiness(tenantContext);

    if (!business) {
      return NextResponse.json(
        { error: "No business is associated with this account." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    if (
      error instanceof AuthorizationError ||
      error instanceof TenantSecurityError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error(
      "GET /api/businesses/me error:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { error: "Failed to retrieve business information." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const tenantContext = await getEffectiveTenantContext();
    await requirePermission("SETTINGS_EDIT");

    const body = await request.json();

    const defaultPrintFormat = body?.defaultPrintFormat;

    if (defaultPrintFormat !== "80mm" && defaultPrintFormat !== "A4") {
      return NextResponse.json(
        { error: "Default print format must be either 80mm or A4." },
        { status: 400 }
      );
    }

    const business = await updateDefaultPrintFormat(
      tenantContext,
      defaultPrintFormat
    );

    if (!business) {
      return NextResponse.json(
        { error: "No business is associated with this account." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    if (
      error instanceof AuthorizationError ||
      error instanceof TenantSecurityError
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    console.error(
      "PUT /api/businesses/me error:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      { error: "Failed to update business settings." },
      { status: 500 }
    );
  }
}