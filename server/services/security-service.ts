import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { logger } from '../logger';
import { TenantFilter } from '../../shared/types';

/**
 * Service providing security-related functionality
 */
class SecurityServiceImpl {
  private readonly TOKEN_EXPIRY_HOURS = 24;
  private readonly SALT_ROUNDS = 10;
  
  /**
   * Hash a password with bcrypt
   * @param password The plain text password to hash
   * @returns The hashed password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }
  
  /**
   * Compare a password with a hashed password
   * @param plainPassword The plain text password
   * @param hashedPassword The hashed password to compare against
   * @returns Whether the passwords match
   */
  async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error comparing passwords:', error);
      return false;
    }
  }
  
  /**
   * Generate a secure random token
   * @returns A random token string
   */
  generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
  
  /**
   * Calculate expiration date for a token
   * @param hoursValid Number of hours the token should be valid
   * @returns Date object representing the expiration time
   */
  calculateTokenExpiry(hoursValid: number = this.TOKEN_EXPIRY_HOURS): Date {
    const now = new Date();
    return new Date(now.getTime() + hoursValid * 60 * 60 * 1000);
  }
  
  /**
   * Check if user has permission to access a resource
   * @param resourceTenantId The tenant ID of the resource being accessed
   * @param requestTenantFilter The tenant filter from the request
   * @param isSuperAdmin Whether the user is a super admin
   * @returns Whether access should be granted
   */
  hasResourceAccess(
    resourceTenantId: number | null | undefined,
    requestTenantFilter: TenantFilter | undefined,
    isSuperAdmin: boolean = false
  ): boolean {
    // Super admins always have access
    if (isSuperAdmin) {
      return true;
    }
    
    // If resource has no tenant ID, deny access unless super admin
    if (resourceTenantId === null || resourceTenantId === undefined) {
      return false;
    }
    
    // If request has no tenant filter, deny access
    if (!requestTenantFilter || !requestTenantFilter.tenantId) {
      return false;
    }
    
    // Check if tenant IDs match
    return resourceTenantId === requestTenantFilter.tenantId;
  }
  
  /**
   * Generate a password that meets requirements
   * @returns A secure password
   */
  generatePassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_-+=';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    
    return password;
  }
}

// Export a singleton instance
const SecurityService = new SecurityServiceImpl();
export default SecurityService;