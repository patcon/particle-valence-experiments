#!/usr/bin/env bash
set -euo pipefail

git remote get-url origin > /dev/null 2>&1 \
	|| gh repo create --public --source=. --remote=origin --push

gh api --method POST /repos/{owner}/{repo}/pages \
	-f build_type=workflow > /dev/null 2>&1 \
	|| gh api --method PUT /repos/{owner}/{repo}/pages \
		-f build_type=workflow > /dev/null

pages_url=$(gh api repos/{owner}/{repo}/pages --jq '.html_url')
gh repo edit --homepage "$pages_url" > /dev/null

echo "GitHub repo created and Pages enabled via Actions: $pages_url"
