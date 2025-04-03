# GitHub Sync for Replit Deployments

This repository includes a post-deployment system that automatically keeps your GitHub repository in sync with your Replit project. The system commits and pushes all changes to GitHub after each successful deployment.

## How It Works

When you deploy your application on Replit, the system:

1. Detects that a deployment has occurred
2. Runs the post-deployment sync script
3. Commits all changes with a timestamp message
4. Pushes the changes to your GitHub repository

## Running Manually

You can also trigger the GitHub sync manually by running:

```bash
node post-deploy.js
```

Or directly execute the sync script:

```bash
./deploy-sync.sh
```

## Troubleshooting

If the automatic sync fails, you can:

1. Check the console output for error messages
2. Ensure your GitHub repository is properly linked to your Replit project
3. Verify that you have proper permissions for the GitHub repository
4. Run the sync script manually to see detailed error messages

## First-Time Setup

If this is the first time running the sync, make sure:

1. Your GitHub repository is already initialized in the Replit project
2. You've authenticated with GitHub from within Replit
3. The repository has the same main branch name as specified in the script (default: `main`)

## Important Notes

- The sync script will create a commit with a message including a timestamp
- If there are no changes to commit, the script will exit without making a commit
- If there are conflicts between Replit and GitHub, the script may fail and require manual resolution