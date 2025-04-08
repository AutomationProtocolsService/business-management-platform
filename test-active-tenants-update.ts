// Test script to update a tenant to inactive and verify that getActiveTenants filters correctly

import { storage } from './server/storage';

async function testGetActiveTenants() {
  console.log("Testing getActiveTenants() with tenant update...");
  
  try {
    // Get all tenants initially
    const allTenantsInitial = await storage.getAllTenants();
    console.log(`Initial state - All tenants (${allTenantsInitial.length}):`);
    console.log(JSON.stringify(allTenantsInitial.map(t => ({ id: t.id, name: t.name, active: t.active })), null, 2));
    
    // Update the second tenant to be inactive (if it exists)
    if (allTenantsInitial.length > 1) {
      const secondTenantId = allTenantsInitial[1].id;
      console.log(`\nUpdating tenant with ID ${secondTenantId} to inactive...`);
      await storage.updateTenant(secondTenantId, { active: false });
      console.log(`Tenant update complete.`);
    } else {
      console.log("\nOnly one tenant exists. Creating a second tenant that is inactive...");
      await storage.createTenant({
        name: "Inactive Test Tenant",
        subdomain: "inactive",
        active: false,
        status: "trial"
      });
      console.log("Created inactive tenant.");
    }
    
    // Get all tenants after update
    const allTenantsAfter = await storage.getAllTenants();
    console.log(`\nAfter update - All tenants (${allTenantsAfter.length}):`);
    console.log(JSON.stringify(allTenantsAfter.map(t => ({ id: t.id, name: t.name, active: t.active })), null, 2));
    
    // Get only active tenants
    const activeTenants = await storage.getActiveTenants();
    console.log(`\nActive tenants (${activeTenants.length}):`);
    console.log(JSON.stringify(activeTenants.map(t => ({ id: t.id, name: t.name, active: t.active })), null, 2));
    
    // Display results summary
    console.log("\nResults summary:");
    console.log(`Total tenants: ${allTenantsAfter.length}`);
    console.log(`Active tenants: ${activeTenants.length}`);
    console.log(`Inactive tenants: ${allTenantsAfter.length - activeTenants.length}`);
    
    // Verify that all tenants in the active list are actually active
    const allActive = activeTenants.every(tenant => tenant.active === true);
    console.log(`\nVerification - All tenants in active list are actually active: ${allActive ? 'PASS' : 'FAIL'}`);
    
    // Restore the tenant to active state
    if (allTenantsInitial.length > 1) {
      const secondTenantId = allTenantsInitial[1].id;
      console.log(`\nRestoring tenant with ID ${secondTenantId} to active...`);
      await storage.updateTenant(secondTenantId, { active: true });
      console.log(`Tenant restored to active state.`);
    }
  } catch (error) {
    console.error("Error in test:", error);
  }
}

testGetActiveTenants();
