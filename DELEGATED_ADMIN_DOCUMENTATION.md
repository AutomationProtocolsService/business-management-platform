# Delegated Administration Feature Documentation

## Overview

The Delegated Administration feature empowers tenant Admins to manage user access within their organization in a granular way, moving beyond simple role assignment. This implementation provides fine-grained permission management while maintaining strict security boundaries and tenant isolation.

## Architecture

### Database Schema

The feature introduces five new tables:

1. **teams** - Groups of users within a tenant
2. **team_members** - Many-to-many relationship between teams and users
3. **resource_permissions** - Fine-grained resource-specific permissions
4. **permission_templates** - Reusable permission sets
5. **user_invitations** - User lifecycle management

### Security Model

- **Tenant Isolation**: All operations are strictly scoped to the admin's tenant
- **Role Hierarchy**: Admins cannot assign roles higher than their own
- **Resource Scoping**: Permissions are limited to predefined resource types and actions
- **Team Administration**: Managers can be delegated as team administrators

## API Endpoints

### User Lifecycle Management

#### Invite User
```http
POST /api/admin/users/invite
Content-Type: application/json

{
  "email": "newuser@company.com",
  "role": "employee"
}
```

#### Update User Role
```http
PUT /api/admin/users/role
Content-Type: application/json

{
  "userId": 123,
  "role": "manager"
}
```

#### Disable/Enable User
```http
PUT /api/admin/users/disable
PUT /api/admin/users/enable
Content-Type: application/json

{
  "userId": 123
}
```

#### Remove User
```http
DELETE /api/admin/users/remove
Content-Type: application/json

{
  "userId": 123
}
```

#### Get All Tenant Users
```http
GET /api/admin/users
```

### Fine-Grained Permission Management

#### Grant Resource Permission
```http
POST /api/admin/permissions
Content-Type: application/json

{
  "userId": 123,
  "resourceType": "project",
  "resourceId": "456",
  "actions": ["view", "edit", "comment"]
}
```

#### Revoke Resource Permission
```http
DELETE /api/admin/permissions
Content-Type: application/json

{
  "userId": 123,
  "resourceType": "project",
  "resourceId": "456"
}
```

#### Get User Permissions
```http
GET /api/admin/permissions/:userId
```

### Team Management

#### Create Team
```http
POST /api/admin/teams
Content-Type: application/json

{
  "name": "Development Team",
  "description": "Software development team",
  "teamAdminId": 456
}
```

#### Update Team
```http
PUT /api/admin/teams/:teamId
Content-Type: application/json

{
  "name": "Updated Team Name",
  "teamAdminId": 789
}
```

#### Add User to Team
```http
POST /api/admin/teams/members
Content-Type: application/json

{
  "teamId": 123,
  "userId": 456
}
```

#### Remove User from Team
```http
DELETE /api/admin/teams/members
Content-Type: application/json

{
  "teamId": 123,
  "userId": 456
}
```

#### Get Teams
```http
GET /api/admin/teams
```

#### Get Team Members
```http
GET /api/admin/teams/:teamId/members
```

### Permission Templates

#### Create Permission Template
```http
POST /api/admin/permission-templates
Content-Type: application/json

{
  "name": "Project Viewer",
  "description": "Can view and comment on projects",
  "resourceType": "project",
  "actions": ["view", "comment"]
}
```

## Security Boundaries

### What Admins CAN Do:
- Invite, disable, and remove users within their tenant
- Change user roles between Employee and Manager
- Grant/revoke resource-specific permissions
- Create and manage teams
- Assign Managers as team administrators

### What Admins CANNOT Do:
- Access users or data from other tenants
- Assign Super Admin role or any role higher than their own
- Create new fundamental roles or action types
- Access system-level configuration
- Modify users outside their tenant boundary

## Supported Resource Types and Actions

### Resource Types:
- `project` - Project-specific access
- `report` - Report-specific access
- `quote` - Quote-specific access
- `invoice` - Invoice-specific access

### Actions:
- `view` - Read access to the resource
- `edit` - Modify access to the resource
- `approve` - Approval permissions
- `comment` - Add comments/notes
- `delete` - Delete access (when applicable)

## Business Logic

### Role Hierarchy
```
Employee (1) < Manager (2) < Admin (3) < Super Admin (System Level)
```

### Permission Inheritance
- Resource-specific permissions override base role permissions for that resource
- Team membership doesn't grant additional permissions by default
- Team admins can manage their team members but cannot grant permissions

### Invitation Flow
1. Admin creates invitation with email and role
2. System generates unique invitation token with expiration
3. Invitation email sent to user (implementation dependent)
4. User accepts invitation and creates account
5. User automatically assigned to correct tenant and role

## Error Handling

### Common Error Responses

#### 401 Unauthorized
```json
{
  "error": "Authentication required"
}
```

#### 403 Forbidden
```json
{
  "error": "Admin access required"
}
```

#### 400 Bad Request - Cross Tenant Access
```json
{
  "error": "Target user not found in your tenant"
}
```

#### 400 Bad Request - Role Escalation
```json
{
  "error": "Cannot assign role higher than your own"
}
```

#### 400 Bad Request - Invalid Actions
```json
{
  "error": "Invalid actions: unauthorized_action"
}
```

## Implementation Details

### Service Layer
The `DelegatedAdminService` class handles all business logic with methods:
- `inviteUser()` - Handle user invitations
- `updateUserRole()` - Change user roles with validation
- `grantResourcePermission()` - Fine-grained permission management
- `createTeam()` - Team management
- Security validation methods for tenant isolation

### Database Constraints
- Unique constraints prevent duplicate permissions
- Foreign key constraints ensure referential integrity
- Indexes optimize query performance for tenant-scoped operations

### Validation
- Zod schemas validate all input data
- Role hierarchy validation prevents privilege escalation
- Tenant boundary checks on all operations

## Usage Examples

### Scenario 1: Project Manager Access
Admin wants to give an employee access to edit a specific project:

```javascript
// Grant project-specific permissions
await fetch('/api/admin/permissions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 123,
    resourceType: 'project',
    resourceId: '456',
    actions: ['view', 'edit', 'comment']
  })
});
```

### Scenario 2: Team Structure
Admin creates a development team and assigns a manager as team admin:

```javascript
// Create team
const team = await fetch('/api/admin/teams', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Frontend Team',
    description: 'Frontend development team',
    teamAdminId: 789 // Manager user ID
  })
});

// Add team members
await fetch('/api/admin/teams/members', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    teamId: team.id,
    userId: 123
  })
});
```

### Scenario 3: User Onboarding
Admin invites new employee:

```javascript
// Send invitation
const invitation = await fetch('/api/admin/users/invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newemployee@company.com',
    role: 'employee'
  })
});

// Invitation token sent via email for account creation
```

## Testing

Run the comprehensive test suite:

```bash
npx tsx test-delegated-admin.ts
```

This tests all features including:
- User lifecycle management
- Role updates with security validation
- Team creation and management
- Resource permission management
- Security boundary enforcement
- Tenant isolation

## Future Enhancements

### Potential Extensions:
1. **Conditional Permissions** - Time-based or condition-based access
2. **Permission Inheritance** - Team-based permission inheritance
3. **Audit Logging** - Track all admin actions
4. **Bulk Operations** - Batch user management
5. **Custom Resource Types** - Admin-defined resource types
6. **Advanced Team Hierarchies** - Nested team structures

### Integration Points:
- Email service for invitation management
- Frontend admin dashboard
- Audit logging system
- Role-based UI components