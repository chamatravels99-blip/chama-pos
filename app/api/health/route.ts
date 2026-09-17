import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export async function GET() {
  const isMongoConfigured = Boolean(process.env.MONGODB_URI);

  return NextResponse.json(
    {
      status: "ok",
      platform: siteConfig.name,
      version: siteConfig.version,
      timestamp: new Date().toISOString(),
      database: {
        configured: isMongoConfigured,
        provider: "MongoDB Atlas",
      },
      multiTenant: {
        isolationStrategy: "Logical Namespace with Indexed businessId Scoping",
        architecture: "Phase 1 Foundation",
      },
    },
    { status: 200 }
  );
}
