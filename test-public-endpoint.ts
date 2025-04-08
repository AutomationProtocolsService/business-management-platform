// Test script to verify public tenants endpoint filtering

import { storage } from './server/storage';
import axios from 'axios';

async function testPublicTenantsEndpoint() {
  console.log("Testing public tenants endpoint filtering...");
  
  try {
    // Get all tenants
    const allTenantsInitial = await storage.getAllTenants();
    console.log(`Initial state - All tenants (${allTenantsInitial.length}):`);
    console.log(JSON.stringify(allTenantsInitial.map(t => ({ id: t.id, name: t.name, active: t.active })), null, 2));
    
    // Update the second tenant to be inactive
    if (allTenantsInitial.length > 1) {
      const secondTenantId = allTenantsInitial[1].id;
      console.log(`\nUpdating tenant with ID ${secondTenantId} to inactive...`);
      await storage.updateTenant(secondTenantId, { active: false });
      console.log(`Tenant update complete.`);
      
      // Call the API endpoint to get the tenants
      console.log("\nCalling public tenants API endpoint...");
      const response = await axios.get('http://localhost:5000/api/public/tenants');
      console.log(`API response - Tenants returned: ${response.data.length}`);
      console.log(JSON.stringify(response.data.map(t => ({ id: t.id, name: t.name, active: t.active })), null, 2));
      
      // Verify that inactive tenant is not returned
      const inactiveTenantInResponse = response.data.some(t => t.id === secondTenantId);
      console.log(`\nVerification - Inactive tenant excluded from response: ${!inactiveTenantInResponse ? 'PASS' : 'FAIL'}`);
      
      // Restore the tenant to active state
      console.log(`\nRestoring tenant with ID ${secondTenantId} to active...`);
      await storage.updateTenant(secondTenantId, { active: true });
      console.log(`Tenant restored to active state.`);
    } else {
      console.log("\nOnly one tenant exists, can't run this test.");
    }
  } catch (error) {
    console.error("Error in test:", error);
  }
}

testPublicTenantsEndpoint();
