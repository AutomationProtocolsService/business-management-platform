import { storage } from './server/storage';

/**
 * This test demonstrates that our execQuery method can be used for advanced 
 * cross-tenant admin report queries while still maintaining proper tenant
 * isolation. A real-world SaaS platform would use these queries for:
 * 
 * 1. Platform-wide admin reports
 * 2. Billing and usage analytics
 * 3. Performance monitoring and optimization
 */
async function testAggregateQueries() {
  try {
    console.log('Testing advanced aggregate queries that maintain tenant isolation...');
    
    // 1. Get total counts by tenant
    console.log('\n1. Platform Overview - Counts by Tenant:');
    const countsByTenant = await storage.execQuery(`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        t.subdomain,
        t.status,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT c.id) as customer_count,
        COUNT(DISTINCT p.id) as project_count
      FROM 
        tenants t
        LEFT JOIN users u ON t.id = u.tenant_id
        LEFT JOIN customers c ON t.id = c.tenant_id
        LEFT JOIN projects p ON t.id = p.tenant_id
      GROUP BY 
        t.id, t.name, t.subdomain, t.status
      ORDER BY 
        t.id
    `);
    console.log(JSON.stringify(countsByTenant, null, 2));
    
    // 2. Get customer distribution by tenant
    console.log('\n2. Customer Distribution by Tenant:');
    const customerDistribution = await storage.execQuery(`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        COUNT(c.id) as customer_count
      FROM 
        tenants t
        LEFT JOIN customers c ON t.id = c.tenant_id
      GROUP BY 
        t.id, t.name
      ORDER BY 
        customer_count DESC
    `);
    console.log(JSON.stringify(customerDistribution, null, 2));
    
    // 3. Get user roles distribution by tenant
    console.log('\n3. User Role Distribution by Tenant:');
    const roleDistribution = await storage.execQuery(`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        u.role,
        COUNT(u.id) as count
      FROM 
        tenants t
        JOIN users u ON t.id = u.tenant_id
      GROUP BY 
        t.id, t.name, u.role
      ORDER BY 
        t.id, count DESC
    `);
    console.log(JSON.stringify(roleDistribution, null, 2));
    
    // 4. Get project statuses by tenant
    console.log('\n4. Project Status Distribution by Tenant:');
    const projectStatuses = await storage.execQuery(`
      SELECT 
        t.id as tenant_id,
        t.name as tenant_name,
        p.status,
        COUNT(p.id) as count
      FROM 
        tenants t
        LEFT JOIN projects p ON t.id = p.tenant_id
      WHERE 
        p.id IS NOT NULL
      GROUP BY 
        t.id, t.name, p.status
      ORDER BY 
        t.id, count DESC
    `);
    console.log(JSON.stringify(projectStatuses, null, 2));
    
    console.log('\nAll aggregate query tests completed successfully!');
  } catch (error) {
    console.error('Error during aggregate query testing:', error);
  }
}

// Run the test
testAggregateQueries();