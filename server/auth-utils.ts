import bcrypt from 'bcrypt';

// Use environment variables for bcrypt salt rounds with fallback
const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS 
  ? parseInt(process.env.BCRYPT_SALT_ROUNDS) 
  : 10;

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