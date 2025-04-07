/**
 * Authentication Middleware
 * 
 * Middleware functions for protecting routes and handling authentication
 */
import { Request, Response, NextFunction } from 'express';
import { User } from '@shared/types';

/**
 * Middleware to require authentication
 * Redirects to login if not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required" 
    });
  }
  
  next();
}

/**
 * Middleware to require admin role
 * Returns 403 Forbidden if not an admin
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required" 
    });
  }
  
  const user = req.user as User;
  if (user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: "Admin access required" 
    });
  }
  
  next();
}

/**
 * Middleware to require manager role or higher
 * Returns 403 Forbidden if not a manager or admin
 */
export function requireManager(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required" 
    });
  }
  
  const user = req.user as User;
  if (user.role !== 'admin' && user.role !== 'manager') {
    return res.status(403).json({ 
      success: false, 
      message: "Manager access required" 
    });
  }
  
  next();
}