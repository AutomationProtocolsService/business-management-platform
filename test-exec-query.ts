import { storage } from './server/storage';

async function testExecQuery() {
  try {
    console.log('Testing execQuery method...');
    
    // Test with a valid query for all tenants
    const result1 = await storage.execQuery('SELECT * FROM tenants');
    console.log('All tenants:');
    console.log(JSON.stringify(result1, null, 2));
    
    // Test with a parameterized query
    const result2 = await storage.execQuery(
      'SELECT * FROM customers WHERE tenant_id = $1',
      [1]
    );
    console.log('\nTenant 1 customers:');
    console.log(JSON.stringify(result2, null, 2));
    
    // Test with another tenant
    const result3 = await storage.execQuery(
      'SELECT * FROM customers WHERE tenant_id = $1',
      [2]
    );
    console.log('\nTenant 2 customers:');
    console.log(JSON.stringify(result3, null, 2));
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error testing execQuery:', error);
  }
}

// Run the test
testExecQuery();