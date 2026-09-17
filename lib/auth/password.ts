import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Securely hashes a plain-text password using bcrypt.
 * Never stores plain text passwords in the database.
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plain-text password against a bcrypt hash in constant time.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}
