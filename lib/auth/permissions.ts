import type { SessionUser } from "@/types";
import type { UserRole, Permission } from "@/types/user";

export function isPlatformRole(role: UserRole): boolean {
  return role === "PLATFORM_OWNER" || role === "PLATFORM_ADMIN";
}

export function hasPermission(
  user: Pick<SessionUser, "role" | "permissions">,
  permission: Permission
): boolean {
  if (isPlatformRole(user.role)) return true;
  return user.permissions?.includes(permission) ?? false;
}
