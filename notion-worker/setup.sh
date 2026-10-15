#!/usr/bin/env bash
# Landing Literacy: deploy the Notion Worker that saves website leads to Notion.
# Run on your Mac:
#   curl -fsSL https://raw.githubusercontent.com/TMulv/landingliteracy/main/notion-worker/setup.sh | bash
set -euo pipefail

WORKSPACE_ID="1728153c-8a3e-810c-95ae-000316248c6f"   # Mulvey's
DIR="$HOME/landing-literacy-leads"
SRC_URL="https://raw.githubusercontent.com/TMulv/landingliteracy/main/notion-worker/index.ts"
export NOTION_WORKSPACE_ID="$WORKSPACE_ID"
unset NOTION_API_TOKEN || true   # never let a stray token override your login

say() { printf "\n\033[1;34m==>\033[0m %s\n" "$1"; }

say "Checking Node and the Notion CLI"
if ! command -v node >/dev/null; then echo "Node.js 22+ is required: https://nodejs.org"; exit 1; fi
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
if [ "$NODE_MAJOR" -lt 22 ]; then echo "Node.js 22+ is required (you have $(node -v))."; exit 1; fi
if ! command -v ntn >/dev/null; then npm install --global ntn; fi
ntn --version

say "Making sure you're logged in to Notion (Mulvey's workspace)"
if ! ntn whoami >/dev/null 2>&1; then ntn login </dev/tty; fi
ntn whoami || true

say "Setting up the worker project in $DIR"
if [ ! -f "$DIR/package.json" ]; then
  ntn workers new "$DIR" --no-git --install </dev/tty
fi
curl -fsSL "$SRC_URL" -o "$DIR/src/index.ts"
cd "$DIR"
[ -f node_modules/.package-lock.json ] || npm install

say "Deploying"
if [ -f workers.json ]; then ntn workers deploy --yes; else ntn workers deploy --name landing-literacy-leads --yes; fi

say "Connect the worker to Notion"
cat <<'MSG'
Claude already made a Notion connection called "Landing Literacy website" and gave it
access to the Landing Literacy page. Open it here, copy its secret, and paste it below:
  https://app.notion.com/developers/connections
(The secret won't show as you paste. That's normal.)
MSG
printf "Secret: "
read -rs TOKEN </dev/tty
echo
if [ -z "$TOKEN" ]; then echo "No secret entered. Run this script again when you have it."; exit 1; fi
ntn workers env set "NOTION_API_TOKEN=$TOKEN" >/dev/null
unset TOKEN
ntn workers deploy --yes >/dev/null

say "Your webhook URL"
URL=$(ntn workers webhooks list --plain | tr '\t' '\n' | grep -m1 '^https://.*websiteLead' || true)
if [ -z "$URL" ]; then
  ntn workers webhooks list
  echo "Copy the websiteLead URL above and paste it to Claude."
  exit 0
fi
echo "$URL"
printf "%s" "$URL" | pbcopy 2>/dev/null && echo "(copied to your clipboard)"

say "Sending a test lead"
curl -fsS -X POST -H "Content-Type: text/plain" \
  -d '{"source":"inquiry","name":"Test lead (delete me)","email":"test@landingliteracy.com","district":"Setup test","state":"NJ"}' \
  "$URL" >/dev/null && echo "Sent. A 'Test lead (delete me)' row should appear in Website Leads within a minute."

say "Done. Paste the URL above back to Claude to switch the site's forms on."
