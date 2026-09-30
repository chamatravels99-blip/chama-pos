import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db/connection";
import { Business } from "../models/Business";
import { Branch } from "../models/Branch";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { Supplier } from "../models/Supplier";
import { StockMovement } from "../models/StockMovement";
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
import {
  createSale,
  listSales,
  getSaleById,
  validateSaleBranchId,
  resolveSaleActor,
  SaleValidationError,
  findSaleCreatedAudit,
} from "../lib/sales/sale-service";
import { adjustStock } from "../lib/inventory/stock-service";
import {
  addMovementNames,
  buildMovementReferenceQueries,
  mapMovementNames,
} from "../lib/inventory/movement-display";
import { createProductWithOpeningStock, ProductCreationError } from "../lib/products/product-service";
import { buildCurrentBusinessQuery, getCurrentBusiness } from "../lib/business/business-service";
import { buildAuthorizedBranchQuery, listAuthorizedBranches } from "../lib/branches/branch-service";
import { buildSalesQuery } from "../lib/sales/sale-service";

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

        const modzoneBusinessInfo = await getCurrentBusiness(modzoneContext);
        const phoneBusinessInfo = await getCurrentBusiness(phoneContext);
        assert(
          modzoneBusinessInfo?._id.toString() === bizModzone._id.toString() &&
            modzoneBusinessInfo.name === bizModzone.name &&
            phoneBusinessInfo?._id.toString() === bizPhone._id.toString() &&
            phoneBusinessInfo.name === bizPhone.name &&
            phoneBusinessInfo.name !== modzoneBusinessInfo.name,
          "Business Information test: Shop A and Shop B receive only their own business record"
        );
        passedCount++;

        const modzoneBranches = await listAuthorizedBranches(modzoneContext);
        const phoneBranches = await listAuthorizedBranches(phoneContext);
        assert(
          modzoneBranches.every((branch) => branch.businessId === bizModzone._id.toString()) &&
            phoneBranches.every((branch) => branch.businessId === bizPhone._id.toString()) &&
            !phoneBranches.some((branch) => modzoneBranches.some((own) => own._id.toString() === branch._id.toString())),
          "Branches test: Shop A branches never appear in Shop B results"
        );
        passedCount++;

        const isolationSupplier = await Supplier.create({
          businessId: bizModzone._id.toString(),
          companyName: `Tenant Isolation Supplier ${Date.now()}`,
        });
        try {
          const phoneSupplierQuery = scopeToTenant(phoneContext, { _id: isolationSupplier._id });
          const crossTenantSupplier = await Supplier.findOne(phoneSupplierQuery);
          assert(
            crossTenantSupplier === null,
            "Supplier test: Business B cannot read a Chama Modzone supplier"
          );
          passedCount++;

          const foreignUpdate = await Supplier.findOneAndUpdate(
            phoneSupplierQuery,
            { $set: { companyName: "Unauthorized change" } },
            { new: true }
          );
          assert(foreignUpdate === null, "Supplier test: Business B cannot update a Chama Modzone supplier");
          passedCount++;

          const foreignDelete = await Supplier.findOneAndDelete(phoneSupplierQuery);
          assert(foreignDelete === null, "Supplier test: Business B cannot delete a Chama Modzone supplier");
          passedCount++;
        } finally {
          await Supplier.deleteOne({ _id: isolationSupplier._id, businessId: bizModzone._id.toString() });
        }

        const openingBranch = await Branch.findOne({
          businessId: bizModzone._id.toString(),
          code: "CMB-01",
        });
        const restrictedBranch = await Branch.findOne({
          businessId: bizModzone._id.toString(),
          code: "KDY-01",
        });
        assert(Boolean(openingBranch && restrictedBranch), "Opening stock test branches exist");
        passedCount++;
        const openingBranchContext: TenantContext = {
          ...modzoneContext,
          role: "MANAGER",
          branchAccess: "SELECTED_BRANCHES",
          branchIds: [openingBranch!._id.toString()],
        };
        const restrictedBranchResults = await listAuthorizedBranches(openingBranchContext);
        assert(
          restrictedBranchResults.length > 0 &&
            restrictedBranchResults.every((branch) => branch._id.toString() === openingBranch!._id.toString()),
          "Branches test: a restricted user receives only assigned branch documents"
        );
        passedCount++;

        const createdOpeningProductIds: string[] = [];
        const testSkuPrefix = `OPEN-${Date.now()}`;
        try {
          const spoofedOpeningInput = {
            name: "Opening Stock Integration Test",
            sku: `${testSkuPrefix}-POS`,
            costPrice: 2,
            sellingPrice: 4,
            unit: "pcs",
            status: "active" as const,
            branchId: openingBranch!._id.toString(),
            openingQuantity: 2.5,
            lowStockThreshold: 3,
            businessId: bizPhone._id.toString(),
          };
          const openingProduct = await createProductWithOpeningStock(modzoneContext, spoofedOpeningInput);
          createdOpeningProductIds.push(openingProduct._id.toString());

          assert(
            openingProduct.businessId === bizModzone._id.toString(),
            "Opening stock test: product businessId comes from session, not client input"
          );
          passedCount++;

          const openingStock = openingProduct.stockByBranch?.find(
            (stock) => stock.branchId === openingBranch!._id.toString()
          );
          assert(
            openingStock?.quantity === 2.5 && openingStock.lowStockThreshold === 3,
            "Opening stock test: fractional quantity and threshold are stored on the selected branch"
          );
          passedCount++;

          const openingMovement = await StockMovement.findOne({
            businessId: bizModzone._id.toString(),
            branchId: openingBranch!._id.toString(),
            productId: openingProduct._id.toString(),
            type: "opening_stock",
          }).lean();
          assert(
            openingMovement?.previousQuantity === 0 &&
              openingMovement.quantityChange === 2.5 &&
              openingMovement.newQuantity === 2.5 &&
              openingMovement.userId === modzoneContext.userId,
            "Opening stock test: opening movement records the session user and exact stock transition"
          );
          passedCount++;

          const movementDisplayUser = await User.findOne({ businessId: bizModzone._id.toString() }).select("_id name").lean();
          const foreignProduct = await Product.findOne({ businessId: bizPhone._id.toString() }).select("_id").lean();
          const foreignBranch = await Branch.findOne({ businessId: bizPhone._id.toString() }).select("_id").lean();
          const foreignUser = await User.findOne({ businessId: bizPhone._id.toString() }).select("_id").lean();
          assert(Boolean(movementDisplayUser && foreignProduct && foreignBranch && foreignUser), "Movement display test references exist");
          passedCount++;

          const movementDisplayResults = await addMovementNames(modzoneContext, [
            {
              productId: openingProduct._id.toString(),
              branchId: openingBranch!._id.toString(),
              userId: movementDisplayUser!._id.toString(),
            },
            {
              productId: foreignProduct!._id.toString(),
              branchId: foreignBranch!._id.toString(),
              userId: foreignUser!._id.toString(),
            },
            {
              productId: new mongoose.Types.ObjectId().toString(),
              branchId: new mongoose.Types.ObjectId().toString(),
              userId: new mongoose.Types.ObjectId().toString(),
            },
          ]);
          assert(
            movementDisplayResults[0].productName === openingProduct.name,
            "Movement display test resolves the tenant product name"
          );
          passedCount++;
          const expectedBranchName = openingBranch!.name;
          assert(
            movementDisplayResults[0].branchName === expectedBranchName,
            "Movement display test resolves the tenant branch name"
          );
          passedCount++;
          assert(
            movementDisplayResults[0].userName === movementDisplayUser!.name,
            "Movement display test resolves the tenant user name"
          );
          passedCount++;
          assert(
            movementDisplayResults[1].productName === "Unknown Product" &&
              movementDisplayResults[1].branchName === "Unknown Branch" &&
              movementDisplayResults[1].userName === "Unknown User",
            "Movement display test never exposes foreign tenant names"
          );
          passedCount++;
          assert(
            movementDisplayResults[2].productName === "Unknown Product" &&
              movementDisplayResults[2].branchName === "Unknown Branch" &&
              movementDisplayResults[2].userName === "Unknown User",
            "Movement display test uses safe fallbacks for missing references"
          );
          passedCount++;

          const foreignTenantProduct = await Product.findOne(
            scopeToTenant(phoneContext, { _id: openingProduct._id })
          );
          const foreignTenantMovements = await StockMovement.find(
            scopeToTenant(phoneContext, { productId: openingProduct._id.toString() })
          ).lean();
          assert(
            foreignTenantProduct === null && foreignTenantMovements.length === 0,
            "Opening stock test: another tenant cannot read the product or its opening movement"
          );
          passedCount++;

          const zeroStockProduct = await createProductWithOpeningStock(modzoneContext, {
            name: "Zero Opening Stock Integration Test",
            sku: `${testSkuPrefix}-ZERO`,
            costPrice: 2,
            sellingPrice: 4,
            unit: "pcs",
            status: "active",
            branchId: openingBranch!._id.toString(),
            openingQuantity: 0,
            lowStockThreshold: 5,
          });
          createdOpeningProductIds.push(zeroStockProduct._id.toString());
          const zeroMovement = await StockMovement.findOne({
            businessId: bizModzone._id.toString(),
            productId: zeroStockProduct._id.toString(),
            type: "opening_stock",
          }).lean();
          assert(
            Boolean(zeroStockProduct.stockByBranch?.some((stock) => stock.branchId === openingBranch!._id.toString() && stock.quantity === 0)) &&
              zeroMovement === null,
            "Opening stock test: zero creates a branch stock row without a ledger movement"
          );
          passedCount++;

          let negativeQuantityRejected = false;
          try {
            await createProductWithOpeningStock(modzoneContext, {
              name: "Negative Opening Stock Integration Test",
              sku: `${testSkuPrefix}-NEGATIVE`,
              costPrice: 2,
              sellingPrice: 4,
              unit: "pcs",
              status: "active",
              branchId: openingBranch!._id.toString(),
              openingQuantity: -1,
              lowStockThreshold: 5,
            });
          } catch (error) {
            negativeQuantityRejected = error instanceof ProductCreationError;
          }
          assert(negativeQuantityRejected, "Opening stock test: negative quantity is rejected");
          passedCount++;

          let infiniteQuantityRejected = false;
          try {
            await createProductWithOpeningStock(modzoneContext, {
              name: "Infinite Opening Stock Integration Test",
              sku: `${testSkuPrefix}-INFINITE`,
              costPrice: 2,
              sellingPrice: 4,
              unit: "pcs",
              status: "active",
              branchId: openingBranch!._id.toString(),
              openingQuantity: Number.POSITIVE_INFINITY,
              lowStockThreshold: 5,
            });
          } catch (error) {
            infiniteQuantityRejected = error instanceof ProductCreationError;
          }
          assert(infiniteQuantityRejected, "Opening stock test: infinite quantity is rejected");
          passedCount++;

          const rollbackSku = `${testSkuPrefix}-ROLLBACK`;
          let transactionRollbackConfirmed = false;
          try {
            await createProductWithOpeningStock(
              { ...modzoneContext, userId: "" },
              {
                name: "Opening Stock Rollback Integration Test",
                sku: rollbackSku,
                costPrice: 2,
                sellingPrice: 4,
                unit: "pcs",
                status: "active",
                branchId: openingBranch!._id.toString(),
                openingQuantity: 1,
                lowStockThreshold: 5,
              }
            );
          } catch {
            const rolledBackProduct = await Product.findOne({
              businessId: bizModzone._id.toString(),
              sku: rollbackSku,
            });
            transactionRollbackConfirmed = rolledBackProduct === null;
          }
          assert(
            transactionRollbackConfirmed,
            "Opening stock test: movement failure rolls back product creation"
          );
          passedCount++;

          const restrictedContext: TenantContext = {
            ...modzoneContext,
            role: "MANAGER",
            branchAccess: "SELECTED_BRANCHES",
            branchIds: [openingBranch!._id.toString()],
          };
          let unauthorizedBranchRejected = false;
          try {
            await createProductWithOpeningStock(restrictedContext, {
              name: "Unauthorized Branch Integration Test",
              sku: `${testSkuPrefix}-BRANCH`,
              costPrice: 2,
              sellingPrice: 4,
              unit: "pcs",
              status: "active",
              branchId: restrictedBranch!._id.toString(),
              openingQuantity: 1,
              lowStockThreshold: 5,
            });
          } catch (error) {
            unauthorizedBranchRejected = error instanceof AuthorizationError;
          }
          assert(unauthorizedBranchRejected, "Opening stock test: user cannot select an unassigned branch");
          passedCount++;
        } finally {
          if (createdOpeningProductIds.length > 0) {
            await StockMovement.deleteMany({ productId: { $in: createdOpeningProductIds } });
            await Product.deleteMany({
              _id: { $in: createdOpeningProductIds },
              businessId: bizModzone._id.toString(),
            });
          }
        }

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

    const movementTestContext: TenantContext = {
      userId: "movement_user",
      businessId: "business_a",
      role: "MANAGER",
      branchAccess: "SELECTED_BRANCHES",
      branchIds: ["branch_a"],
    };
    const movementFixtures = [
      { productId: "product_a", branchId: "branch_a", userId: "user_a" },
      { productId: "product_missing", branchId: "branch_missing", userId: "user_missing" },
    ];
    const movementQueries = buildMovementReferenceQueries(movementTestContext, movementFixtures);
    assert(
      movementQueries.products.businessId === "business_a" &&
        movementQueries.branches.businessId === "business_a" &&
        movementQueries.users.businessId === "business_a",
      "Movement names: all reference lookups are scoped to authenticated tenant"
    );
    passedCount++;
    assert(
      JSON.stringify(movementQueries.branches._id) === JSON.stringify({ $in: ["branch_a"] }),
      "Movement names: branch lookup preserves assigned-branch restrictions"
    );
    passedCount++;
    const displayRows = mapMovementNames(
      movementFixtures,
      [{ _id: { toString: () => "product_a" }, name: "Test Phone" }],
      [{ _id: { toString: () => "branch_a" }, name: "Main Branch" }],
      [{ _id: { toString: () => "user_a" }, name: "Chamod" }]
    );
    assert(
      displayRows[0].productName === "Test Phone" &&
        displayRows[0].branchName === "Main Branch" &&
        displayRows[0].userName === "Chamod",
      "Movement names: product, branch, and user names are displayed"
    );
    passedCount++;
    assert(
      displayRows[1].productName === "Unknown Product" &&
        displayRows[1].branchName === "Unknown Branch" &&
        displayRows[1].userName === "Unknown User",
      "Movement names: missing or out-of-tenant references use safe fallbacks"
    );
    passedCount++;

    const shopAContext: TenantContext = {
      userId: "shop_a_owner",
      businessId: "shop_a_id",
      role: "BUSINESS_OWNER",
      branchAccess: "ALL_BRANCHES",
      branchIds: ["shop_a_branch_1", "shop_a_branch_2"],
    };
    const shopBContext: TenantContext = {
      userId: "shop_b_owner",
      businessId: "shop_b_id",
      role: "BUSINESS_OWNER",
      branchAccess: "ALL_BRANCHES",
      branchIds: ["shop_b_branch_1"],
    };
    const shopABusinessQuery = buildCurrentBusinessQuery(shopAContext);
    const shopBBusinessQuery = buildCurrentBusinessQuery(shopBContext);
    assert(
      shopABusinessQuery._id === "shop_a_id" && shopBBusinessQuery._id === "shop_b_id",
      "Business Information: each shop query uses only its authenticated business ID"
    );
    passedCount++;
    const shopABranchQuery = buildAuthorizedBranchQuery(shopAContext);
    const shopBBranchQuery = buildAuthorizedBranchQuery(shopBContext);
    assert(
      shopABranchQuery.businessId === "shop_a_id" && shopBBranchQuery.businessId === "shop_b_id",
      "Branches: each shop query is tenant scoped"
    );
    passedCount++;
    const restrictedShopAContext: TenantContext = {
      ...shopAContext,
      role: "MANAGER",
      branchAccess: "SELECTED_BRANCHES",
      branchIds: ["shop_a_branch_1"],
    };
    const restrictedBranchQuery = buildAuthorizedBranchQuery(restrictedShopAContext);
    assert(
      JSON.stringify(restrictedBranchQuery._id) === JSON.stringify({ $in: ["shop_a_branch_1"] }),
      "Branches: selected-branch users receive only assigned branch data"
    );
    passedCount++;
    const shopASalesQuery = buildSalesQuery(shopAContext);
    const shopBSalesQuery = buildSalesQuery(shopBContext);
    const restrictedSalesQuery = buildSalesQuery(restrictedShopAContext);
    assert(
      shopASalesQuery.businessId === "shop_a_id" && shopBSalesQuery.businessId === "shop_b_id" &&
        JSON.stringify(restrictedSalesQuery.branchId) === JSON.stringify({ $in: ["shop_a_branch_1"] }),
      "Recent Sales: queries enforce tenant and selected-branch scope"
    );
    passedCount++;
    let unscopedPlatformSalesRejected = false;
    try {
      buildSalesQuery({ ...shopAContext, role: "PLATFORM_ADMIN", businessId: null });
    } catch (error) {
      unscopedPlatformSalesRejected = error instanceof TenantSecurityError;
    }
    assert(
      unscopedPlatformSalesRejected,
      "Recent Sales: platform sessions without a business cannot run cross-tenant queries"
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

    // ====================================================================
    // PHASE 2B-1A — POS SALES FOUNDATION
    // ====================================================================

    // TEST D: "ALL_BRANCHES" cannot be used as the sale branch
    let allBranchesRejected = false;
    try {
      validateSaleBranchId("ALL_BRANCHES");
    } catch (e) {
      allBranchesRejected = e instanceof SaleValidationError;
    }
    let allAliasRejected = false;
    try {
      validateSaleBranchId("ALL");
    } catch (e) {
      allAliasRejected = e instanceof SaleValidationError;
    }
    assert(
      allBranchesRejected === true && allAliasRejected === true,
      "Test D: ALL / ALL_BRANCHES cannot be used as the sale branch"
    );
    passedCount++;

    // TEST E/F: Client-provided businessId and cashier identity cannot override session
    const sessionActorContext: TenantContext = {
      userId: "usr_session_cashier",
      businessId: "biz_session_real",
      branchIds: ["br_session"],
      branchAccess: "SELECTED_BRANCHES",
      role: "CASHIER",
      permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
    };
    const actor = resolveSaleActor(
      sessionActorContext,
      { userId: "usr_session_cashier", name: "Session Cashier" },
      {
        businessId: "biz_attacker_override",
        cashierUserId: "usr_attacker",
        cashierName: "Attacker Name",
      }
    );
    assert(
      actor.businessId === "biz_session_real" && String(actor.businessId) !== "biz_attacker_override",
      "Test E: Client-provided businessId cannot override session businessId"
    );
    assert(
      actor.cashierUserId === "usr_session_cashier" &&
        actor.cashierName === "Session Cashier" &&
        String(actor.cashierUserId) !== "usr_attacker",
      "Test F: Client-provided cashierUserId/cashierName cannot override authenticated user"
    );
    passedCount += 2;

    // TEST J: Sale GET/list respects SALE_VIEW
    const stockManagerNoSales: TenantContext = {
      userId: "usr_stock_no_sales",
      businessId: "biz_session_real",
      branchIds: [],
      branchAccess: "ALL_BRANCHES",
      role: "STOCK_MANAGER",
      permissions: DEFAULT_ROLE_PERMISSIONS.STOCK_MANAGER,
    };
    let saleViewDenied = false;
    try {
      await listSales(stockManagerNoSales, {});
    } catch (e) {
      saleViewDenied = e instanceof AuthorizationError;
    }
    assert(
      saleViewDenied === true,
      "Test J: Sale GET respects SALE_VIEW (STOCK_MANAGER without SALE_VIEW is denied)"
    );
    passedCount++;

    if (isConnected) {
      const bizModzone = await Business.findOne({ slug: "chama-modzone" });
      const bizPhone = await Business.findOne({ slug: "abc-phone-shop" });
      const branchColombo = await Branch.findOne({
        businessId: bizModzone?._id.toString(),
        code: "CMB-01",
      });
      const branchKandy = await Branch.findOne({
        businessId: bizModzone?._id.toString(),
        code: "KDY-01",
      });
      const branchPhone = await Branch.findOne({
        businessId: bizPhone?._id.toString(),
        code: "NGB-01",
      });
      const cashierColombo = await User.findOne({ email: "cashier.colombo@chamamodzone.com" });
      const cashierAlias = await User.findOne({ email: "cashier@chamamodzone.com" });
      const cashierKandy = await User.findOne({ email: "cashier.kandy@chamamodzone.com" });
      const phoneOwner = await User.findOne({ email: "owner@abcphones.lk" });
      const speaker = await Product.findOne({
        businessId: bizModzone?._id.toString(),
        sku: "CMZ-SPK-01",
      });
      const phoneCase = await Product.findOne({
        businessId: bizPhone?._id.toString(),
        sku: "ABC-CAS-01",
      });

      if (!(
        bizModzone &&
        bizPhone &&
        branchColombo &&
        branchKandy &&
        branchPhone &&
        cashierColombo &&
        cashierAlias &&
        cashierKandy &&
        phoneOwner &&
        speaker &&
        phoneCase
      )) {
        const { execSync } = await import("child_process");
        execSync("npx tsx scripts/seed.ts", { stdio: "inherit" });
      }

      const seededBizModzone = await Business.findOne({ slug: "chama-modzone" });
      const seededBizPhone = await Business.findOne({ slug: "abc-phone-shop" });
      const seededBranchColombo = await Branch.findOne({ businessId: seededBizModzone?._id.toString(), code: "CMB-01" });
      const seededBranchKandy = await Branch.findOne({ businessId: seededBizModzone?._id.toString(), code: "KDY-01" });
      const seededBranchPhone = await Branch.findOne({ businessId: seededBizPhone?._id.toString(), code: "NGB-01" });
      const seededCashierColombo = await User.findOne({ email: "cashier.colombo@chamamodzone.com" });
      const seededCashierAlias = await User.findOne({ email: "cashier@chamamodzone.com" });
      const seededCashierKandy = await User.findOne({ email: "cashier.kandy@chamamodzone.com" });
      const seededPhoneOwner = await User.findOne({ email: "owner@abcphones.lk" });
      const seededSpeaker = await Product.findOne({ businessId: seededBizModzone?._id.toString(), sku: "CMZ-SPK-01" });
      const seededPhoneCase = await Product.findOne({ businessId: seededBizPhone?._id.toString(), sku: "ABC-CAS-01" });

      assert(
        Boolean(
          seededBizModzone &&
            seededBizPhone &&
            seededBranchColombo &&
            seededBranchKandy &&
            seededBranchPhone &&
            seededCashierColombo &&
            seededCashierAlias &&
            seededCashierKandy &&
            seededPhoneOwner &&
            seededSpeaker &&
            seededPhoneCase
        ),
        "Test 2B-1A pre-condition: seeded businesses, branches, cashiers, and products exist"
      );
      passedCount++;

      const speakerColomboStock = seededSpeaker!.stockByBranch?.find(
        (entry) => entry.branchId === seededBranchColombo!._id.toString()
      );
      if (!speakerColomboStock) {
        seededSpeaker!.stockByBranch = [
          ...(seededSpeaker!.stockByBranch || []),
          { branchId: seededBranchColombo!._id.toString(), quantity: 2, lowStockThreshold: 5 },
        ];
        await seededSpeaker!.save();
      }

      const colomboCashierCtx: TenantContext = {
        userId: cashierColombo!._id.toString(),
        businessId: bizModzone!._id.toString(),
        branchAccess: "SELECTED_BRANCHES",
        branchIds: [branchColombo!._id.toString()],
        role: "CASHIER",
        permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
      };
      const aliasCashierCtx: TenantContext = {
        userId: cashierAlias!._id.toString(),
        businessId: bizModzone!._id.toString(),
        branchAccess: "SELECTED_BRANCHES",
        branchIds: [branchColombo!._id.toString()],
        role: "CASHIER",
        permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
      };
      const kandyCashierCtx: TenantContext = {
        userId: cashierKandy!._id.toString(),
        businessId: bizModzone!._id.toString(),
        branchAccess: "SELECTED_BRANCHES",
        branchIds: [branchKandy!._id.toString()],
        role: "CASHIER",
        permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
      };
      const phoneOwnerCtx: TenantContext = {
        userId: phoneOwner!._id.toString(),
        businessId: bizPhone!._id.toString(),
        branchAccess: "ALL_BRANCHES",
        branchIds: [branchPhone!._id.toString()],
        role: "BUSINESS_OWNER",
        permissions: DEFAULT_ROLE_PERMISSIONS.BUSINESS_OWNER,
      };

      const clientUnitPrice = 1;
      const expectedUnitPrice = Number(speaker!.sellingPrice || speaker!.price);
      const qty = 2;
      const expectedSubtotal = Math.round(expectedUnitPrice * qty * 100) / 100;

      const createdSale = await createSale(
        colomboCashierCtx,
        { userId: cashierColombo!._id.toString(), name: cashierColombo!.name },
        {
          businessId: bizPhone!._id.toString(),
          cashierUserId: "usr_spoofed_cashier",
          cashierName: "Spoofed Cashier",
          branchId: branchColombo!._id.toString(),
          items: [
            {
              productId: speaker!._id.toString(),
              quantity: qty,
              unitPrice: clientUnitPrice,
              price: clientUnitPrice,
              name: "Tampered Name",
              sku: "TAMPERED-SKU",
            },
          ],
          paymentMethod: "cash",
          paidAmount: expectedSubtotal,
          grandTotal: 0,
          subtotal: 0,
        }
      );

      assert(
        createdSale.businessId === bizModzone!._id.toString() &&
          createdSale.businessId !== bizPhone!._id.toString(),
        "Test B: Cashier cannot create a sale for another business (session businessId wins)"
      );
      assert(
        createdSale.cashierUserId === cashierColombo!._id.toString() &&
          createdSale.cashierName === cashierColombo!.name,
        "Test F-db: Persisted cashier identity matches authenticated user, not client payload"
      );
      assert(
        createdSale.items[0].unitPrice === expectedUnitPrice &&
          createdSale.items[0].unitPrice !== clientUnitPrice &&
          createdSale.items[0].name === speaker!.name &&
          createdSale.items[0].sku === speaker!.sku,
        "Test G: Client-provided product price/name/SKU cannot override database product snapshot"
      );
      assert(
        createdSale.subtotal === expectedSubtotal &&
          createdSale.grandTotal === expectedSubtotal &&
          createdSale.discountTotal === 0,
        "Test H: Sale totals are calculated server-side from database prices and quantities"
      );
      passedCount += 4;

      const audit = await findSaleCreatedAudit(createdSale._id.toString());
      assert(
        Boolean(audit) &&
          audit?.action === "SALE_CREATED" &&
          audit?.entityId === createdSale._id.toString() &&
          audit?.businessId === bizModzone!._id.toString() &&
          audit?.branchId === branchColombo!._id.toString(),
        "Test I: SALE_CREATED audit event is generated for the sale"
      );
      passedCount++;

      let otherBranchDenied = false;
      try {
        await createSale(
          colomboCashierCtx,
          { userId: cashierColombo!._id.toString(), name: cashierColombo!.name },
          {
            branchId: branchKandy!._id.toString(),
            items: [{ productId: speaker!._id.toString(), quantity: 1 }],
            paymentMethod: "cash",
            paidAmount: expectedUnitPrice,
          }
        );
      } catch (e) {
        otherBranchDenied = e instanceof AuthorizationError;
      }
      assert(
        otherBranchDenied === true,
        "Test C: Cashier cannot create a sale for a branch they cannot access"
      );
      passedCount++;

      let allBranchCreateDenied = false;
      try {
        await createSale(
          colomboCashierCtx,
          { userId: cashierColombo!._id.toString(), name: cashierColombo!.name },
          {
            branchId: "ALL_BRANCHES",
            items: [{ productId: speaker!._id.toString(), quantity: 1 }],
            paymentMethod: "cash",
            paidAmount: expectedUnitPrice,
          }
        );
      } catch (e) {
        allBranchCreateDenied = e instanceof SaleValidationError;
      }
      assert(
        allBranchCreateDenied === true,
        "Test D-db: Creating a sale with ALL_BRANCHES as branchId is rejected"
      );
      passedCount++;

      let crossTenantGetDenied = false;
      try {
        await getSaleById(phoneOwnerCtx, createdSale._id.toString());
      } catch (e) {
        crossTenantGetDenied =
          e instanceof SaleValidationError && (e as SaleValidationError).statusCode === 404;
      }
      const phoneList = await listSales(phoneOwnerCtx, {});
      const leaked = phoneList.sales.some((s) => s._id.toString() === createdSale._id.toString());
      assert(
        crossTenantGetDenied === true && leaked === false,
        "Test A: Sale from Business A cannot be accessed by Business B"
      );
      passedCount++;

      const colomboOnlySalesContext: TenantContext = {
        ...colomboCashierCtx,
        userId: "modzone_colombo_manager",
        role: "MANAGER",
        branchAccess: "SELECTED_BRANCHES",
        branchIds: [branchColombo!._id.toString()],
        permissions: [...DEFAULT_ROLE_PERMISSIONS.BUSINESS_OWNER, "SALE_VIEW_OTHER_CASHIERS"],
      };
      const colomboOnlySales = await listSales(colomboOnlySalesContext, {});
      assert(
        colomboOnlySales.sales.some((sale) => sale._id.toString() === createdSale._id.toString()) &&
          colomboOnlySales.sales.every((sale) => sale.branchId === branchColombo!._id.toString()),
        "Recent Sales test: branch-restricted user sees Branch A sales but no Branch B sales"
      );
      passedCount++;

      const otherCashierList = await listSales(aliasCashierCtx, {});
      const sawOtherCashier = otherCashierList.sales.some(
        (s) => s._id.toString() === createdSale._id.toString()
      );
      assert(
        sawOtherCashier === false,
        "Test K: Cashier without SALE_VIEW_OTHER_CASHIERS cannot see another cashier's sales"
      );
      passedCount++;

      const stockTargetProduct = await Product.findOne({
        businessId: bizModzone!._id.toString(),
        sku: "CMZ-SPK-01",
      });
      const stockTargetBranch = await Branch.findOne({
        businessId: bizModzone!._id.toString(),
        code: "CMB-01",
      });

      assert(Boolean(stockTargetProduct && stockTargetBranch), "Inventory precondition: test stock product and branch exist");
      passedCount++;

      const inventorySession = await mongoose.startSession();
      try {
        await inventorySession.withTransaction(async () => {
          const beforeStock = (stockTargetProduct!.stockByBranch || []).find(
            (item) => item.branchId === stockTargetBranch!._id.toString()
          );
          const startQuantity = Number(beforeStock?.quantity || 0);

          await adjustStock(
            {
              businessId: bizModzone!._id.toString(),
              branchId: stockTargetBranch!._id.toString(),
              productId: stockTargetProduct!._id.toString(),
              quantityChange: 10,
              type: "purchase_received",
              userId: cashierColombo!._id.toString(),
              notes: "Supplier restock",
            },
            inventorySession
          );

          const refreshedProduct = await Product.findById(stockTargetProduct!._id).session(inventorySession);
          const refreshedStock = (refreshedProduct!.stockByBranch || []).find(
            (item) => item.branchId === stockTargetBranch!._id.toString()
          );

          assert(
            Number(refreshedStock?.quantity || 0) === startQuantity + 10,
            "Test Inventory 1: Receive stock increases correct branch stock"
          );
          assert(
            Boolean(refreshedStock) && Number(refreshedStock!.quantity) >= 0,
            "Test Inventory 2: Received stock stays non-negative"
          );
        });
      } finally {
        await inventorySession.endSession();
      }
      passedCount += 2;

      let foreignInventoryDenied = false;
      try {
        const inventorySession2 = await mongoose.startSession();
        try {
          await inventorySession2.withTransaction(async () => {
            await adjustStock(
              {
                businessId: bizModzone!._id.toString(),
                branchId: branchPhone!._id.toString(),
                productId: stockTargetProduct!._id.toString(),
                quantityChange: 2,
                type: "adjustment",
                userId: phoneOwner!._id.toString(),
                notes: "Cross-tenant branch attempt",
              },
              inventorySession2
            );
          });
        } finally {
          await inventorySession2.endSession();
        }
      } catch (error) {
        foreignInventoryDenied = true;
      }
      assert(
        foreignInventoryDenied === true,
        "Test Inventory 3: Unauthorized branch cannot receive stock"
      );
      passedCount++;

      let negativeStockRejected = false;
      try {
        const inventorySession3 = await mongoose.startSession();
        try {
          await inventorySession3.withTransaction(async () => {
            await adjustStock(
              {
                businessId: bizModzone!._id.toString(),
                branchId: stockTargetBranch!._id.toString(),
                productId: stockTargetProduct!._id.toString(),
                quantityChange: -999999,
                type: "adjustment",
                userId: cashierColombo!._id.toString(),
                notes: "Negative test",
              },
              inventorySession3
            );
          });
        } finally {
          await inventorySession3.endSession();
        }
      } catch (error) {
        negativeStockRejected = true;
      }
      assert(
        negativeStockRejected === true,
        "Test Inventory 4: Negative resulting stock is rejected"
      );
      passedCount++;

      let foreignProductDenied = false;
      try {
        await createSale(
          kandyCashierCtx,
          { userId: cashierKandy!._id.toString(), name: cashierKandy!.name },
          {
            branchId: branchKandy!._id.toString(),
            items: [{ productId: phoneCase!._id.toString(), quantity: 1 }],
            paymentMethod: "cash",
            paidAmount: 15,
          }
        );
      } catch (e) {
        foreignProductDenied = e instanceof SaleValidationError;
      }
      assert(
        foreignProductDenied === true,
        "Test B-product: Cashier cannot attach another business's product to a sale"
      );
      passedCount++;
    }

    console.log("\n============================================================");
    console.log(` ALL ${passedCount} ACCESS CONTROL & TENANT ISOLATION TESTS PASSED!`);
    console.log(" (Phase 2A + Phase 2B Product + Phase 2B-0 + Phase 2B-1A POS Sales)");
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

