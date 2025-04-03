/**
 * Post-Deployment Handler for Replit → GitHub Sync
 * 
 * This script should be executed after a successful deployment in Replit.
 * It runs the deployment sync script to push changes to GitHub.
 */

const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

console.log(`${colors.yellow}[Post-Deploy] Starting post-deployment GitHub sync...${colors.reset}`);

try {
  // Log the start time
  const startTime = new Date();
  console.log(`${colors.blue}[Post-Deploy] Started at: ${startTime.toLocaleString()}${colors.reset}`);
  
  // Execute the sync script
  console.log(`${colors.yellow}[Post-Deploy] Executing GitHub sync script...${colors.reset}`);
  const scriptPath = path.join(__dirname, 'deploy-sync.sh');
  
  const output = execSync(scriptPath, { 
    encoding: 'utf8',
    stdio: 'pipe'
  });
  
  console.log(output);
  
  // Calculate duration
  const endTime = new Date();
  const duration = (endTime - startTime) / 1000; // in seconds
  
  console.log(`${colors.green}[Post-Deploy] GitHub sync completed successfully in ${duration.toFixed(2)} seconds${colors.reset}`);
} catch (error) {
  console.error(`${colors.red}[Post-Deploy] Error syncing with GitHub:${colors.reset}`);
  console.error(error.message);
  
  if (error.stdout) {
    console.log(`${colors.yellow}[Post-Deploy] Process output:${colors.reset}`);
    console.log(error.stdout.toString());
  }
  
  if (error.stderr) {
    console.log(`${colors.red}[Post-Deploy] Process error:${colors.reset}`);
    console.log(error.stderr.toString());
  }
  
  console.log(`${colors.yellow}[Post-Deploy] You can still manually sync your changes by running:${colors.reset}`);
  console.log(`${colors.blue}./deploy-sync.sh${colors.reset}`);
}