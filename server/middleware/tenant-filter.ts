import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/schema';

/**
 * Adds types to Express Request interface
 */
declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      isTenantResource: (tenantId: number | null | undefined) => boolean;
      isResourceOwner: (createdBy: number | null | undefined) => boolean;
    }
  }
}

/**
 * Middleware that adds tenant filtering capabilities to the request object
 * This enables data isolation and multi-tenancy in the application
 */
export function tenantFilter(req: Request, res: Response, next: NextFunction) {
  // If the user is authenticated, set the tenantId from the user object
  if (req.isAuthenticated() && req.user) {
    const user = req.user as User;
    req.tenantId = user.tenantId;
    
    // Add helper method to check if a resource belongs to the current tenant
    req.isTenantResource = (resourceTenantId: number | null | undefined) => {
      // If resourceTenantId is null/undefined or doesn't match user's tenantId, resource doesn't belong to tenant
      return resourceTenantId !== null && 
             resourceTenantId !== undefined && 
             resourceTenantId === req.tenantId;
    };
    
    // Add helper method to check if the user is the owner of a resource
    req.isResourceOwner = (createdBy: number | null | undefined) => {
      // If createdBy is null/undefined or doesn't match user's id, user is not the owner
      return createdBy !== null && 
             createdBy !== undefined && 
             createdBy === user.id;
    };
  } else {
    // For unauthenticated requests, set functions that always return false
    req.isTenantResource = () => false;
    req.isResourceOwner = () => false;
  }
  
  next();
}