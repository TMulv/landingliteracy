# Website leads → Notion

`index.ts` is a Notion Worker with one webhook, `websiteLead`. The site's inquiry form and the free-resource download gate both send to it, and each submission becomes a row in **Website Leads** (Mulvey's workspace › Landing Literacy).

## Setup (one time, on your Mac)

1. In Notion, a connection called **Landing Literacy website** must exist and have access to the Landing Literacy page.
2. Run:

   ```
   curl -fsSL https://raw.githubusercontent.com/TMulv/landingliteracy/main/notion-worker/setup.sh | bash
   ```

   It logs you in if needed, deploys the worker, asks for the connection's secret (hidden as you paste), and prints the webhook URL.
3. Put that URL in `CONFIG.leadsEndpoint` in `assets/js/site.js`.

## Changing the worker later

Edit `index.ts` here and push, then re-run the setup command above. It pulls the latest `index.ts`, redeploys, and skips the secret prompt once the worker is connected.

Debugging: `ntn workers runs list` and `ntn workers runs logs <run-id>`.
