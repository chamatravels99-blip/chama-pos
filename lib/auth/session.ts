import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { SessionPayload, TenantContext, UserRole } from "@/types";

export const SESSION_COOKIE_NAME = "chama_session";
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
 * Server-side role guard requiring one of the specified roles.
 * PLATFORM_ADMIN possesses universal platform administration rights.
 */
export async function requireRole(allowedRoles: UserRole[]): Promise<SessionPayload> {
  const session = await requireAuth();

  // Normalize role aliases (e.g. SUPER_ADMIN -> PLATFORM_ADMIN)
  const normalizedRole = session.role === "SUPER_ADMIN" ? "PLATFORM_ADMIN" : session.role;

  const isAllowed =
    allowedRoles.includes(session.role) ||
    allowedRoles.includes(normalizedRole) ||
    normalizedRole === "PLATFORM_ADMIN";

  if (!isAllowed) {
    throw new AuthorizationError(
      `Access denied. Role "${session.role}" lacks required permissions (${allowedRoles.join(", ")}).`
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

  const isPlatformAdmin =
    session.role === "PLATFORM_ADMIN" || session.role === "SUPER_ADMIN";

  if (!isPlatformAdmin && !session.businessId) {
    throw new AuthorizationError(
      "TenantContext Error: Non-admin user is not associated with any active business/tenant."
    );
  }

  return {
    userId: session.userId,
    businessId: session.businessId,
    branchIds: session.branchIds || [],
    role: session.role,
    businessSlug: session.businessSlug,
    businessName: session.businessName,
    activeBranchId: session.activeBranchId,
  };
}
