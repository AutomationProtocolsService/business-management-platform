import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';

/**
 * Middleware to require authentication
 * This ensures that a user is logged in before accessing a route
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    logger.warn(`Unauthorized access attempt: ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  next();
}

/**
 * Middleware to require admin role
 * This ensures that a user has admin privileges
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    logger.warn(`Unauthorized access attempt: ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has admin role
  const user = req.user as any;
  if (!user || !user.roles || !user.roles.includes('admin')) {
    logger.warn(`Admin access attempt without privileges: User ID ${user.id}, ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: 'Admin privileges required' });
  }
  
  next();
}

/**
 * Middleware to require super admin role
 * This ensures that a user has system-wide privileges
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    logger.warn(`Unauthorized access attempt: ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Check if user has super admin role
  const user = req.user as any;
  if (!user || !user.roles || !user.roles.includes('superadmin')) {
    logger.warn(`Super Admin access attempt without privileges: User ID ${user.id}, ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: 'Super Admin privileges required' });
  }
  
  next();
}

/**
 * Middleware to require tenant access
 * This ensures that a user belongs to the tenant specified in the request
 */
export function requireTenantAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    logger.warn(`Unauthorized access attempt: ${req.method} ${req.originalUrl}`);
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const user = req.user as any;
  const tenantId = (req as any).tenantId;
  
  // If no tenant ID in request, deny access
  if (!tenantId) {
    logger.warn(`Tenant access denied - no tenant ID in request: User ID ${user.id}, ${req.method} ${req.originalUrl}`);
    return res.status(403).json({ error: 'Tenant access required' });
  }
  
  // If user doesn't belong to this tenant, deny access
  // Exception: super admins can access any tenant
  if (user.tenantId !== tenantId && (!user.roles || !user.roles.includes('superadmin'))) {
    logger.warn(`Tenant access denied - user from different tenant: User ID ${user.id} (tenant ${user.tenantId}) tried to access tenant ${tenantId}`);
    return res.status(403).json({ error: 'You do not have access to this tenant' });
  }
  
  next();
}