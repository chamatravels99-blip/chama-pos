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
export type DefaultPrintFormat = "80mm" | "A4";

export async function updateDefaultPrintFormat(
  context: TenantContext,
  defaultPrintFormat: DefaultPrintFormat
) {
  assertTenantContext(context);
  await connectToDatabase();

  if (defaultPrintFormat !== "80mm" && defaultPrintFormat !== "A4") {
    throw new Error("Invalid default print format.");
  }

  return Business.findOneAndUpdate(
    buildCurrentBusinessQuery(context),
    {
      $set: {
        "settings.defaultPrintFormat": defaultPrintFormat,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  ).lean();
}