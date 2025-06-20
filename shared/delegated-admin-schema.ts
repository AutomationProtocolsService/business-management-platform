import { pgTable, text, serial, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { users, tenants } from "./schema";

// Teams (for delegated administration)
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  teamAdminId: integer("team_admin_id").references(() => users.id), // Manager who administers this team
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
}, (teams) => ({
  // Unique team name within tenant
  uniqueTeamName: uniqueIndex("team_name_tenant_unique").on(teams.name, teams.tenantId),
}));

// Team Members (users belonging to teams)
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teams.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
  addedBy: integer("added_by").references(() => users.id),
}, (table) => ({
  // Unique user per team
  uniqueUserTeam: uniqueIndex("user_team_unique").on(table.userId, table.teamId),
}));

// Resource Permissions (fine-grained access control)
export const resourcePermissions = pgTable("resource_permissions", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  resourceType: text("resource_type").notNull(), // 'project', 'report', 'quote', 'invoice', etc.
  resourceId: text("resource_id").notNull(), // The actual ID of the resource
  actions: jsonb("actions").$type<string[]>().notNull(), // ['view', 'edit', 'approve', 'comment', 'delete']
  grantedBy: integer("granted_by").references(() => users.id).notNull(),
  grantedAt: timestamp("granted_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"), // Optional expiration
  active: boolean("active").notNull().default(true),
}, (table) => ({
  // Unique permission per user per resource
  uniqueUserResource: uniqueIndex("user_resource_permission_unique").on(
    table.userId, 
    table.resourceType, 
    table.resourceId
  ),
}));

// Permission Templates (for common permission sets)
export const permissionTemplates = pgTable("permission_templates", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  resourceType: text("resource_type").notNull(),
  actions: jsonb("actions").$type<string[]>().notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
}, (templates) => ({
  uniqueTemplateName: uniqueIndex("template_name_tenant_unique").on(templates.name, templates.tenantId),
}));

// User Invitations (for user lifecycle management)
export const userInvitations = pgTable("user_invitations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").references(() => tenants.id).notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("employee"),
  invitedBy: integer("invited_by").references(() => users.id).notNull(),
  invitationToken: text("invitation_token").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, accepted, expired, cancelled
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (invitations) => ({
  uniqueEmailTenant: uniqueIndex("invitation_email_tenant_unique").on(invitations.email, invitations.tenantId),
}));

// Insert schemas
export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
}).extend({
  tenantId: z.number().optional(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  addedAt: true,
});

export const insertResourcePermissionSchema = createInsertSchema(resourcePermissions).omit({
  id: true,
  grantedAt: true,
}).extend({
  tenantId: z.number().optional(),
  actions: z.array(z.enum(['view', 'edit', 'approve', 'comment', 'delete'])),
});

export const insertPermissionTemplateSchema = createInsertSchema(permissionTemplates).omit({
  id: true,
  createdAt: true,
}).extend({
  tenantId: z.number().optional(),
  actions: z.array(z.enum(['view', 'edit', 'approve', 'comment', 'delete'])),
});

export const insertUserInvitationSchema = createInsertSchema(userInvitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
}).extend({
  tenantId: z.number().optional(),
});

// Types
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertResourcePermission = z.infer<typeof insertResourcePermissionSchema>;
export type ResourcePermission = typeof resourcePermissions.$inferSelect;

export type InsertPermissionTemplate = z.infer<typeof insertPermissionTemplateSchema>;
export type PermissionTemplate = typeof permissionTemplates.$inferSelect;

export type InsertUserInvitation = z.infer<typeof insertUserInvitationSchema>;
export type UserInvitation = typeof userInvitations.$inferSelect;

// Database relations
export const teamsRelations = relations(teams, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [teams.tenantId],
    references: [tenants.id]
  }),
  teamAdmin: one(users, {
    fields: [teams.teamAdminId],
    references: [users.id]
  }),
  members: many(teamMembers)
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id]
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id]
  })
}));

export const resourcePermissionsRelations = relations(resourcePermissions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [resourcePermissions.tenantId],
    references: [tenants.id]
  }),
  user: one(users, {
    fields: [resourcePermissions.userId],
    references: [users.id]
  }),
  grantedByUser: one(users, {
    fields: [resourcePermissions.grantedBy],
    references: [users.id]
  })
}));

export const userInvitationsRelations = relations(userInvitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [userInvitations.tenantId],
    references: [tenants.id]
  }),
  invitedByUser: one(users, {
    fields: [userInvitations.invitedBy],
    references: [users.id]
  })
}));