import bcrypt from 'bcrypt';
import crypto from 'crypto';

// Use environment variables for bcrypt salt rounds with fallback
const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS 
  ? parseInt(process.env.BCRYPT_SALT_ROUNDS) 
  : 10;

// Token expiration time in hours
const TOKEN_EXPIRY_HOURS = process.env.PASSWORD_RESET_TOKEN_EXPIRY_HOURS
  ? parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY_HOURS)
  : 24;

/**
 * Hash a password with bcrypt
 * @param password The plain text password to hash
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a password with a hashed password
 * @param supplied The plain text password supplied by the user
 * @param stored The hashed password stored in the database
 * @returns Whether the passwords match
 */
export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return bcrypt.compare(supplied, stored);
}

/**
 * Generate a secure random token for password reset
 * @returns A random token string
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate expiration date for a token
 * @param hoursValid Number of hours the token should be valid (default: TOKEN_EXPIRY_HOURS)
 * @returns Date object representing the expiration time
 */
export function calculateTokenExpiry(hoursValid: number = TOKEN_EXPIRY_HOURS): Date {
  const expiryDate = new Date();
  expiryDate.setHours(expiryDate.getHours() + hoursValid);
  return expiryDate;
}