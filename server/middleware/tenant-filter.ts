import { Request, Response, NextFunction } from 'express';

/**
 * Adds types to Express Request interface
 */
declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      isTenantResource: (createdBy: number | null | undefined) => boolean;
    }
  }
}

/**
 * Middleware that adds a tenant filter for the authenticated user to the request object
 * This will be used to filter data based on user ownership (tenancy)
 */
export function tenantFilter(req: Request, res: Response, next: NextFunction) {
  // If the user is authenticated, set the tenantId to the user's ID
  if (req.isAuthenticated() && req.user) {
    req.tenantId = req.user.id;
    
    // Add a helper method to check if a resource belongs to the current tenant
    req.isTenantResource = (createdBy: number | null | undefined) => {
      // If createdBy is null/undefined or doesn't match tenantId, resource doesn't belong to tenant
      return createdBy !== null && createdBy !== undefined && createdBy === req.tenantId;
    };
  } else {
    // For unauthenticated requests, set a function that always returns false
    req.isTenantResource = () => false;
  }
  
  next();
}