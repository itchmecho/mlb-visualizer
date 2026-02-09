#!/bin/bash
# deploy.sh - Build, commit, and push in one command
# Usage: ./scripts/deploy.sh "commit message"

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/deploy.sh \"commit message\""
  exit 1
fi

MESSAGE="$1

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

echo "Building..."
npm run build

echo "Staging changes..."
git add -A
git reset HEAD -- .claude/ 2>/dev/null || true

echo "Committing..."
SKIP_DEPLOY_CHECK=1 git commit -m "$MESSAGE"

echo "Pushing..."
git push

echo "Done!"
