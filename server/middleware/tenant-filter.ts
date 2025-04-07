import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { TenantFilter } from '../../shared/types';

/**
 * Extract tenant information from request
 * Priority order:
 * 1. Session (authenticated user's tenant)
 * 2. Header (X-Tenant-ID)
 * 3. Subdomain
 * 4. Query parameter (tenantId)
 * 5. Body parameter (tenantId)
 * 
 * @param req Express Request object
 * @returns TenantFilter object or undefined
 */
export function getTenantFilterFromRequest(req: Request): TenantFilter | undefined {
  let tenantId: number | undefined;
  
  // 1. Check user session
  if (req.user && (req.user as any).tenantId) {
    tenantId = (req.user as any).tenantId;
    logger.debug(`Using tenant ID ${tenantId} from session`);
  }
  
  // 2. Check request header
  else if (req.header('X-Tenant-ID')) {
    const headerTenantId = req.header('X-Tenant-ID');
    if (headerTenantId) {
      tenantId = parseInt(headerTenantId, 10);
      if (isNaN(tenantId)) {
        tenantId = undefined;
      } else {
        logger.debug(`Using tenant ID ${tenantId} from header`);
      }
    }
  }
  
  // 3. Check subdomain (example: tenant-123.domain.com)
  else if (req.hostname && req.hostname.includes('-')) {
    const parts = req.hostname.split('-');
    if (parts[0] === 'tenant' && parts.length > 1) {
      tenantId = parseInt(parts[1], 10);
      if (isNaN(tenantId)) {
        tenantId = undefined;
      } else {
        logger.debug(`Using tenant ID ${tenantId} from subdomain`);
      }
    }
  }
  
  // 4. Check query parameters
  else if (req.query.tenantId) {
    tenantId = parseInt(req.query.tenantId as string, 10);
    if (isNaN(tenantId)) {
      tenantId = undefined;
    } else {
      logger.debug(`Using tenant ID ${tenantId} from query parameter`);
    }
  }
  
  // 5. Check body parameters
  else if (req.body && req.body.tenantId) {
    tenantId = parseInt(req.body.tenantId, 10);
    if (isNaN(tenantId)) {
      tenantId = undefined;
    } else {
      logger.debug(`Using tenant ID ${tenantId} from body parameter`);
    }
  }
  
  if (tenantId === undefined) {
    return undefined;
  }
  
  return { tenantId };
}

/**
 * Express middleware to add tenant filtering capabilities to the request
 */
export function tenantFilterMiddleware(req: Request, res: Response, next: NextFunction) {
  // Add tenant filter to request object
  const tenantFilter = getTenantFilterFromRequest(req);
  (req as any).tenantFilter = tenantFilter;
  
  // Add utility method to request for tenant resource access checks
  (req as any).isTenantResource = function(resourceTenantId: number | undefined | null): boolean {
    if (!tenantFilter || tenantFilter.tenantId === undefined) {
      return false;
    }
    
    if (resourceTenantId === null || resourceTenantId === undefined) {
      return false;
    }
    
    return resourceTenantId === tenantFilter.tenantId;
  };
  
  // Expose the current tenant ID on the request
  if (tenantFilter) {
    (req as any).tenantId = tenantFilter.tenantId;
  }
  
  next();
}