import { TenantContext } from "@/types";
import { assertTenantContext } from "@/lib/db/tenant-context";
import { connectToDatabase } from "@/lib/db/connection";
import { Business } from "@/models/Business";

export function buildCurrentBusinessQuery(context: TenantContext) {
  assertTenantContext(context);
  return { _id: context.businessId };
}

export async function getCurrentBusiness(context: TenantContext) {
  if (!context.businessId) return null;
  await connectToDatabase();
  return Business.findOne(buildCurrentBusinessQuery(context)).lean();
}