import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToDatabase } from "../lib/db/connection";
import { Business } from "../models/Business";
import { Branch } from "../models/Branch";
import { User } from "../models/User";
import { Product } from "../models/Product";
import { AuditLog } from "../models/AuditLog";
import { hashPassword } from "../lib/auth/password";
import { DEFAULT_ROLE_PERMISSIONS } from "../types";

// Load .env.local manually if running outside Next.js runtime
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

const DEV_SEED_PASSWORD = "ChamaDev@2026!";

async function seed() {
  console.log("\n============================================================");
  console.log(" CHAMA POS - DEVELOPMENT SEED SCRIPT (PHASE 2B-0)");
  console.log(" WARNING: FOR LOCAL / STAGING DEVELOPMENT ONLY.");
  console.log(" NEVER RUN OR DEPLOY THIS SCRIPT IN PRODUCTION.");
  console.log("============================================================\n");

  if (process.env.NODE_ENV === "production") {
    console.error("CRITICAL SAFETY CHECK: Cannot run seed script in production!");
    process.exit(1);
  }

  try {
    console.log("Connecting to MongoDB Atlas / Database...");
    await connectToDatabase();
    console.log("Connected successfully.\n");

    // Clear existing development seed collections
    console.log("Cleaning existing seed documents...");
    await Promise.all([
      Business.deleteMany({}),
      Branch.deleteMany({}),
      User.deleteMany({}),
      Product.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);
    console.log("Cleaned.\n");

    const sharedPasswordHash = await hashPassword(DEV_SEED_PASSWORD);

    // ========================================================================
    // 1. BUSINESS: Chama Modzone (Car Accessories) - Multi-Branch Demonstration
    // ========================================================================
    console.log("1. Seeding Business: Chama Modzone (Car Accessories)...");
    const bizModzone = await Business.create({
      name: "Chama Modzone",
      slug: "chama-modzone",
      businessType: "Car Accessories",
      industry: "car_accessories",
      status: "active",
      email: "owner@chamamodzone.com",
      phone: "+94 11 234 5678",
      address: {
        street: "142 Galle Road",
        city: "Colombo",
        state: "Western",
        postalCode: "00300",
        country: "Sri Lanka",
      },
      subscriptionTier: "BUSINESS",
      subscriptionStatus: "active",
    });

    // Branch 1: Colombo Flagship
    const branchColombo = await Branch.create({
      businessId: bizModzone._id.toString(),
      name: "Colombo Main Flagship",
      code: "CMB-01",
      phone: "+94 11 234 5678",
      status: "active",
      isMain: true,
      address: {
        street: "142 Galle Road",
        city: "Colombo",
        state: "Western",
      },
    });

    // Branch 2: Kandy Branch
    const branchKandy = await Branch.create({
      businessId: bizModzone._id.toString(),
      name: "Kandy Express Branch",
      code: "KDY-01",
      phone: "+94 81 234 5678",
      status: "active",
      isMain: false,
      address: {
        street: "75 Dalada Veediya",
        city: "Kandy",
        state: "Central",
      },
    });

    // Business Owner: Kasun Perera (All Branches access)
    const modzoneOwner = await User.create({
      businessId: bizModzone._id.toString(),
      branchAccess: "ALL_BRANCHES",
      branchIds: [branchColombo._id.toString(), branchKandy._id.toString()],
      name: "Kasun Perera",
      username: "kasun.owner",
      email: "owner@chamamodzone.com",
      passwordHash: sharedPasswordHash,
      role: "BUSINESS_OWNER",
      permissions: DEFAULT_ROLE_PERMISSIONS.BUSINESS_OWNER,
      status: "ACTIVE",
    });

    // Manager - Colombo: Kamal Silva
    const managerColombo = await User.create({
      businessId: bizModzone._id.toString(),
      branchAccess: "SELECTED_BRANCHES",
      branchIds: [branchColombo._id.toString()],
      assignedBranchIds: [branchColombo._id.toString()],
      name: "Kamal Silva",
      username: "kamal.colombo",
      email: "manager.colombo@chamamodzone.com",
      passwordHash: sharedPasswordHash,
      role: "MANAGER",
      permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER,
      status: "ACTIVE",
    });

    // Manager - Kandy: Nimal Jayawardena
    const managerKandy = await User.create({
      businessId: bizModzone._id.toString(),
      branchAccess: "SELECTED_BRANCHES",
      branchIds: [branchKandy._id.toString()],
      assignedBranchIds: [branchKandy._id.toString()],
      name: "Nimal Jayawardena",
      username: "nimal.kandy",
      email: "manager.kandy@chamamodzone.com",
      passwordHash: sharedPasswordHash,
      role: "MANAGER",
      permissions: DEFAULT_ROLE_PERMISSIONS.MANAGER,
      status: "ACTIVE",
    });

    // Cashier - Colombo: Dinesh Fernando
    const cashierColombo = await User.create({
      businessId: bizModzone._id.toString(),
      branchAccess: "SELECTED_BRANCHES",
      branchIds: [branchColombo._id.toString()],
      assignedBranchIds: [branchColombo._id.toString()],
      name: "Dinesh Fernando",
      username: "dinesh.colombo",
      email: "cashier.colombo@chamamodzone.com",
      passwordHash: sharedPasswordHash,
      role: "CASHIER",
      permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
      status: "ACTIVE",
    });

    // Legacy Cashier alias account for backward compatibility with previous scripts
    await User.create({
      businessId: bizModzone._id.toString(),
      branchAccess: "SELECTED_BRANCHES",
      branchIds: [branchColombo._id.toString()],
      assignedBranchIds: [branchColombo._id.toString()],
      name: "Dinesh Fernando (Alias)",
      username: "dinesh.cashier",
      email: "cashier@chamamodzone.com",
      passwordHash: sharedPasswordHash,
      role: "CASHIER",
      permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
      status: "ACTIVE",
    });

    // Cashier - Kandy: Ruwan Bandara
    const cashierKandy = await User.create({
      businessId: bizModzone._id.toString(),
      branchAccess: "SELECTED_BRANCHES",
      branchIds: [branchKandy._id.toString()],
      assignedBranchIds: [branchKandy._id.toString()],
      name: "Ruwan Bandara",
      username: "ruwan.kandy",
      email: "cashier.kandy@chamamodzone.com",
      passwordHash: sharedPasswordHash,
      role: "CASHIER",
      permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
      status: "ACTIVE",
    });

    bizModzone.ownerUserId = modzoneOwner._id.toString();
    await bizModzone.save();

    await Product.create([
      {
        businessId: bizModzone._id.toString(),
        name: "Car Speaker - Pioneer 6.5\" 2-Way",
        sku: "CMZ-SPK-01",
        barcode: "8901234001",
        price: 79.0,
        costPrice: 45.0,
        status: "active",
        brand: "Pioneer",
        industryAttributes: {
          brand: "Pioneer",
          warrantyMonths: 12,
        },
      },
      {
        businessId: bizModzone._id.toString(),
        name: "Amplifier - Alpine 4-Channel 600W",
        sku: "CMZ-AMP-02",
        barcode: "8901234002",
        price: 240.0,
        costPrice: 160.0,
        status: "active",
        brand: "Alpine",
        industryAttributes: {
          brand: "Alpine",
          warrantyMonths: 24,
        },
      },
      {
        businessId: bizModzone._id.toString(),
        name: "LED Headlight - Philips Ultinon Pro H4",
        sku: "CMZ-LED-03",
        barcode: "8901234003",
        price: 115.0,
        costPrice: 70.0,
        status: "active",
        brand: "Philips",
        industryAttributes: {
          brand: "Philips",
          partNumber: "H4-LED-PRO",
        },
      },
    ]);
    console.log("   -> Chama Modzone seeded with 2 Branches (Colombo, Kandy), 6 Users, 3 Products.\n");

    // ========================================================================
    // 2. BUSINESS: ABC Phone Shop (Phone Shop)
    // ========================================================================
    console.log("2. Seeding Business: ABC Phone Shop (Phone Shop)...");
    const bizPhone = await Business.create({
      name: "ABC Phone Shop",
      slug: "abc-phone-shop",
      businessType: "Phone Shop",
      industry: "phones_electronics",
      status: "active",
      email: "owner@abcphones.lk",
      phone: "+94 31 456 7890",
      address: {
        street: "88 Main Street",
        city: "Negombo",
        state: "Western",
        postalCode: "11500",
        country: "Sri Lanka",
      },
      subscriptionTier: "BUSINESS",
      subscriptionStatus: "active",
    });

    const branchPhone = await Branch.create({
      businessId: bizPhone._id.toString(),
      name: "Negombo Tech Hub",
      code: "NGB-01",
      phone: "+94 31 456 7890",
      status: "active",
      isMain: true,
      address: {
        street: "88 Main Street",
        city: "Negombo",
      },
    });

    const phoneOwner = await User.create({
      businessId: bizPhone._id.toString(),
      branchAccess: "ALL_BRANCHES",
      branchIds: [branchPhone._id.toString()],
      name: "Rohan De Silva",
      username: "rohan.owner",
      email: "owner@abcphones.lk",
      passwordHash: sharedPasswordHash,
      role: "BUSINESS_OWNER",
      permissions: DEFAULT_ROLE_PERMISSIONS.BUSINESS_OWNER,
      status: "ACTIVE",
    });

    await User.create({
      businessId: bizPhone._id.toString(),
      branchAccess: "SELECTED_BRANCHES",
      branchIds: [branchPhone._id.toString()],
      name: "Kamal Wickrama",
      username: "kamal.cashier",
      email: "cashier@abcphones.lk",
      passwordHash: sharedPasswordHash,
      role: "CASHIER",
      permissions: DEFAULT_ROLE_PERMISSIONS.CASHIER,
      status: "ACTIVE",
    });

    bizPhone.ownerUserId = phoneOwner._id.toString();
    await bizPhone.save();

    await Product.create([
      {
        businessId: bizPhone._id.toString(),
        name: "Phone Case - MagSafe Matte Black",
        sku: "ABC-CAS-01",
        barcode: "7809876001",
        price: 15.0,
        costPrice: 5.0,
        status: "active",
        brand: "Spigen",
      },
      {
        businessId: bizPhone._id.toString(),
        name: "USB Cable - Anker 60W Type-C Braided",
        sku: "ABC-CAB-02",
        barcode: "7809876002",
        price: 12.0,
        costPrice: 3.5,
        status: "active",
        brand: "Anker",
      },
      {
        businessId: bizPhone._id.toString(),
        name: "Screen Protector - 9H HD Glass (2-Pack)",
        sku: "ABC-SCR-03",
        barcode: "7809876003",
        price: 10.0,
        costPrice: 2.0,
        status: "active",
      },
    ]);
    console.log("   -> ABC Phone Shop seeded with 1 Branch, 2 Users, 3 Products.\n");

    // ========================================================================
    // 3. BUSINESS: XYZ Clothing (Clothing)
    // ========================================================================
    console.log("3. Seeding Business: XYZ Clothing (Clothing)...");
    const bizClothing = await Business.create({
      name: "XYZ Clothing",
      slug: "xyz-clothing",
      businessType: "Clothing",
      industry: "clothing_fashion",
      status: "active",
      email: "owner@xyzclothing.com",
      phone: "+94 81 765 4321",
      address: {
        street: "12 Peradeniya Road",
        city: "Kandy",
        state: "Central",
        postalCode: "20000",
        country: "Sri Lanka",
      },
      subscriptionTier: "STARTER",
      subscriptionStatus: "active",
    });

    const branchClothing = await Branch.create({
      businessId: bizClothing._id.toString(),
      name: "Kandy Boutique",
      code: "KDY-01",
      phone: "+94 81 765 4321",
      status: "active",
      isMain: true,
      address: {
        street: "12 Peradeniya Road",
        city: "Kandy",
      },
    });

    const clothingOwner = await User.create({
      businessId: bizClothing._id.toString(),
      branchAccess: "ALL_BRANCHES",
      branchIds: [branchClothing._id.toString()],
      name: "Anura Jayasuriya",
      username: "anura.owner",
      email: "owner@xyzclothing.com",
      passwordHash: sharedPasswordHash,
      role: "BUSINESS_OWNER",
      permissions: DEFAULT_ROLE_PERMISSIONS.BUSINESS_OWNER,
      status: "ACTIVE",
    });

    bizClothing.ownerUserId = clothingOwner._id.toString();
    await bizClothing.save();

    await Product.create([
      {
        businessId: bizClothing._id.toString(),
        name: "T-Shirt - Premium Heavyweight Crewneck",
        sku: "XYZ-TSH-01",
        barcode: "6504321001",
        price: 25.0,
        costPrice: 11.0,
        status: "active",
        industryAttributes: {
          size: "L",
          color: "Navy Blue",
          material: "Cotton",
        },
      },
      {
        businessId: bizClothing._id.toString(),
        name: "Jeans - Slim Fit Stretch Denim 32x30",
        sku: "XYZ-JEA-02",
        barcode: "6504321002",
        price: 55.0,
        costPrice: 24.0,
        status: "active",
        industryAttributes: {
          size: "32x30",
          color: "Vintage Indigo",
          material: "Denim",
        },
      },
      {
        businessId: bizClothing._id.toString(),
        name: "Cap - Embroidered 6-Panel Snapback",
        sku: "XYZ-CAP-03",
        barcode: "6504321003",
        price: 18.0,
        costPrice: 7.0,
        status: "active",
        industryAttributes: {
          color: "Charcoal",
        },
      },
    ]);
    console.log("   -> XYZ Clothing seeded with 1 Branch, 1 User, 3 Products.\n");

    // ========================================================================
    // 4. PLATFORM OWNER / ADMIN: Platform Superadmin
    // ========================================================================
    console.log("4. Seeding SaaS Platform Owner (PLATFORM_OWNER)...");
    await User.create({
      businessId: null, // Universal platform administration rights
      branchAccess: "ALL_BRANCHES",
      branchIds: [],
      name: "Chama Platform Owner",
      username: "platform.admin",
      email: "admin@chamapos.com",
      passwordHash: sharedPasswordHash,
      role: "PLATFORM_OWNER",
      permissions: DEFAULT_ROLE_PERMISSIONS.PLATFORM_OWNER,
      status: "ACTIVE",
    });
    console.log("   -> Platform Owner created (admin@chamapos.com).\n");

    console.log("============================================================");
    console.log(" SEED COMPLETED SUCCESSFULLY!");
    console.log("============================================================");
    console.log("\nDEVELOPMENT TEST CREDENTIALS (PASSWORD FOR ALL: ChamaDev@2026!):");
    console.log("------------------------------------------------------------");
    console.log("1. Chama Modzone (Car Accessories):");
    console.log("   - Owner:             owner@chamamodzone.com          (Role: BUSINESS_OWNER | All Branches)");
    console.log("   - Manager (Colombo): manager.colombo@chamamodzone.com(Role: MANAGER | Colombo only)");
    console.log("   - Manager (Kandy):   manager.kandy@chamamodzone.com  (Role: MANAGER | Kandy only)");
    console.log("   - Cashier (Colombo): cashier.colombo@chamamodzone.com(Role: CASHIER | Colombo only)");
    console.log("   - Cashier (Kandy):   cashier.kandy@chamamodzone.com  (Role: CASHIER | Kandy only)");
    console.log("\n2. ABC Phone Shop (Phone Shop):");
    console.log("   - Owner:             owner@abcphones.lk              (Role: BUSINESS_OWNER)");
    console.log("   - Cashier:           cashier@abcphones.lk            (Role: CASHIER)");
    console.log("\n3. XYZ Clothing (Clothing Retail):");
    console.log("   - Owner:             owner@xyzclothing.com           (Role: BUSINESS_OWNER)");
    console.log("\n4. SaaS Platform Owner Console:");
    console.log("   - Owner:             admin@chamapos.com              (Role: PLATFORM_OWNER)");
    console.log("============================================================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed script failed with error:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
