import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      user: {
        id: session.userId,
        username: session.username,
        name: session.name,
        email: session.email,
        role: session.role,
        businessId: session.businessId,
        businessName: session.businessName,
        businessSlug: session.businessSlug,
        branchAccess: session.branchAccess,
        branchIds: session.branchIds,
        activeBranchId: session.activeBranchId,
        permissions: session.permissions || [],
      },
    },
    { status: 200 }
  );
}
