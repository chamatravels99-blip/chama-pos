import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { Business } from "@/models/Business";
import { Branch } from "@/models/Branch";
import { connectToDatabase } from "@/lib/db/connection";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session-constants";
import {
  SessionPayload,
  TenantContext,
  UserRole,
  StandardPermission,
  DEFAULT_ROLE_PERMISSIONS,
} from "@/types";

export { SESSION_COOKIE_NAME } from "@/lib/auth/session-constants";
export const SELECTED_BUSINESS_COOKIE_NAME = "chama_selected_business";
export const ACTIVE_BRANCH_COOKIE_NAME = "chama_active_branch";
const SESSION_EXPIRATION_TIME = "7d";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Returns secret key formatted for jose operations.
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: NEXTAUTH_SECRET environment variable is missing in production!");
    }
    return new TextEncoder().encode("chama_pos_local_development_fallback_secret_32bytes");
  }
  return new TextEncoder().encode(secret);
}

export class AuthenticationError extends Error {
  constructor(message: string = "Authentication required.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = "Forbidden: Insufficient permissions.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Encrypts and signs session payload into a compact JWT.
 */
export async function signSessionToken(payload: SessionPayload): Promise<string> {
  const secret = getSecretKey();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION_TIME)
    .sign(secret);
}

/**
 * Verifies and decodes a signed session token.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Sets secure HTTP-only session cookie on the server.
 */
export async function createSession(payload: SessionPayload): Promise<string> {
  const token = await signSessionToken(payload);
  const cookieStore = cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  cookieStore.delete(SELECTED_BUSINESS_COOKIE_NAME);
  cookieStore.delete(ACTIVE_BRANCH_COOKIE_NAME);

  return token;
}

/**
 * Retrieves the current session from HTTP-only cookie.
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  return verifySessionToken(sessionCookie.value);
}

/**
 * Invalidates and removes the session cookie.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(SELECTED_BUSINESS_COOKIE_NAME);
  cookieStore.delete(ACTIVE_BRANCH_COOKIE_NAME);
}

/**
 * Server-side guard requiring an authenticated user.
 * Throws an AuthenticationError if unauthenticated.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !session.userId) {
    throw new AuthenticationError("User is not authenticated. Please log in.");
  }
  return session;
}

/**
 * Checks if a given role is a platform-level administrator.
 */
export function isPlatformRole(role: UserRole): boolean {
  return role === "PLATFORM_OWNER" || role === "PLATFORM_ADMIN" || role === "SUPER_ADMIN";
}

/**
 * Server-side role guard requiring one of the specified roles.
 * PLATFORM_OWNER/PLATFORM_ADMIN possesses universal platform administration rights.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionPayload> {
  const session = await requireAuth();

  const isPlatform = isPlatformRole(session.role);
  const isAllowed =
    allowedRoles.includes(session.role) ||
    (isPlatform && (allowedRoles.includes("PLATFORM_OWNER") || allowedRoles.includes("PLATFORM_ADMIN") || allowedRoles.includes("SUPER_ADMIN")));

  if (!isAllowed) {
    throw new AuthorizationError(
      `Access denied. Role "${session.role}" lacks required permissions (${allowedRoles.join(", ")}).`
    );
  }

  return session;
}

/**
 * Checks if a user/session has a specific permission.
 */
export function hasPermission(
  session: { role: UserRole; permissions?: string[] } | null | undefined,
  permission: StandardPermission | string
): boolean {
  if (!session) return false;

  const role = session.role;
  if (isPlatformRole(role)) {
    return true;
  }
  if (role === "BUSINESS_OWNER") {
    return true;
  }

  // Check explicit assigned permissions
  if (Array.isArray(session.permissions) && session.permissions.length > 0) {
    if (session.permissions.includes(permission)) return true;

    // Legacy backward-compatibility alias mapping
    const legacyMap: Record<string, string> = {
      "PRODUCT_VIEW": "products:read",
      "PRODUCT_CREATE": "products:create",
      "PRODUCT_EDIT": "products:update",
      "PRODUCT_DELETE": "products:delete",
      "USER_VIEW": "users:manage",
      "USER_CREATE": "users:manage",
      "USER_EDIT": "users:manage",
      "USER_DISABLE": "users:manage",
      "BRANCH_VIEW": "branches:manage",
      "BRANCH_CREATE": "branches:manage",
      "BRANCH_EDIT": "branches:manage",
      "STOCK_VIEW": "inventory:read",
      "STOCK_ADD": "inventory:adjust",
      "STOCK_ADJUST": "inventory:adjust",
      "STOCK_TRANSFER": "inventory:transfer",
      "REPORT_VIEW": "reports:view_sales",
    };

    if (legacyMap[permission] && session.permissions.includes(legacyMap[permission])) {
      return true;
    }
  }

  // Fall back to default role permissions
  const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
  return (defaultPerms as string[]).includes(permission);
}

/**
 * Server-side guard requiring a specific permission.
 * Throws an AuthorizationError if the authenticated user lacks this permission.
 */
export async function requirePermission(permission: StandardPermission | string): Promise<SessionPayload> {
  const session = await requireAuth();

  if (!hasPermission(session, permission)) {
    throw new AuthorizationError(
      `Forbidden: Lacks required permission "${permission}".`
    );
  }

  return session;
}

/**
 * Reusable server-side helper to extract and validate TenantContext.
 * Guaranteed to derive businessId directly from the verified session.
 * Never trust a businessId supplied by the browser/client.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const session = await requireAuth();

  const isPlatform = isPlatformRole(session.role);

  if (!isPlatform && !session.businessId) {
    throw new AuthorizationError(
      "TenantContext Error: Non-admin user is not associated with any active business/tenant."
    );
  }

  return {
    userId: session.userId,
    username: session.username,
    businessId: session.businessId,
    branchAccess: session.branchAccess || (session.role === "BUSINESS_OWNER" ? "ALL_BRANCHES" : "SELECTED_BRANCHES"),
    branchIds: session.branchIds || [],
    role: session.role,
    permissions: session.permissions || [],
    businessSlug: session.businessSlug,
    businessName: session.businessName,
    activeBranchId: session.activeBranchId,
  };
}

/**
 * Resolves the tenant selected by a platform user without changing the platform session.
 * Selection cookies are only hints: the user role, active business, and branch access
 * are revalidated against the database before they enter an effective tenant context.
 */
export async function getEffectiveTenantContext(): Promise<TenantContext> {
  const context = await getTenantContext();
  const cookieStore = cookies();
  const isPlatform = isPlatformRole(context.role);
  const requestedBusinessId = cookieStore.get(SELECTED_BUSINESS_COOKIE_NAME)?.value;

  if (isPlatform) {
    if (!requestedBusinessId || !mongoose.isValidObjectId(requestedBusinessId)) {
      return { ...context, businessId: null, activeBranchId: undefined };
    }

    await connectToDatabase();
    const business = await Business.findOne({
      _id: requestedBusinessId,
      status: "active",
      isActive: { $ne: false },
    }).select("_id name slug").lean();

    if (!business) {
      return { ...context, businessId: null, activeBranchId: undefined };
    }

    context.businessId = business._id.toString();
    context.businessName = business.name;
    context.businessSlug = business.slug;
    context.branchAccess = "ALL_BRANCHES";
  }

  if (!context.businessId) {
    return { ...context, activeBranchId: undefined };
  }

  const canSelectAll =
    isPlatform || context.role === "BUSINESS_OWNER" || context.branchAccess === "ALL_BRANCHES";
  const requestedBranchId = cookieStore.get(ACTIVE_BRANCH_COOKIE_NAME)?.value;
  const defaultBranchId = canSelectAll
    ? "ALL"
    : context.activeBranchId || context.branchIds[0];
  const candidateBranchId = requestedBranchId || defaultBranchId;

  if (!candidateBranchId) {
    return { ...context, activeBranchId: undefined };
  }
  if (candidateBranchId === "ALL") {
    return { ...context, activeBranchId: resolveActiveBranchId(context, candidateBranchId, true) };
  }
  if (!mongoose.isValidObjectId(candidateBranchId) || !isBranchAllowed(context, candidateBranchId)) {
    return { ...context, activeBranchId: resolveActiveBranchId(context, candidateBranchId, false) };
  }

  await connectToDatabase();
  const branch = await Branch.findOne({
    _id: candidateBranchId,
    businessId: context.businessId,
    status: "active",
    isActive: { $ne: false },
  }).select("_id").lean();

  return {
    ...context,
    activeBranchId: resolveActiveBranchId(context, candidateBranchId, Boolean(branch)),
  };
}

export function resolveActiveBranchId(
  context: TenantContext,
  candidateBranchId: string | undefined,
  belongsToSelectedBusiness: boolean
): string | undefined {
  const canSelectAll =
    isPlatformRole(context.role) || context.role === "BUSINESS_OWNER" || context.branchAccess === "ALL_BRANCHES";
  const fallbackBranchId = canSelectAll ? "ALL" : context.activeBranchId || context.branchIds[0];

  if (!candidateBranchId) return undefined;
  if (candidateBranchId === "ALL") {
    return isBranchAllowed(context, "ALL") ? "ALL" : context.branchIds[0];
  }
  if (!belongsToSelectedBusiness || !isBranchAllowed(context, candidateBranchId)) {
    return fallbackBranchId;
  }
  return candidateBranchId;
}

export async function requireEffectiveTenantContext(): Promise<TenantContext & { businessId: string }> {
  const context = await getEffectiveTenantContext();
  if (!context.businessId) {
    throw new AuthorizationError("Select an active business before accessing business data.");
  }
  return context as TenantContext & { businessId: string };
}

export function assertEffectiveBusinessId(
  context: TenantContext,
  requestedBusinessId?: string | null
): asserts context is TenantContext & { businessId: string } {
  if (!context.businessId) {
    throw new AuthorizationError("Select an active business before accessing business data.");
  }
  if (requestedBusinessId && requestedBusinessId !== context.businessId) {
    throw new AuthorizationError("Forbidden: Requested business differs from the active business context.");
  }
}

export async function setSelectedBusinessContext(businessId: string): Promise<TenantContext> {
  const context = await getTenantContext();
  if (!isPlatformRole(context.role)) {
    throw new AuthorizationError("Forbidden: Only platform users can select a business.");
  }
  if (!mongoose.isValidObjectId(businessId)) {
    throw new AuthorizationError("Business not found or unavailable.");
  }

  await connectToDatabase();
  const business = await Business.findOne({
    _id: businessId,
    status: "active",
    isActive: { $ne: false },
  }).select("_id name slug").lean();
  if (!business) {
    throw new AuthorizationError("Business not found or unavailable.");
  }

  const cookieStore = cookies();
  cookieStore.set(SELECTED_BUSINESS_COOKIE_NAME, business._id.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  cookieStore.set(ACTIVE_BRANCH_COOKIE_NAME, "ALL", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return {
    ...context,
    businessId: business._id.toString(),
    businessName: business.name,
    businessSlug: business.slug,
    branchAccess: "ALL_BRANCHES",
    activeBranchId: "ALL",
  };
}

export async function setSelectedBranchContext(branchId: string): Promise<TenantContext> {
  const context = await getEffectiveTenantContext();
  if (!context.businessId) {
    throw new AuthorizationError("Select a business before selecting a branch.");
  }

  if (branchId === "ALL") {
    assertBranchAccess(context, "ALL");
  } else {
    if (!mongoose.isValidObjectId(branchId)) {
      throw new AuthorizationError("Branch not found or access denied.");
    }
    assertBranchAccess(context, branchId);
    await connectToDatabase();
    const branch = await Branch.findOne({
      _id: branchId,
      businessId: context.businessId,
      status: "active",
      isActive: { $ne: false },
    }).select("_id").lean();
    if (!branch) {
      throw new AuthorizationError("Branch not found or access denied.");
    }
  }

  const cookieStore = cookies();
  cookieStore.set(ACTIVE_BRANCH_COOKIE_NAME, branchId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return { ...context, activeBranchId: branchId };
}

export function resolveRequestedBranch(context: TenantContext, requestedBranchId?: string): string | undefined {
  const requested = requestedBranchId?.trim();
  const active = context.activeBranchId;

  if (active && active !== "ALL") {
    if (requested && requested !== "ALL" && requested !== active) {
      throw new AuthorizationError("Forbidden: Requested branch differs from the active branch context.");
    }
    return active;
  }

  const branchId = requested && requested !== "ALL" ? requested : undefined;
  if (branchId) assertBranchAccess(context, branchId);
  return branchId;
}

/**
 * Server-side guard verifying access to a specific branch.
 * Throws an AuthorizationError if the user is unauthorized.
 */
export async function requireBranchAccess(branchId?: string): Promise<TenantContext> {
  const context = await getEffectiveTenantContext();
  const effectiveBranchId = resolveRequestedBranch(context, branchId);
  if (effectiveBranchId) assertBranchAccess(context, effectiveBranchId);
  return context;
}

/**
 * Pure authorization check for branch access that works with both Next.js sessions and standalone tests.
 */
export function isBranchAllowed(context: TenantContext, branchId?: string): boolean {
  if (isPlatformRole(context.role)) {
    return true;
  }

  const isAllBranches =
    context.role === "BUSINESS_OWNER" || context.branchAccess === "ALL_BRANCHES";

  if (!branchId || branchId === "ALL") {
    return isAllBranches;
  }

  if (isAllBranches) {
    return true;
  }

  return (context.branchIds || []).includes(branchId);
}

/**
 * Assertion for branch access. Throws AuthorizationError if access is denied.
 */
export function assertBranchAccess(context: TenantContext, branchId?: string): void {
  if (!isBranchAllowed(context, branchId)) {
    if (!branchId || branchId === "ALL") {
      throw new AuthorizationError("Forbidden: User does not have access to All Branches.");
    }
    throw new AuthorizationError(`Forbidden: User does not have access to branch "${branchId}".`);
  }
}
