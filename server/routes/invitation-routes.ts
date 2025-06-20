import { Express, Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from '../storage';
import { insertUserInvitationSchema, UserInvitation } from '@shared/schema';
import { logger } from '../logger';
import { hashPassword } from '../auth-utils';
import UnifiedEmailService from '../services/unified-email-service';
import { z } from 'zod';

// Duration for which an invitation is valid (7 days in milliseconds)
const INVITATION_VALIDITY_PERIOD = 7 * 24 * 60 * 60 * 1000;

/**
 * Generate a secure random token for user invitations
 * @returns A random token string
 */
function generateInvitationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Calculate the expiry date for an invitation
 * @returns Date object representing the expiry date
 */
function calculateExpiryDate(): Date {
  return new Date(Date.now() + INVITATION_VALIDITY_PERIOD);
}

/**
 * Get the base URL for the application from the request
 * This handles both development and production environments
 */
function getBaseUrl(req: Request): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = req.get('host') || 'localhost:3000';
  
  // If we have a tenant subdomain, use it to form the URL properly
  if (req.tenant?.subdomain) {
    // Extract the domain without the subdomain
    const domainParts = host.split('.');
    if (domainParts.length > 2) {
      domainParts.shift(); // Remove the first part (current subdomain)
      return `${protocol}://${req.tenant.subdomain}.${domainParts.join('.')}`;
    } else {
      // Local development or custom domain case
      return `${protocol}://${req.tenant.subdomain}.${host}`;
    }
  }
  
  return `${protocol}://${host}`;
}

/**
 * Validate that a token exists and is not expired or used
 */
async function validateInvitationToken(token: string): Promise<{
  valid: boolean;
  invitation?: UserInvitation;
  message?: string;
}> {
  // Find the invitation by token
  const invitation = await storage.getUserInvitationByToken(token);
  
  if (!invitation) {
    return {
      valid: false,
      message: 'Invalid invitation token'
    };
  }
  
  // Check if the invitation has expired
  if (new Date() > new Date(invitation.expiresAt)) {
    return {
      valid: false,
      invitation,
      message: 'This invitation has expired'
    };
  }
  
  // Check if the invitation has been used
  if (invitation.status !== 'pending') {
    return {
      valid: false,
      invitation,
      message: `This invitation has already been ${invitation.status === 'accepted' ? 'accepted' : 'processed'}`
    };
  }
  
  return {
    valid: true,
    invitation
  };
}

/**
 * Register the invitation routes
 */
export function registerInvitationRoutes(app: Express) {
  /**
   * Middleware to check if an invitation token is valid
   */
  const validateToken = async (req: Request, res: Response, next: Function) => {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token is required' 
      });
    }
    
    const validation = await validateInvitationToken(token);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        message: validation.message 
      });
    }
    
    // Attach the invitation to the request for use in the route handler
    (req as any).invitation = validation.invitation;
    next();
  };

  /**
   * Create a new user invitation
   * POST /api/invitations
   */
  app.post('/api/invitations', async (req: Request, res: Response) => {
    try {
      // Check if the user is authenticated and is an admin
      if (!req.isAuthenticated()) {
        logger.warn({}, 'Unauthenticated invitation attempt');
        return res.status(401).json({ 
          success: false, 
          message: 'Authentication required' 
        });
      }
      
      // Check if the user has admin permissions
      const user = req.user as any;
      
      // Check user role first
      let isAdmin = user.role === 'admin';
      
      // If not admin by role, check if they have admin position in employee record
      if (!isAdmin) {
        try {
          const employees = await storage.getAllEmployees({ tenantId: user.tenantId });
          const userEmployee = employees.find(emp => emp.email === user.email);
          isAdmin = userEmployee?.position?.toLowerCase() === 'admin';
        } catch (error) {
          logger.error({ userId: user.id, error }, 'Error checking employee admin status');
        }
      }
      
      if (!isAdmin) {
        logger.warn({ userId: user.id }, 'Non-admin attempting to create invitation');
        return res.status(403).json({ 
          success: false, 
          message: 'Admin permissions required' 
        });
      }
      
      // Get the tenant ID from the authenticated user
      const tenantId = user.tenantId;
      if (!tenantId) {
        logger.error({ userId: user.id }, 'User has no tenant ID');
        return res.status(500).json({ 
          success: false, 
          message: 'Server configuration error' 
        });
      }
      
      // Validate the request body
      const schema = z.object({
        email: z.string().email(),
        role: z.enum(['admin', 'manager', 'employee']).default('employee')
      });
      
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        logger.warn({ 
          errors: validationResult.error.errors,
          body: req.body 
        }, 'Invalid invitation data');
        
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        });
      }
      
      const { email, role } = validationResult.data;
      
      // Check if the email is already registered as a user
      // First check by email across all users (we'll need to filter by tenant manually)
      const users = await storage.getAllUsers();
      const existingUser = users.find(u => u.email === email && u.tenantId === tenantId);
      
      if (existingUser) {
        logger.warn({ email, tenantId }, 'Email already registered as user');
        return res.status(400).json({ 
          success: false, 
          message: 'This email is already registered as a user' 
        });
      }
      
      // Check if there's an existing pending invitation for this email
      const existingInvitations = await storage.getUserInvitationsByEmail(email, tenantId);
      const pendingInvitation = existingInvitations.find(inv => inv.status === 'pending');
      
      if (pendingInvitation) {
        logger.info({ 
          email, 
          tenantId,
          invitationId: pendingInvitation.id 
        }, 'Pending invitation already exists');
        
        return res.status(400).json({ 
          success: false, 
          message: 'There is already a pending invitation for this email' 
        });
      }
      
      // Generate a secure token
      const token = generateInvitationToken();
      const expiresAt = calculateExpiryDate();
      
      // Create the invitation
      const invitation = await storage.createUserInvitation({
        tenantId,
        email,
        token,
        role,
        expiresAt,
        status: 'pending',
        createdBy: user.id
      });
      
      if (!invitation) {
        logger.error({ email, tenantId }, 'Failed to create invitation');
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create invitation' 
        });
      }
      
      logger.info({ 
        invitationId: invitation.id,
        email,
        role,
        tenantId 
      }, 'Invitation created successfully');
      
      // Get the tenant name for the email
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        logger.error({ tenantId }, 'Tenant not found');
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to retrieve tenant information' 
        });
      }
      
      // Send the invitation email
      const baseUrl = getBaseUrl(req);
      const inviterName = user.fullName || user.username;
      
      const emailSent = await UnifiedEmailService.sendInvitation(
        email,
        token,
        inviterName,
        tenant.name,
        role,
        baseUrl
      );
      
      if (!emailSent) {
        logger.error({ 
          invitationId: invitation.id,
          email 
        }, 'Failed to send invitation email');
        
        // The invitation was created, but the email couldn't be sent
        // We'll return success anyway, but with a warning
        return res.status(200).json({ 
          success: true, 
          warning: true,
          message: 'Invitation created but email could not be sent',
          invitation: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expiresAt: invitation.expiresAt,
            status: invitation.status
          }
        });
      }
      
      // Return success with the invitation details (excluding the token for security)
      res.status(201).json({ 
        success: true, 
        message: 'Invitation created and email sent',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          status: invitation.status
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Error creating invitation');
      res.status(500).json({ 
        success: false, 
        message: 'An error occurred while creating the invitation' 
      });
    }
  });

  /**
   * Get invitation details by token
   * GET /api/invitations/:token
   */
  app.get('/api/invitations/:token', async (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({ 
          success: false, 
          message: 'Token is required' 
        });
      }
      
      // Validate the token
      const validation = await validateInvitationToken(token);
      
      if (!validation.valid) {
        return res.status(400).json({ 
          success: false, 
          message: validation.message,
          status: validation.invitation?.status || 'invalid'
        });
      }
      
      const invitation = validation.invitation;
      
      // Get the tenant name for context
      const tenant = await storage.getTenant(invitation!.tenantId);
      
      // Return invitation details (excluding the token for security)
      res.json({ 
        success: true, 
        invitation: {
          id: invitation!.id,
          email: invitation!.email,
          role: invitation!.role,
          expiresAt: invitation!.expiresAt,
          status: invitation!.status,
          tenantName: tenant?.name || 'Unknown Organization'
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Error retrieving invitation details');
      res.status(500).json({ 
        success: false, 
        message: 'An error occurred while retrieving the invitation details' 
      });
    }
  });

  /**
   * Accept an invitation and create a user account
   * POST /api/invitations/:token/accept
   */
  app.post('/api/invitations/:token/accept', validateToken, async (req: Request, res: Response) => {
    try {
      const invitation = (req as any).invitation as UserInvitation;
      
      // Validate the request body
      const schema = z.object({
        username: z.string().min(3).max(30),
        password: z.string().min(8),
        fullName: z.string().min(1)
      });
      
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          success: false, 
          message: 'Validation failed', 
          errors: validationResult.error.errors 
        });
      }
      
      const { username, password, fullName } = validationResult.data;
      
      // Check if the username is already taken
      const existingUser = await storage.getUserByUsername(username, invitation.tenantId);
      
      if (existingUser) {
        return res.status(400).json({ 
          success: false, 
          message: 'This username is already taken' 
        });
      }
      
      // Hash the password
      const hashedPassword = await hashPassword(password);
      
      // Create the user
      const user = await storage.createUser({
        tenantId: invitation.tenantId,
        username,
        password: hashedPassword,
        email: invitation.email,
        fullName,
        role: invitation.role,
        active: true
      });
      
      if (!user) {
        logger.error({ 
          invitationId: invitation.id,
          email: invitation.email 
        }, 'Failed to create user from invitation');
        
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create user account' 
        });
      }
      
      // Update the invitation status to 'accepted'
      await storage.updateUserInvitation(invitation.id, {
        status: 'accepted'
      });
      
      logger.info({ 
        userId: user.id,
        username,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        invitationId: invitation.id
      }, 'User created from invitation');
      
      // Log in the new user
      req.login(user, (err) => {
        if (err) {
          logger.error({ 
            err,
            userId: user.id 
          }, 'Failed to log in user after accepting invitation');
          
          return res.status(500).json({ 
            success: false, 
            message: 'Failed to log in automatically' 
          });
        }
        
        // Store user_id in session for connect-pg-simple
        if (req.session) {
          (req.session as any).user_id = user.id;
          (req.session as any).tenant_id = user.tenantId;
        }
        
        // Remove password from the response
        const { password: _, ...userWithoutPassword } = user;
        
        // Return success with the user details
        res.status(201).json({ 
          success: true, 
          message: 'Invitation accepted and account created',
          user: userWithoutPassword
        });
      });
    } catch (error) {
      logger.error({ err: error }, 'Error accepting invitation');
      res.status(500).json({ 
        success: false, 
        message: 'An error occurred while accepting the invitation' 
      });
    }
  });
}