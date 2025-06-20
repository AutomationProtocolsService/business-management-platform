import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { users, SelectUser } from "../../shared/schema";
import { 
  teams, 
  teamMembers, 
  resourcePermissions, 
  permissionTemplates, 
  userInvitations,
  InsertTeam,
  InsertTeamMember,
  InsertResourcePermission,
  InsertPermissionTemplate,
  InsertUserInvitation,
  Team,
  ResourcePermission
} from "../../shared/delegated-admin-schema";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";

export class DelegatedAdminService {
  
  /**
   * Validates that a user has admin privileges within their tenant
   */
  private validateTenantAdmin(user: SelectUser): void {
    if (user.role !== 'admin') {
      throw new Error('Admin access required');
    }
  }

  /**
   * Validates that a user can only operate within their own tenant
   */
  private validateTenantBoundary(requestedTenantId: number, userTenantId: number): void {
    if (requestedTenantId !== userTenantId) {
      throw new Error('Cross-tenant access denied');
    }
  }

  /**
   * Validates that a target user belongs to the same tenant as the admin
   */
  private async validateTargetUserTenant(targetUserId: number, adminTenantId: number): Promise<void> {
    const targetUser = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser.length || targetUser[0].tenantId !== adminTenantId) {
      throw new Error('Target user not found in your tenant');
    }
  }

  /**
   * Validates that an admin cannot escalate privileges beyond their own
   */
  private validateRoleEscalation(targetRole: string, adminRole: string): void {
    const roleHierarchy = { 'employee': 1, 'manager': 2, 'admin': 3 };
    const targetLevel = roleHierarchy[targetRole as keyof typeof roleHierarchy];
    const adminLevel = roleHierarchy[adminRole as keyof typeof roleHierarchy];
    
    if (!targetLevel || targetLevel > adminLevel) {
      throw new Error('Cannot assign role higher than your own');
    }
  }

  /**
   * Invite a new user to the tenant
   */
  async inviteUser(invitation: InsertUserInvitation, adminUser: SelectUser): Promise<{ id: number; invitationToken: string }> {
    this.validateTenantAdmin(adminUser);
    
    // Generate invitation token and expiration
    const invitationToken = randomUUID();
    const expiresAt = addDays(new Date(), 7); // 7 days expiration

    // Validate role escalation
    this.validateRoleEscalation(invitation.role, adminUser.role);

    const result = await db.insert(userInvitations).values({
      ...invitation,
      tenantId: adminUser.tenantId,
      invitedBy: adminUser.id,
      invitationToken,
      expiresAt
    }).returning({ id: userInvitations.id });

    return { id: result[0].id, invitationToken };
  }

  /**
   * Update user role (Employee <-> Manager only)
   */
  async updateUserRole(targetUserId: number, newRole: string, adminUser: SelectUser): Promise<void> {
    this.validateTenantAdmin(adminUser);
    await this.validateTargetUserTenant(targetUserId, adminUser.tenantId);
    
    // Only allow Employee <-> Manager role changes
    if (!['employee', 'manager'].includes(newRole)) {
      throw new Error('Can only assign Employee or Manager roles');
    }

    this.validateRoleEscalation(newRole, adminUser.role);

    await db.update(users)
      .set({ role: newRole })
      .where(and(
        eq(users.id, targetUserId),
        eq(users.tenantId, adminUser.tenantId)
      ));
  }

  /**
   * Disable a user account
   */
  async disableUser(targetUserId: number, adminUser: SelectUser): Promise<void> {
    this.validateTenantAdmin(adminUser);
    await this.validateTargetUserTenant(targetUserId, adminUser.tenantId);

    // Prevent self-disabling
    if (targetUserId === adminUser.id) {
      throw new Error('Cannot disable your own account');
    }

    await db.update(users)
      .set({ active: false })
      .where(and(
        eq(users.id, targetUserId),
        eq(users.tenantId, adminUser.tenantId)
      ));
  }

  /**
   * Enable a user account
   */
  async enableUser(targetUserId: number, adminUser: SelectUser): Promise<void> {
    this.validateTenantAdmin(adminUser);
    await this.validateTargetUserTenant(targetUserId, adminUser.tenantId);

    await db.update(users)
      .set({ active: true })
      .where(and(
        eq(users.id, targetUserId),
        eq(users.tenantId, adminUser.tenantId)
      ));
  }

  /**
   * Remove a user from the tenant (soft delete by deactivating)
   */
  async removeUser(targetUserId: number, adminUser: SelectUser): Promise<void> {
    this.validateTenantAdmin(adminUser);
    await this.validateTargetUserTenant(targetUserId, adminUser.tenantId);

    // Prevent self-removal
    if (targetUserId === adminUser.id) {
      throw new Error('Cannot remove your own account');
    }

    // Remove from all teams first
    await db.delete(teamMembers)
      .where(and(
        eq(teamMembers.userId, targetUserId)
      ));

    // Remove all resource permissions
    await db.delete(resourcePermissions)
      .where(and(
        eq(resourcePermissions.userId, targetUserId),
        eq(resourcePermissions.tenantId, adminUser.tenantId)
      ));

    // Deactivate the user
    await db.update(users)
      .set({ active: false })
      .where(and(
        eq(users.id, targetUserId),
        eq(users.tenantId, adminUser.tenantId)
      ));
  }

  /**
   * Grant resource-specific permissions to a user
   */
  async grantResourcePermission(permission: InsertResourcePermission, adminUser: SelectUser): Promise<void> {
    this.validateTenantAdmin(adminUser);
    await this.validateTargetUserTenant(permission.userId, adminUser.tenantId);

    // Validate actions are from allowed set
    const allowedActions = ['view', 'edit', 'approve', 'comment', 'delete'];
    const invalidActions = permission.actions.filter(action => !allowedActions.includes(action));
    if (invalidActions.length > 0) {
      throw new Error(`Invalid actions: ${invalidActions.join(', ')}`);
    }

    // Check if permission already exists and update, otherwise insert
    const existing = await db.select()
      .from(resourcePermissions)
      .where(and(
        eq(resourcePermissions.userId, permission.userId),
        eq(resourcePermissions.resourceType, permission.resourceType),
        eq(resourcePermissions.resourceId, permission.resourceId),
        eq(resourcePermissions.tenantId, adminUser.tenantId)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(resourcePermissions)
        .set({
          actions: permission.actions,
          active: true,
          grantedBy: adminUser.id,
          grantedAt: new Date(),
          expiresAt: permission.expiresAt
        })
        .where(eq(resourcePermissions.id, existing[0].id));
    } else {
      await db.insert(resourcePermissions).values({
        ...permission,
        tenantId: adminUser.tenantId,
        grantedBy: adminUser.id
      });
    }
  }

  /**
   * Revoke resource-specific permissions from a user
   */
  async revokeResourcePermission(userId: number, resourceType: string, resourceId: string, adminUser: SelectUser): Promise<void> {
    this.validateTenantAdmin(adminUser);
    await this.validateTargetUserTenant(userId, adminUser.tenantId);

    await db.update(resourcePermissions)
      .set({ active: false })
      .where(and(
        eq(resourcePermissions.userId, userId),
        eq(resourcePermissions.resourceType, resourceType),
        eq(resourcePermissions.resourceId, resourceId),
        eq(resourcePermissions.tenantId, adminUser.tenantId)
      ));
  }

  /**
   * Get all resource permissions for a user
   */
  async getUserResourcePermissions(userId: number, adminUser: SelectUser): Promise<ResourcePermission[]> {
    this.validateTenantAdmin(adminUser);
    await this.validateTargetUserTenant(userId, adminUser.tenantId);

    return await db.select()
      .from(resourcePermissions)
      .where(and(
        eq(resourcePermissions.userId, userId),
        eq(resourcePermissions.tenantId, adminUser.tenantId),
        eq(resourcePermissions.active, true)
      ));
  }

  /**
   * Create a new team
   */
  async createTeam(team: InsertTeam, adminUser: SelectUser): Promise<{ id: number }> {
    this.validateTenantAdmin(adminUser);

    // Validate team admin is a manager in the same tenant
    if (team.teamAdminId) {
      const teamAdmin = await db.select().from(users).where(eq(users.id, team.teamAdminId)).limit(1);
      if (!teamAdmin.length || teamAdmin[0].tenantId !== adminUser.tenantId || teamAdmin[0].role !== 'manager') {
        throw new Error('Team admin must be a Manager in your tenant');
      }
    }

    const result = await db.insert(teams).values({
      ...team,
      tenantId: adminUser.tenantId,
      createdBy: adminUser.id
    }).returning({ id: teams.id });

    return { id: result[0].id };
  }

  /**
   * Update team (including assigning team admin)
   */
  async updateTeam(teamId: number, updates: Partial<InsertTeam>, adminUser: SelectUser): Promise<void> {
    this.validateTenantAdmin(adminUser);

    // Verify team belongs to admin's tenant
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team.length || team[0].tenantId !== adminUser.tenantId) {
      throw new Error('Team not found in your tenant');
    }

    // Validate team admin if being updated
    if (updates.teamAdminId) {
      const teamAdmin = await db.select().from(users).where(eq(users.id, updates.teamAdminId)).limit(1);
      if (!teamAdmin.length || teamAdmin[0].tenantId !== adminUser.tenantId || teamAdmin[0].role !== 'manager') {
        throw new Error('Team admin must be a Manager in your tenant');
      }
    }

    await db.update(teams)
      .set(updates)
      .where(and(
        eq(teams.id, teamId),
        eq(teams.tenantId, adminUser.tenantId)
      ));
  }

  /**
   * Add user to team
   */
  async addUserToTeam(teamId: number, userId: number, adminUser: SelectUser): Promise<void> {
    this.validateTenantAdmin(adminUser);
    await this.validateTargetUserTenant(userId, adminUser.tenantId);

    // Verify team belongs to admin's tenant
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team.length || team[0].tenantId !== adminUser.tenantId) {
      throw new Error('Team not found in your tenant');
    }

    await db.insert(teamMembers).values({
      teamId,
      userId,
      addedBy: adminUser.id
    });
  }

  /**
   * Remove user from team
   */
  async removeUserFromTeam(teamId: number, userId: number, adminUser: SelectUser): Promise<void> {
    this.validateTenantAdmin(adminUser);

    // Verify team belongs to admin's tenant
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team.length || team[0].tenantId !== adminUser.tenantId) {
      throw new Error('Team not found in your tenant');
    }

    await db.delete(teamMembers)
      .where(and(
        eq(teamMembers.teamId, teamId),
        eq(teamMembers.userId, userId)
      ));
  }

  /**
   * Get all teams in tenant
   */
  async getTeams(adminUser: SelectUser): Promise<Team[]> {
    this.validateTenantAdmin(adminUser);

    return await db.select()
      .from(teams)
      .where(and(
        eq(teams.tenantId, adminUser.tenantId),
        eq(teams.active, true)
      ));
  }

  /**
   * Get team members
   */
  async getTeamMembers(teamId: number, adminUser: SelectUser) {
    this.validateTenantAdmin(adminUser);

    // Verify team belongs to admin's tenant
    const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
    if (!team.length || team[0].tenantId !== adminUser.tenantId) {
      throw new Error('Team not found in your tenant');
    }

    return await db.select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      addedAt: teamMembers.addedAt,
      userName: users.fullName,
      userEmail: users.email,
      userRole: users.role
    })
    .from(teamMembers)
    .leftJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));
  }

  /**
   * Create permission template
   */
  async createPermissionTemplate(template: InsertPermissionTemplate, adminUser: SelectUser): Promise<{ id: number }> {
    this.validateTenantAdmin(adminUser);

    const result = await db.insert(permissionTemplates).values({
      ...template,
      tenantId: adminUser.tenantId,
      createdBy: adminUser.id
    }).returning({ id: permissionTemplates.id });

    return { id: result[0].id };
  }

  /**
   * Get all users in tenant (for admin management)
   */
  async getTenantUsers(adminUser: SelectUser) {
    this.validateTenantAdmin(adminUser);

    return await db.select({
      id: users.id,
      username: users.username,
      email: users.email,
      fullName: users.fullName,
      role: users.role,
      active: users.active,
      createdAt: users.createdAt,
      lastLogin: users.lastLogin
    })
    .from(users)
    .where(eq(users.tenantId, adminUser.tenantId));
  }
}

export const delegatedAdminService = new DelegatedAdminService();