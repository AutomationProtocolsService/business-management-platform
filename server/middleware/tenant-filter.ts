/**
 * Tenant Filter Middleware
 * 
 * This middleware ensures proper tenant isolation by:
 * 1. Extracting the tenant information from authenticated user
 * 2. Adding tenant ID to all database queries
 * 3. Rejecting requests without tenant context when required
 */

import { Request, Response, NextFunction } from "express";
import { User } from "@shared/schema";
import logger from "../logger";

/**
 * Check if tenant information is available in the request
 * Either via authenticated user or explicit tenantId in request
 */
function hasTenantContext(req: Request): boolean {
  // Check if there's an authenticated user with tenant ID
  if (req.user && (req.user as User).tenantId) {
    return true;
  }
  
  // Check for tenant information in request body
  if (req.body && req.body.tenantId) {
    return true;
  }
  
  // Check if tenant is already attached to the request by previous middleware
  if (req.tenant && req.tenant.id) {
    return true;
  }
  
  return false;
}

/**
 * Get tenant ID from request context
 * Order of precedence: authenticated user, request body, attached tenant
 */
function getTenantId(req: Request): number | undefined {
  // First check authenticated user
  if (req.user && (req.user as User).tenantId) {
    return (req.user as User).tenantId;
  }
  
  // Then check request body
  if (req.body && req.body.tenantId) {
    const tenantId = parseInt(req.body.tenantId);
    if (!isNaN(tenantId)) {
      return tenantId;
    }
  }
  
  // Finally check attached tenant from subdomain or header
  if (req.tenant && req.tenant.id) {
    return req.tenant.id;
  }
  
  return undefined;
}

/**
 * Middleware to ensure tenant context exists for all API calls
 * Rejects unauthorized requests with 403 Forbidden
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  // Skip tenant check for public routes and authentication endpoints
  const publicPaths = [
    '/api/login', 
    '/api/register', 
    '/api/public',
    '/api/auth/request-password-reset',
    '/api/auth/reset-password'
  ];
  
  // Check if path starts with any of the public paths
  const isPublicPath = publicPaths.some(prefix => 
    req.path.startsWith(prefix) || req.path === prefix
  );
  
  if (isPublicPath) {
    return next();
  }
  
  // For all other routes, ensure tenant context exists
  if (!hasTenantContext(req)) {
    logger.warn({ path: req.path }, "Access denied: No tenant context");
    return res.status(403).json({
      success: false,
      message: "Tenant context required"
    });
  }
  
  next();
}

/**
 * Middleware to add tenant filter for all storage operations
 * Attaches tenantId to request for use in routes/controllers
 */
export function addTenantFilter(req: Request, res: Response, next: NextFunction) {
  // Attach the tenant ID to the request for use in route handlers
  const tenantId = getTenantId(req);
  
  if (tenantId) {
    // Create a tenantFilter property that route handlers can use
    (req as any).tenantFilter = { tenantId };
    
    // Log the tenant context for debugging
    logger.debug({ 
      path: req.path, 
      tenantId, 
      user: req.user ? (req.user as User).id : null 
    }, "Request processed with tenant filter");
  }
  
  next();
}

// Export a combined middleware that handles both requirements
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // First add the tenant filter (for all routes)
  addTenantFilter(req, res, () => {
    // Then check if tenant is required for this route
    requireTenant(req, res, next);
  });
}

export default tenantMiddleware;