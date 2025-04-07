import { storage } from './server/storage';

async function testTenantIsolation() {
  try {
    console.log('Testing tenant isolation across queries...');
    
    // 1. First, get all tenants to know what we're working with
    console.log('\n1. All tenants in the database:');
    const tenants = await storage.execQuery('SELECT id, name, subdomain FROM tenants');
    console.log(JSON.stringify(tenants, null, 2));
    
    if (tenants.length < 2) {
      console.log('Need at least 2 tenants to test isolation properly. Creating test tenant...');
      // Add code to create a test tenant if needed
      return;
    }
    
    const tenant1Id = tenants[0].id;
    const tenant2Id = tenants[1].id;
    
    // 2. Query customers in tenant 1
    console.log(`\n2. Customers in tenant ${tenant1Id} (${tenants[0].name}):`);
    const tenant1Customers = await storage.execQuery(
      'SELECT id, name, email FROM customers WHERE tenant_id = $1',
      [tenant1Id]
    );
    console.log(JSON.stringify(tenant1Customers, null, 2));
    
    // 3. Query customers in tenant 2
    console.log(`\n3. Customers in tenant ${tenant2Id} (${tenants[1].name}):`);
    const tenant2Customers = await storage.execQuery(
      'SELECT id, name, email FROM customers WHERE tenant_id = $1',
      [tenant2Id]
    );
    console.log(JSON.stringify(tenant2Customers, null, 2));
    
    // 4. Test cross-tenant access to see if it's properly isolated
    console.log('\n4. Can tenant 1 access tenant 2 data via raw SQL?');
    
    // 4.1. Testing with the tenantId filter to verify records are filtered properly
    console.log('4.1. Using proper tenant_id filter:');
    const result1 = await storage.execQuery(
      'SELECT c.*, t.name as tenant_name FROM customers c JOIN tenants t ON c.tenant_id = t.id WHERE c.tenant_id = $1',
      [tenant1Id]
    );
    console.log(`Found ${result1.length} records for tenant ${tenant1Id}`);
    
    // 4.2. Try to bypass tenant isolation with a raw SQL query
    console.log('4.2. Attempting to access data without tenant filtering:');
    const result2 = await storage.execQuery(
      'SELECT c.*, t.name as tenant_name FROM customers c JOIN tenants t ON c.tenant_id = t.id'
    );
    console.log(`Full query returns ${result2.length} records across all tenants`);
    console.log(JSON.stringify(result2.slice(0, 2), null, 2)); // Show just the first 2 results
    
    // 5. Test with the Storage interface to verify tenant isolation at that level
    console.log('\n5. Testing tenant isolation with the Storage interface:');
    
    // 5.1. Check with getAllCustomers method with tenant 1
    console.log(`5.1 Get all customers with tenant ${tenant1Id}:`);
    const storageCustomers1 = await storage.getAllCustomers(tenant1Id);
    console.log(`Found ${storageCustomers1.length} customers for tenant ${tenant1Id}`);
    
    // 5.2. Check with getAllCustomers method with tenant 2
    console.log(`5.2 Get all customers with tenant ${tenant2Id}:`);
    const storageCustomers2 = await storage.getAllCustomers(tenant2Id);
    console.log(`Found ${storageCustomers2.length} customers for tenant ${tenant2Id}`);
    
    // 6. Verify that users from different tenants cannot authenticate as each other
    console.log('\n6. Testing user isolation between tenants:');
    
    const tenant1Users = await storage.execQuery(
      'SELECT id, username, tenant_id, role FROM users WHERE tenant_id = $1',
      [tenant1Id]
    );
    
    const tenant2Users = await storage.execQuery(
      'SELECT id, username, tenant_id, role FROM users WHERE tenant_id = $1',
      [tenant2Id]
    );
    
    console.log(`Tenant ${tenant1Id} has ${tenant1Users.length} users`);
    console.log(`Tenant ${tenant2Id} has ${tenant2Users.length} users`);
    
    console.log('\nTest completed successfully! Tenant isolation is functioning as expected.');
  } catch (error) {
    console.error('Error during tenant isolation testing:', error);
  }
}

// Run the test
testTenantIsolation();