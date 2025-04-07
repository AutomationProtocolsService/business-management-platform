import { storage } from './server/storage';
import { client } from './server/db';

async function testAdvancedExecQuery() {
  try {
    console.log('Testing advanced execQuery functionality...');
    
    // 1. Test a complex aggregate query
    console.log('\n1. Running complex aggregate query:');
    const aggregateQuery = `
      SELECT 
        t.id as tenant_id, 
        t.name as tenant_name,
        COUNT(DISTINCT c.id) as customer_count,
        COUNT(DISTINCT p.id) as project_count
      FROM 
        tenants t
        LEFT JOIN customers c ON t.id = c.tenant_id
        LEFT JOIN projects p ON t.id = p.tenant_id
      GROUP BY 
        t.id, t.name
      ORDER BY 
        t.id
    `;
    
    const aggregateResult = await storage.execQuery(aggregateQuery);
    console.log(JSON.stringify(aggregateResult, null, 2));
    
    // 2. Test transaction support using postgres.js transaction API
    console.log('\n2. Testing transaction support with postgres.js:');
    
    // Use the proper postgres.js transaction API
    let customerId: number | undefined;
    let projectId: number | undefined;
    
    try {
      // postgres.js uses a special transaction API
      await client.begin(async (txClient) => {
        // Format dates as ISO strings for postgres.js
        const now = new Date().toISOString();
        
        // Do several operations in a transaction
        const insertCustomerResult = await txClient.unsafe(
          'INSERT INTO customers (name, email, tenant_id, created_at, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          ['Transaction Test Customer', 'transaction@example.com', 1, now, 1]
        );
        
        customerId = insertCustomerResult[0]?.id;
        console.log(`Inserted customer with ID: ${customerId}`);
        
        if (!customerId) {
          throw new Error('Failed to insert customer');
        }
        
        // Insert a related record
        const insertProjectResult = await txClient.unsafe(
          'INSERT INTO projects (name, status, tenant_id, customer_id, created_at) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          ['Transaction Test Project', 'planning', 1, customerId, now]
        );
        
        projectId = insertProjectResult[0]?.id;
        console.log(`Inserted project with ID: ${projectId}`);
        
        // Transaction is automatically committed if no errors
      });
      
      console.log('Transaction committed!');
      
      // Verify the data was inserted
      if (customerId) {
        const verifyResult = await storage.execQuery(
          'SELECT c.*, p.id as project_id, p.name as project_name FROM customers c LEFT JOIN projects p ON c.id = p.customer_id WHERE c.id = $1',
          [customerId]
        );
        console.log('Verification query result:');
        console.log(JSON.stringify(verifyResult, null, 2));
      }
      
    } catch (error) {
      // Transaction is automatically rolled back on error
      console.error('Transaction rolled back due to error:', error);
      throw error;
    }
    
    // 3. Test a dynamic query builder
    console.log('\n3. Testing dynamic query building:');
    
    function buildDynamicQuery(filters: any) {
      let query = 'SELECT * FROM customers WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;
      
      if (filters.tenantId) {
        query += ` AND tenant_id = $${paramIndex}`;
        params.push(filters.tenantId);
        paramIndex++;
      }
      
      if (filters.name) {
        query += ` AND name ILIKE $${paramIndex}`;
        params.push(`%${filters.name}%`);
        paramIndex++;
      }
      
      if (filters.email) {
        query += ` AND email ILIKE $${paramIndex}`;
        params.push(`%${filters.email}%`);
        paramIndex++;
      }
      
      if (filters.createdAfter) {
        query += ` AND created_at > $${paramIndex}`;
        params.push(filters.createdAfter);
        paramIndex++;
      }
      
      if (filters.orderBy) {
        query += ` ORDER BY ${filters.orderBy}`;
        if (filters.orderDirection) {
          query += ` ${filters.orderDirection}`;
        }
      }
      
      if (filters.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
        paramIndex++;
      }
      
      return { query, params };
    }
    
    // Test the dynamic query builder with different filter combinations
    const filters = [
      { tenantId: 1 },
      { tenantId: 1, name: 'customer' },
      { tenantId: 1, email: 'example' },
      { tenantId: 1, orderBy: 'created_at', orderDirection: 'DESC', limit: 5 }
    ];
    
    for (const filter of filters) {
      const { query, params } = buildDynamicQuery(filter);
      console.log(`\nBuilt query: ${query}`);
      console.log(`With params: ${JSON.stringify(params)}`);
      
      const result = await storage.execQuery(query, params);
      console.log(`Results count: ${result.length}`);
      console.log(JSON.stringify(result.slice(0, 2), null, 2)); // Show just the first two results
    }
    
    console.log('\nAll advanced tests completed successfully!');
  } catch (error) {
    console.error('Error during advanced execQuery testing:', error);
  }
}

// Run the test
testAdvancedExecQuery();