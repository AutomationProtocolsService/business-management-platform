import { runMigrations, createMigration, generateSessionMigration, generateUserSessionMigration } from './utils/db-migrations';

/**
 * Test database migrations
 */
async function testMigrations() {
  console.log('Testing database migrations...');
  
  try {
    // Ensure migration directories exist
    console.log('1. Generating migration files if needed');
    generateSessionMigration();
    generateUserSessionMigration();
    
    // Run migrations
    console.log('2. Running migrations');
    const result = await runMigrations();
    console.log(`Migrations applied: ${result.appliedCount}, failed: ${result.failedCount}`);
    
    // Create a test migration if needed
    if (process.argv.includes('--create-test-migration')) {
      console.log('3. Creating test migration');
      const path = createMigration('test_migration');
      console.log(`Created test migration at: ${path}`);
    }
    
    console.log('Database migration test completed successfully');
  } catch (error) {
    console.error('Error testing migrations:', error);
    process.exit(1);
  }
}

// Run the test
testMigrations();