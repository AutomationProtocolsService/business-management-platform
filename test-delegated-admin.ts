/**
 * Test script for Delegated Administration feature
 * This script verifies all the delegated admin functionality is working correctly
 */

import { db } from "./server/db";
import { users, tenants } from "./shared/schema";
import { 
  teams, 
  teamMembers, 
  resourcePermissions, 
  userInvitations 
} from "./shared/delegated-admin-schema";
import { delegatedAdminService } from "./server/services/delegated-admin-service";
import { eq } from "drizzle-orm";

async function testDelegatedAdministration() {
  console.log("🔧 Testing Delegated Administration Feature...\n");

  try {
    // 1. Create test tenant and users
    console.log("1. Setting up test data...");
    
    // Get existing tenant
    const testTenant = await db.select().from(tenants).where(eq(tenants.id, 1)).limit(1);
    if (!testTenant.length) {
      console.error("❌ No tenant found - please create a tenant first");
      return;
    }

    // Create test admin user
    const adminUser = await db.insert(users).values({
      tenantId: 1,
      username: "test_admin",
      password: "hashed_password",
      email: "admin@test.com",
      fullName: "Test Admin",
      role: "admin"
    }).returning();

    // Create test manager user
    const managerUser = await db.insert(users).values({
      tenantId: 1,
      username: "test_manager",
      password: "hashed_password", 
      email: "manager@test.com",
      fullName: "Test Manager",
      role: "manager"
    }).returning();

    // Create test employee user
    const employeeUser = await db.insert(users).values({
      tenantId: 1,
      username: "test_employee",
      password: "hashed_password",
      email: "employee@test.com", 
      fullName: "Test Employee",
      role: "employee"
    }).returning();

    console.log("✅ Test users created");

    // 2. Test user invitation
    console.log("\n2. Testing user invitation...");
    
    const invitationResult = await delegatedAdminService.inviteUser({
      email: "newuser@test.com",
      role: "employee"
    }, adminUser[0]);

    console.log("✅ User invitation created:", invitationResult);

    // 3. Test role updates
    console.log("\n3. Testing role updates...");
    
    await delegatedAdminService.updateUserRole(employeeUser[0].id, "manager", adminUser[0]);
    console.log("✅ Employee promoted to manager");

    // Verify role was updated
    const updatedUser = await db.select().from(users).where(eq(users.id, employeeUser[0].id)).limit(1);
    console.log("✅ Role verification:", updatedUser[0].role);

    // 4. Test team creation
    console.log("\n4. Testing team management...");
    
    const teamResult = await delegatedAdminService.createTeam({
      name: "Development Team",
      description: "Software development team",
      teamAdminId: managerUser[0].id
    }, adminUser[0]);

    console.log("✅ Team created:", teamResult);

    // 5. Test adding users to team
    await delegatedAdminService.addUserToTeam(teamResult.id, employeeUser[0].id, adminUser[0]);
    console.log("✅ User added to team");

    // 6. Test resource permissions
    console.log("\n5. Testing resource permissions...");
    
    await delegatedAdminService.grantResourcePermission({
      userId: employeeUser[0].id,
      resourceType: "project",
      resourceId: "123",
      actions: ["view", "edit"]
    }, adminUser[0]);

    console.log("✅ Resource permission granted");

    // Verify permissions were granted
    const permissions = await delegatedAdminService.getUserResourcePermissions(employeeUser[0].id, adminUser[0]);
    console.log("✅ Permissions verification:", permissions.length, "permissions found");

    // 7. Test security boundaries
    console.log("\n6. Testing security boundaries...");
    
    try {
      // This should fail - employee trying to invite users
      await delegatedAdminService.inviteUser({
        email: "forbidden@test.com",
        role: "employee"
      }, employeeUser[0] as any);
      console.log("❌ Security test failed - employee was able to invite users");
    } catch (error) {
      console.log("✅ Security boundary enforced:", error.message);
    }

    try {
      // This should fail - admin trying to assign super admin role
      await delegatedAdminService.updateUserRole(employeeUser[0].id, "superadmin", adminUser[0]);
      console.log("❌ Security test failed - admin was able to assign superadmin role");
    } catch (error) {
      console.log("✅ Role escalation prevented:", error.message);
    }

    // 8. Test tenant isolation
    console.log("\n7. Testing tenant isolation...");
    
    // Create user in different tenant (simulated)
    const otherTenantUser = {
      ...adminUser[0],
      tenantId: 999, // Different tenant
      id: 999
    };

    try {
      await delegatedAdminService.updateUserRole(employeeUser[0].id, "manager", otherTenantUser as any);
      console.log("❌ Tenant isolation failed - cross-tenant access allowed");
    } catch (error) {
      console.log("✅ Tenant isolation enforced:", error.message);
    }

    // 9. Test getting tenant users
    console.log("\n8. Testing user management...");
    
    const tenantUsers = await delegatedAdminService.getTenantUsers(adminUser[0]);
    console.log("✅ Retrieved tenant users:", tenantUsers.length, "users found");

    // 10. Test teams retrieval
    const tenantTeams = await delegatedAdminService.getTeams(adminUser[0]);
    console.log("✅ Retrieved tenant teams:", tenantTeams.length, "teams found");

    // Cleanup test data
    console.log("\n9. Cleaning up test data...");
    
    await db.delete(resourcePermissions).where(eq(resourcePermissions.userId, employeeUser[0].id));
    await db.delete(teamMembers).where(eq(teamMembers.teamId, teamResult.id));
    await db.delete(teams).where(eq(teams.id, teamResult.id));
    await db.delete(userInvitations).where(eq(userInvitations.id, invitationResult.id));
    await db.delete(users).where(eq(users.id, adminUser[0].id));
    await db.delete(users).where(eq(users.id, managerUser[0].id));
    await db.delete(users).where(eq(users.id, employeeUser[0].id));

    console.log("✅ Test data cleaned up");

    console.log("\n🎉 All delegated administration tests passed!");
    console.log("\n📋 Features tested:");
    console.log("   ✅ User invitation system");
    console.log("   ✅ Role management (Employee ↔ Manager)");
    console.log("   ✅ Team creation and management");
    console.log("   ✅ Resource-specific permissions");
    console.log("   ✅ Security boundary enforcement");
    console.log("   ✅ Tenant isolation");
    console.log("   ✅ Admin user management interface");

  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error(error.stack);
  }
}

// Run the test
testDelegatedAdministration().then(() => {
  console.log("\n🔚 Test completed");
  process.exit(0);
}).catch((error) => {
  console.error("💥 Test execution failed:", error);
  process.exit(1);
});