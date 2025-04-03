#!/bin/bash

# Script to sync Replit project with GitHub after deployment
# This script commits and pushes all changes to your GitHub repository

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting GitHub sync process...${NC}"

# Check if git is configured
if ! git config --get user.name > /dev/null || ! git config --get user.email > /dev/null; then
  echo -e "${YELLOW}Git user not configured. Setting up temporary git user for this sync...${NC}"
  git config --global user.name "Replit Deploy Bot"
  git config --global user.email "deploy-bot@example.com"
fi

# Create a deployment commit message with timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
COMMIT_MSG="Deployed changes from Replit on $TIMESTAMP"

# Check for changes
if [ -z "$(git status --porcelain)" ]; then
  echo -e "${GREEN}No changes to sync. Your GitHub repository is up to date.${NC}"
  exit 0
fi

# Show changes to be committed
echo -e "${YELLOW}Changes detected:${NC}"
git status -s

# Add all changes
echo -e "${YELLOW}Adding changes to git...${NC}"
git add -A

# Commit changes
echo -e "${YELLOW}Committing changes...${NC}"
if git commit -m "$COMMIT_MSG"; then
  echo -e "${GREEN}Changes committed successfully.${NC}"
else
  echo -e "${RED}Failed to commit changes.${NC}"
  exit 1
fi

# Push to GitHub
echo -e "${YELLOW}Pushing changes to GitHub...${NC}"
if git push origin main; then
  echo -e "${GREEN}Successfully synced changes to GitHub!${NC}"
else
  echo -e "${RED}Failed to push changes to GitHub.${NC}"
  echo -e "${YELLOW}You may need to run 'git pull' to sync remote changes first.${NC}"
  exit 1
fi

echo -e "${GREEN}GitHub sync completed successfully.${NC}"