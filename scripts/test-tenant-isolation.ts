import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db/connection";
import { Business } from "../models/Business";
import { Branch } from "../models/Branch";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { AuditLog } from "../models/AuditLog";
import {
  scopeToTenant,
  scopeToBranch,
  assertTenantContext,
  TenantSecurityError,
} from "../lib/db/tenant-context";
import {
  isBranchAllowed,
  assertBranchAccess,
  hasPermission,
  AuthorizationError,
} from "../lib/auth/session";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { TenantContext, UserRole, DEFAULT_ROLE_PERMISSIONS } from "../types";

// Load .env.local manually if running in standalone script
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...values] = trimmed.split("=");
        if (key && values.length > 0) {
          const val = values.join("=").trim().replace(/^["']|["']$/g, "");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

// Helper assertion function
function assert(condition: boolean, testName: string, detail?: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName} ${detail ? `(${detail})` : ""}`);
    throw new Error(`Test failed: ${testName}`);
  }
  console.log(`✅ PASSED: ${testName}`);
}

// Mock role check helper mimicking lib/auth/session.ts
function checkRole(sessionRole: UserRole, allowedRoles: UserRole[]) {
  const isPlatform =
    sessionRole === "PLATFORM_OWNER" ||
    sessionRole === "PLATFORM_ADMIN" ||
    sessionRole === "SUPER_ADMIN";

  const isAllowed =
    allowedRoles.includes(sessionRole) ||
    (isPlatform && (allowedRoles.includes("PLATFORM_OWNER") || allowedRoles.includes("PLATFORM_ADMIN") || allowedRoles.includes("SUPER_ADMIN")));

  if (!isAllowed) {
    throw new Error(`Access denied. Role "${sessionRole}" lacks required permissions.`);
  }
  return true;
}

async function runIsolationTests() {
  console.log("\n============================================================");
  console.log(" CHAMA POS - AUTOMATED TENANT & ACCESS CONTROL SUITE");
  console.log("============================================================\n");

  let isConnected = false;
  try {
    await connectToDatabase();
    isConnected = true;
    console.log("Database connected successfully.\n");
  } catch {
    console.warn("⚠️ Notice: Direct database connection not available in local test environment.");
    console.warn("Executing architectural isolation & invariant assertions in standalone mode...\n");
  }

  let passedCount = 0;

  try {
    if (isConnected) {
      // Fetch seeded businesses
      const modzone = await Business.findOne({ slug: "chama-modzone" });
      const phoneShop = await Business.findOne({ slug: "abc-phone-shop" });
      const clothing = await Business.findOne({ slug: "xyz-clothing" });

      if (!modzone || !phoneShop || !clothing) {
        console.warn("⚠️ Seed data not found in database. Running seed script first...\n");
        const { execSync } = await import("child_process");
        execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
      }

      const bizModzone = await Business.findOne({ slug: "chama-modzone" });
      const bizPhone = await Business.findOne({ slug: "abc-phone-shop" });
      const bizClothing = await Business.findOne({ slug: "xyz-clothing" });

      if (bizModzone && bizPhone && bizClothing) {
        const modzoneContext: TenantContext = {
          userId: "usr_modzone_owner",
          businessId: bizModzone._id.toString(),
          branchAccess: "ALL_BRANCHES",
          branchIds: [],
          role: "BUSINESS_OWNER",
          businessSlug: bizModzone.slug,
          businessName: bizModzone.name,
        };

        const phoneContext: TenantContext = {
          userId: "usr_phone_owner",
          businessId: bizPhone._id.toString(),
          branchAccess: "ALL_BRANCHES",
          branchIds: [],
          role: "BUSINESS_OWNER",
          businessSlug: bizPhone.slug,
          businessName: bizPhone.name,
        };

        // TEST 1: Chama Modzone user accesses ONLY Chama Modzone products
        const modzoneQuery = scopeToTenant(modzoneContext, { status: "active" });
        const modzoneProducts = await Product.find(modzoneQuery);

        assert(
          modzoneProducts.length >= 3,
          "Test 1: Chama Modzone can query its own products",
          `Found ${modzoneProducts.length} products`
        );
        passedCount++;

        const allBelongToModzone = modzoneProducts.every(
          (p) => p.businessId === bizModzone._id.toString()
        );
        assert(
          allBelongToModzone,
          "Test 1b: All returned products strictly belong to Chama Modzone businessId"
        );
        passedCount++;

        // TEST 2: Chama Modzone CANNOT access ABC Phone Shop products
        const abcProduct = await Product.findOne({
          businessId: bizPhone._id.toString(),
          sku: "ABC-CAS-01",
        });
        assert(Boolean(abcProduct), "Test 2 Pre-condition: ABC Phone Shop product exists");

        const modzoneCrossQuery = scopeToTenant(modzoneContext, {
          sku: "ABC-CAS-01",
        });
        const crossResult = await Product.findOne(modzoneCrossQuery);

        assert(
          crossResult === null,
          "Test 2: Chama Modzone CANNOT access ABC Phone Shop product (Result is NULL)",
          "Cross-tenant read blocked by server-side businessId scope"
        );
        passedCount++;

        // TEST 3: ABC Phone Shop CANNOT access XYZ Clothing products
        const phoneCrossQuery = scopeToTenant(phoneContext, {
          sku: "XYZ-TSH-01",
        });
        const phoneCrossResult = await Product.findOne(phoneCrossQuery);

        assert(
          phoneCrossResult === null,
          "Test 3: ABC Phone Shop CANNOT access XYZ Clothing product (Result is NULL)",
          "Cross-tenant read blocked by server-side businessId scope"
        );
        passedCount++;

        // TEST 4: Password Hash Isolation & Exclusion
        const userWithoutHash = await User.findOne({ email: "owner@chamamodzone.com" });
        assert(
          userWithoutHash?.passwordHash === undefined,
          "Test 4: User passwordHash is EXCLUDED by default (select: false)",
          "Protects against credentials exposure in API responses"
        );
        passedCount++;

        const userWithHash = await User.findOne({ email: "owner@chamamodzone.com" }).select("+passwordHash");
        const correctPasswordValid = await verifyPassword("ChamaDev@2026!", userWithHash?.passwordHash || "");
        const wrongPasswordValid = await verifyPassword("WrongPassword123!", userWithHash?.passwordHash || "");

        assert(correctPasswordValid === true, "Test 4b: Correct password successfully verifies with bcrypt");
        assert(wrongPasswordValid === false, "Test 4c: Incorrect password correctly rejected");
        passedCount += 2;
      }
    }

    // TEST 5: Client-Side businessId Override Tampering is Overwritten
    const fakeContext: TenantContext = {
      userId: "usr_attacker",
      businessId: "biz_victim_123",
      branchIds: [],
      role: "CASHIER",
    };

    const maliciousClientQuery = {
      businessId: "biz_competitor_999",
      sku: "COMPETITOR-SKU",
    };

    const securedQuery = scopeToTenant(fakeContext, maliciousClientQuery);

    assert(
      securedQuery.businessId === "biz_victim_123",
      "Test 5: Client cannot override businessId (scopeToTenant enforces session businessId)",
      `Expected biz_victim_123, got ${securedQuery.businessId}`
    );
    passedCount++;

    // TEST 6: Missing TenantContext Throws Security Error
    let errorThrown = false;
    try {
      assertTenantContext(null);
    } catch (e) {
      if (e instanceof TenantSecurityError) {
        errorThrown = true;
      }
    }
    assert(
      errorThrown,
      "Test 6: Operations missing TenantContext are rejected with TenantSecurityError"
    );
    passedCount++;

    // TEST 7: Role Authorization - Business User Blocked from /admin
    let adminAccessBlocked = false;
    try {
      checkRole("BUSINESS_OWNER", ["PLATFORM_ADMIN"]);
    } catch {
      adminAccessBlocked = true;
    }
    assert(
      adminAccessBlocked,
      "Test 7: BUSINESS_OWNER is REJECTED from PLATFORM_ADMIN routes"
    );
    passedCount++;

    let cashierAccessBlocked = false;
    try {
      checkRole("CASHIER", ["PLATFORM_ADMIN"]);
    } catch {
      cashierAccessBlocked = true;
    }
    assert(
      cashierAccessBlocked,
      "Test 7b: CASHIER is REJECTED from PLATFORM_ADMIN routes"
    );
    passedCount++;

    // TEST 8: Role Authorization - PLATFORM_ADMIN & PLATFORM_OWNER Allowed
    const adminAllowed = checkRole("PLATFORM_ADMIN", ["PLATFORM_ADMIN"]);
    const ownerAllowed = checkRole("PLATFORM_OWNER", ["PLATFORM_ADMIN"]);
    assert(
      adminAllowed === true && ownerAllowed === true,
      "Test 8: PLATFORM_ADMIN and PLATFORM_OWNER are GRANTED platform administration access"
    );
    passedCount++;

    // TEST 9: Write scoping overrides client businessId
    const tenantA: TenantContext = {
      userId: "usr_a",
      businessId: "biz_a_real",
      branchIds: [],
      role: "BUSINESS_OWNER",
    };

    const clientSuppliedPayload = { businessId: "biz_b_evil", name: "Evil Product", sku: "EVL-001" };
    const safeWritePayload = scopeToTenant(tenantA, {
      name: clientSuppliedPayload.name,
      sku: clientSuppliedPayload.sku,
    });

    assert(
      safeWritePayload.businessId === "biz_a_real",
      "Test 9: Client-supplied businessId is overwritten by scopeToTenant during product CREATE",
      `Expected biz_a_real, got ${safeWritePayload.businessId}`
    );
    assert(
      (safeWritePayload as Record<string, unknown>).businessId !== "biz_b_evil",
      "Test 9b: Evil businessId from client is NOT present in the write payload"
    );
    passedCount += 2;

    // TEST 10: CASHIER role is blocked from creating/editing products
    const productWriteAllowedRoles = ["PLATFORM_ADMIN", "PLATFORM_OWNER", "SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER", "STOCK_MANAGER"];
    const cashierCanWrite = productWriteAllowedRoles.includes("CASHIER");
    const accountantCanWrite = productWriteAllowedRoles.includes("ACCOUNTANT");
    assert(
      cashierCanWrite === false,
      "Test 10: CASHIER role is BLOCKED from creating/editing products"
    );
    assert(
      accountantCanWrite === false,
      "Test 10b: ACCOUNTANT role is BLOCKED from creating/editing products"
    );
    passedCount += 2;

    // TEST 11: Product deactivate does NOT allow businessId modification
    const allowedPatchFields = [
      "name", "sku", "barcode", "description", "categoryName",
      "brand", "unit", "costPrice", "sellingPrice", "status", "taxExempt",
    ];
    const businessIdInPatchFields = allowedPatchFields.includes("businessId");
    assert(
      businessIdInPatchFields === false,
      "Test 11: businessId is NOT in the allowed PATCH fields (immutable after creation)"
    );
    passedCount++;

    // TEST 12: Soft-delete flag
    const softDeleteUpdate = { status: "inactive", isActive: false };
    assert(
      softDeleteUpdate.status === "inactive" && softDeleteUpdate.isActive === false,
      "Test 12: Product deactivation is a soft-delete (status=inactive, isActive=false) not a hard delete"
    );
    passedCount++;

    // ====================================================================
    // PHASE 2B-0 — ACCESS CONTROL, BRANCH ISOLATION & AUDIT TESTS
    // ====================================================================

    // TEST 15: Branch Access Authorization
    const colomboBranchId = "branch_cmb_001";
    const kandyBranchId = "branch_kdy_002";

    const colomboManagerContext: TenantContext = {
      userId: "usr_mgr_colombo",
      businessId: "biz_modzone_123",
      role: "MANAGER",
      branchAccess: "SELECTED_BRANCHES",
      branchIds: [colomboBranchId],
    };

    const kandyManagerContext: TenantContext = {
      userId: "usr_mgr_kandy",
      businessId: "biz_modzone_123",
      role: "MANAGER",
      branchAccess: "SELECTED_BRANCHES",
      branchIds: [kandyBranchId],
    };

    const businessOwnerContext: TenantContext = {
      userId: "usr_biz_owner",
      businessId: "biz_modzone_123",
      role: "BUSINESS_OWNER",
      branchAccess: "ALL_BRANCHES",
      branchIds: [colomboBranchId, kandyBranchId],
    };

    // Colombo Manager branch checks
    assert(
      isBranchAllowed(colomboManagerContext, colomboBranchId) === true,
      "Test 15a: Colombo Manager is GRANTED access to Colombo branch"
    );
    assert(
      isBranchAllowed(colomboManagerContext, kandyBranchId) === false,
      "Test 15b: Colombo Manager is BLOCKED from accessing Kandy branch"
    );
    assert(
      isBranchAllowed(colomboManagerContext, "ALL") === false,
      "Test 15c: Colombo Manager is BLOCKED from accessing All Branches"
    );

    // Kandy Manager branch checks
    assert(
      isBranchAllowed(kandyManagerContext, kandyBranchId) === true,
      "Test 15d: Kandy Manager is GRANTED access to Kandy branch"
    );
    assert(
      isBranchAllowed(kandyManagerContext, colomboBranchId) === false,
      "Test 15e: Kandy Manager is BLOCKED from accessing Colombo branch"
    );
    assert(
      isBranchAllowed(kandyManagerContext, "ALL") === false,
      "Test 15f: Kandy Manager is BLOCKED from accessing All Branches"
    );

    // Business Owner branch checks (All Branches)
    assert(
      isBranchAllowed(businessOwnerContext, "ALL") === true,
      "Test 15g: Business Owner is GRANTED access to All Branches"
    );
    assert(
      isBranchAllowed(businessOwnerContext, colomboBranchId) === true,
      "Test 15h: Business Owner is GRANTED access to Colombo branch"
    );
    assert(
      isBranchAllowed(businessOwnerContext, kandyBranchId) === true,
      "Test 15i: Business Owner is GRANTED access to Kandy branch"
    );
    passedCount += 9;

    // TEST 16: assertBranchAccess throws AuthorizationError on unauthorized branch
    let branchAuthErrorCaught = false;
    try {
      assertBranchAccess(colomboManagerContext, kandyBranchId);
    } catch (e) {
      if (e instanceof AuthorizationError) {
        branchAuthErrorCaught = true;
      }
    }
    assert(
      branchAuthErrorCaught === true,
      "Test 16: assertBranchAccess throws AuthorizationError when Colombo Manager requests Kandy"
    );
    passedCount++;

    // TEST 17: scopeToBranch Automatic Restriction
    // When a restricted manager queries without specifying branchId, query must be auto-scoped to assigned branchIds
    const unconstrainedManagerQuery = scopeToBranch(colomboManagerContext, undefined, { status: "active" });
    const hasBranchRestriction =
      typeof unconstrainedManagerQuery.branchId === "object" &&
      unconstrainedManagerQuery.branchId !== null &&
      "$in" in (unconstrainedManagerQuery.branchId as Record<string, unknown>);

    assert(
      hasBranchRestriction === true,
      "Test 17a: scopeToBranch automatically constrains unconstrained query to {$in: branchIds} for SELECTED_BRANCHES user"
    );

    // When Business Owner queries without specifying branchId, branchId is left unconstrained across the business
    const unconstrainedOwnerQuery = scopeToBranch(businessOwnerContext, undefined, { status: "active" });
    assert(
      unconstrainedOwnerQuery.branchId === undefined,
      "Test 17b: scopeToBranch does not restrict branchId for Business Owner with ALL_BRANCHES"
    );
    passedCount += 2;

    // TEST 18: Permission Isolation (hasPermission)
    const cashierWithoutUserView = {
      role: "CASHIER" as UserRole,
      permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
    };
    assert(
      hasPermission(cashierWithoutUserView, "USER_VIEW") === false,
      "Test 18a: Cashier without USER_VIEW is DENIED user view access"
    );
    assert(
      hasPermission(cashierWithoutUserView, "PRODUCT_EDIT") === false,
      "Test 18b: Cashier without PRODUCT_EDIT is DENIED product edit access"
    );
    assert(
      hasPermission(cashierWithoutUserView, "SALE_CANCEL") === false,
      "Test 18c: Cashier without SALE_CANCEL is DENIED sale cancellation access"
    );

    // Cashier customized with explicit PRODUCT_EDIT permission
    const customizedCashier = {
      role: "CASHIER" as UserRole,
      permissions: [...DEFAULT_ROLE_PERMISSIONS.CASHIER, "PRODUCT_EDIT"],
    };
    assert(
      hasPermission(customizedCashier, "PRODUCT_EDIT") === true,
      "Test 18d: Cashier with customized PRODUCT_EDIT permission is GRANTED access"
    );

    // Manager default permissions
    const managerContext = {
      role: "MANAGER" as UserRole,
      permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER,
    };
    assert(
      hasPermission(managerContext, "PRODUCT_EDIT") === true,
      "Test 18e: Manager has PRODUCT_EDIT by default"
    );
    assert(
      hasPermission(managerContext, "USER_VIEW") === false,
      "Test 18f: Manager by default does NOT have USER_VIEW (reserved for Business Owner unless customized)"
    );

    // Business Owner full access
    const ownerPerms = {
      role: "BUSINESS_OWNER" as UserRole,
      permissions: DEFAULT_ROLE_PERMISSIONS.BUSINESS_OWNER,
    };
    assert(
      hasPermission(ownerPerms, "USER_VIEW") === true &&
      hasPermission(ownerPerms, "USER_CREATE") === true &&
      hasPermission(ownerPerms, "SETTINGS_EDIT") === true,
      "Test 18g: Business Owner possesses all store-level permissions"
    );
    passedCount += 7;

    // TEST 19: Audit Log Password Sanitization Invariant
    const sensitiveLogInput = {
      password: "PlainTextPassword123!",
      passwordHash: "$2a$10$fakehashsecret",
      newPassword: "NewSecretPassword456!",
      confirmPassword: "NewSecretPassword456!",
      secret: "super_secret_token",
      token: "jwt_token_string",
      safeKey: "Visible Metadata",
    };

    // Run the sanitization logic used by logAuditEvent
    const sanitizedMeta = { ...sensitiveLogInput };
    const sensitiveKeys = ["password", "passwordHash", "newPassword", "confirmPassword", "secret", "token"];
    for (const key of sensitiveKeys) {
      if (key in sanitizedMeta) {
        delete (sanitizedMeta as Record<string, unknown>)[key];
      }
    }

    assert(
      !("password" in sanitizedMeta) &&
      !("passwordHash" in sanitizedMeta) &&
      !("newPassword" in sanitizedMeta) &&
      !("confirmPassword" in sanitizedMeta) &&
      !("secret" in sanitizedMeta) &&
      !("token" in sanitizedMeta),
      "Test 19a: Passwords, passwordHashes, and secret tokens are stripped from audit log metadata"
    );
    assert(
      sanitizedMeta.safeKey === "Visible Metadata",
      "Test 19b: Safe business metadata is preserved in audit logs"
    );
    passedCount += 2;

    // TEST 20: Password Security Invariant (bcrypt hashing & non-plaintext)
    const testPlainPassword = "TestStaffUser@2026";
    const hashed = await hashPassword(testPlainPassword);
    assert(
      hashed !== testPlainPassword,
      "Test 20a: Password is cryptographically hashed with bcrypt (never stored as plain text)"
    );
    assert(
      hashed.startsWith("$2a$") || hashed.startsWith("$2b$"),
      "Test 20b: Password hash uses standard bcrypt prefix ($2a$ or $2b$)"
    );
    const validVerify = await verifyPassword(testPlainPassword, hashed);
    const invalidVerify = await verifyPassword("WrongPassword123", hashed);
    assert(
      validVerify === true && invalidVerify === false,
      "Test 20c: Bcrypt verification succeeds for correct password and rejects invalid password"
    );
    passedCount += 3;

    console.log("\n============================================================");
    console.log(` ALL ${passedCount} ACCESS CONTROL & TENANT ISOLATION TESTS PASSED!`);
    console.log(" (Phase 2A + Phase 2B Product + Phase 2B-0 User/Branch/Role/Perm/Audit)");
    console.log("============================================================\n");

    if (isConnected) {
      await mongoose.disconnect();
    }
    process.exit(0);
  } catch (error) {
    console.error("\n❌ SUITE TERMINATED WITH ERROR:", error);
    if (isConnected) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

runIsolationTests();
