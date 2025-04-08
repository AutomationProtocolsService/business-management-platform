// Test script to verify tenant filtering and getActiveTenants() functionality

import { storage } from './server/storage';

async function testGetActiveTenants() {
  console.log("Testing getActiveTenants()...");
  
  try {
    // Get all tenants
    const allTenants = await storage.getAllTenants();
    console.log(`All tenants (${allTenants.length}):`);
    console.log(JSON.stringify(allTenants.map(t => ({ id: t.id, name: t.name, active: t.active })), null, 2));
    
    // Get only active tenants
    const activeTenants = await storage.getActiveTenants();
    console.log(`\nActive tenants (${activeTenants.length}):`);
    console.log(JSON.stringify(activeTenants.map(t => ({ id: t.id, name: t.name, active: t.active })), null, 2));
    
    // Display results summary
    console.log("\nResults summary:");
    console.log(`Total tenants: ${allTenants.length}`);
    console.log(`Active tenants: ${activeTenants.length}`);
    console.log(`Inactive tenants: ${allTenants.length - activeTenants.length}`);
    
    if (activeTenants.length === allTenants.length) {
      console.log("\nAll tenants are active. To test filtering, update a tenant to be inactive:");
      console.log("await storage.updateTenant(tenantId, { active: false });");
    }
  } catch (error) {
    console.error("Error testing getActiveTenants():", error);
  }
}

testGetActiveTenants();
