import { Express, Request, Response } from "express";
import { z } from "zod";
import { delegatedAdminService } from "../services/delegated-admin-service";
import { 
  insertUserInvitationSchema, 
  insertResourcePermissionSchema, 
  insertTeamSchema, 
  insertTeamMemberSchema,
  insertPermissionTemplateSchema 
} from "../../shared/delegated-admin-schema";
import { SelectUser } from "../../shared/schema";

// Validation schemas for API requests
const updateUserRoleSchema = z.object({
  userId: z.number(),
  role: z.enum(['employee', 'manager'])
});

const userActionSchema = z.object({
  userId: z.number()
});

const resourcePermissionRequestSchema = insertResourcePermissionSchema.extend({
  userId: z.number(),
  resourceType: z.string(),
  resourceId: z.string(),
  actions: z.array(z.enum(['view', 'edit', 'approve', 'comment', 'delete']))
});

const revokePermissionSchema = z.object({
  userId: z.number(),
  resourceType: z.string(),
  resourceId: z.string()
});

const teamMemberActionSchema = z.object({
  teamId: z.number(),
  userId: z.number()
});

/**
 * Register all delegated administration routes
 */
export function registerDelegatedAdminRoutes(app: Express): void {

  // ====================
  // USER LIFECYCLE MANAGEMENT
  // ====================

  /**
   * POST /api/admin/users/invite
   * Invite a new user to the tenant
   */
  app.post('/api/admin/users/invite', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = insertUserInvitationSchema.parse(req.body);
      const result = await delegatedAdminService.inviteUser(validatedData, user);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'User invitation sent successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to invite user' 
      });
    }
  });

  /**
   * PUT /api/admin/users/role
   * Update a user's role (Employee <-> Manager only)
   */
  app.put('/api/admin/users/role', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { userId, role } = updateUserRoleSchema.parse(req.body);
      await delegatedAdminService.updateUserRole(userId, role, user);
      
      res.json({
        success: true,
        message: 'User role updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to update user role' 
      });
    }
  });

  /**
   * PUT /api/admin/users/disable
   * Disable a user account
   */
  app.put('/api/admin/users/disable', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { userId } = userActionSchema.parse(req.body);
      await delegatedAdminService.disableUser(userId, user);
      
      res.json({
        success: true,
        message: 'User disabled successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to disable user' 
      });
    }
  });

  /**
   * PUT /api/admin/users/enable
   * Enable a user account
   */
  app.put('/api/admin/users/enable', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { userId } = userActionSchema.parse(req.body);
      await delegatedAdminService.enableUser(userId, user);
      
      res.json({
        success: true,
        message: 'User enabled successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to enable user' 
      });
    }
  });

  /**
   * DELETE /api/admin/users/remove
   * Remove a user from the tenant
   */
  app.delete('/api/admin/users/remove', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { userId } = userActionSchema.parse(req.body);
      await delegatedAdminService.removeUser(userId, user);
      
      res.json({
        success: true,
        message: 'User removed successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to remove user' 
      });
    }
  });

  /**
   * GET /api/admin/users
   * Get all users in the tenant
   */
  app.get('/api/admin/users', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const users = await delegatedAdminService.getTenantUsers(user);
      
      res.json({
        success: true,
        data: users
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to fetch users' 
      });
    }
  });

  // ====================
  // FINE-GRAINED PERMISSIONS
  // ====================

  /**
   * POST /api/admin/permissions
   * Grant resource-specific permissions to a user
   */
  app.post('/api/admin/permissions', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = resourcePermissionRequestSchema.parse(req.body);
      await delegatedAdminService.grantResourcePermission(validatedData, user);
      
      res.status(201).json({
        success: true,
        message: 'Resource permission granted successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to grant resource permission' 
      });
    }
  });

  /**
   * DELETE /api/admin/permissions
   * Revoke resource-specific permissions from a user
   */
  app.delete('/api/admin/permissions', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { userId, resourceType, resourceId } = revokePermissionSchema.parse(req.body);
      await delegatedAdminService.revokeResourcePermission(userId, resourceType, resourceId, user);
      
      res.json({
        success: true,
        message: 'Resource permission revoked successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to revoke resource permission' 
      });
    }
  });

  /**
   * GET /api/admin/permissions/:userId
   * Get all resource permissions for a specific user
   */
  app.get('/api/admin/permissions/:userId', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const permissions = await delegatedAdminService.getUserResourcePermissions(userId, user);
      
      res.json({
        success: true,
        data: permissions
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to fetch user permissions' 
      });
    }
  });

  // ====================
  // TEAM MANAGEMENT
  // ====================

  /**
   * POST /api/admin/teams
   * Create a new team
   */
  app.post('/api/admin/teams', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = insertTeamSchema.parse(req.body);
      const result = await delegatedAdminService.createTeam(validatedData, user);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Team created successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to create team' 
      });
    }
  });

  /**
   * GET /api/admin/teams
   * Get all teams in the tenant
   */
  app.get('/api/admin/teams', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const teams = await delegatedAdminService.getTeams(user);
      
      res.json({
        success: true,
        data: teams
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to fetch teams' 
      });
    }
  });

  /**
   * PUT /api/admin/teams/:teamId
   * Update a team (including assigning team admin)
   */
  app.put('/api/admin/teams/:teamId', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ error: 'Invalid team ID' });
      }

      const updates = insertTeamSchema.partial().parse(req.body);
      await delegatedAdminService.updateTeam(teamId, updates, user);
      
      res.json({
        success: true,
        message: 'Team updated successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to update team' 
      });
    }
  });

  /**
   * POST /api/admin/teams/members
   * Add a user to a team
   */
  app.post('/api/admin/teams/members', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { teamId, userId } = teamMemberActionSchema.parse(req.body);
      await delegatedAdminService.addUserToTeam(teamId, userId, user);
      
      res.status(201).json({
        success: true,
        message: 'User added to team successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to add user to team' 
      });
    }
  });

  /**
   * DELETE /api/admin/teams/members
   * Remove a user from a team
   */
  app.delete('/api/admin/teams/members', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { teamId, userId } = teamMemberActionSchema.parse(req.body);
      await delegatedAdminService.removeUserFromTeam(teamId, userId, user);
      
      res.json({
        success: true,
        message: 'User removed from team successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to remove user from team' 
      });
    }
  });

  /**
   * GET /api/admin/teams/:teamId/members
   * Get all members of a team
   */
  app.get('/api/admin/teams/:teamId/members', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const teamId = parseInt(req.params.teamId);
      if (isNaN(teamId)) {
        return res.status(400).json({ error: 'Invalid team ID' });
      }

      const members = await delegatedAdminService.getTeamMembers(teamId, user);
      
      res.json({
        success: true,
        data: members
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to fetch team members' 
      });
    }
  });

  // ====================
  // PERMISSION TEMPLATES
  // ====================

  /**
   * POST /api/admin/permission-templates
   * Create a permission template for reusable permission sets
   */
  app.post('/api/admin/permission-templates', async (req: Request, res: Response) => {
    try {
      const user = req.user as SelectUser;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const validatedData = insertPermissionTemplateSchema.parse(req.body);
      const result = await delegatedAdminService.createPermissionTemplate(validatedData, user);
      
      res.status(201).json({
        success: true,
        data: result,
        message: 'Permission template created successfully'
      });
    } catch (error: any) {
      res.status(400).json({ 
        error: error.message || 'Failed to create permission template' 
      });
    }
  });
}