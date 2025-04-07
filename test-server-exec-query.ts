import { storage } from './server/storage';

async function testServerExecQuery() {
  try {
    console.log('Testing execQuery method directly on server...');
    
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
    
    // Execute a join query
    const result3 = await storage.execQuery(`
      SELECT c.*, p.name as project_name, p.status as project_status
      FROM customers c
      LEFT JOIN projects p ON c.id = p.customer_id AND c.tenant_id = p.tenant_id
      WHERE c.tenant_id = $1
      LIMIT 10
    `, [1]);
    console.log('\nTenant 1 customers with projects:');
    console.log(JSON.stringify(result3, null, 2));
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error testing execQuery:', error);
  }
}

// Run the test
testServerExecQuery();