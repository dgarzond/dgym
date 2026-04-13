# Create Issue

User is mid-development and thought of a bug/feature/improvement. Capture it fast so they can keep working.

## Your Goal

Create a complete issue **in Linear** with:
- Clear title
- TL;DR of what this is about
- Current state vs expected outcome
- Relevant files that need touching
- Risk/notes if applicable
- Proper type/priority/effort labels

## How to Get There

**First step (mandatory):** Before asking anything, run these and show the output to the user (requires network access):
```bash
node scripts/create-linear-issue.mjs --list-teams
node scripts/create-linear-issue.mjs --list-milestones
```
The user needs to see teams and milestones to choose. If these commands fail (e.g. fetch error), request network permissions and retry.

**Ask questions** to fill gaps - be concise, respect the user's time. They're mid-flow and want to capture this quickly. Usually need:
- What's the issue/feature
- Current behavior vs desired behavior
- Type (bug/feature/improvement) and priority if not obvious
- **Team ID** – from the teams list shown above
- **Milestone** (optional) – from the milestones list shown above; if they pick one, use `--milestone-id "<id>"` when creating

Keep questions brief. One message with 2-3 targeted questions beats multiple back-and-forths.

**Search for context** only when helpful:
- Web search for best practices if it's a complex feature
- Grep codebase to find relevant files
- Note any risks or dependencies you spot

**Skip what's obvious** - If it's a straightforward bug, don't search web. If type/priority is clear from description, don't ask.

**Keep it fast** - Total exchange under 2min. Be conversational but brief. Get what you need, create ticket, done.

## Create in Linear

- **Project:** Always **dgym**. The script resolves it by name (or use `LINEAR_PROJECT_ID` in .env).
- **Milestones:** You already listed them in the first step. If the user chose one, pass `--milestone-id "<id>"` when creating.

After you have: title, description (TL;DR + current vs expected + files + risks), teamId, priority, and optionally milestoneId:

1. Build the description as markdown (bullet points, clear structure).
2. Map priority: urgent=1, high=2, medium=3, low=4, none=0.
3. Run:
   ```bash
   node scripts/create-linear-issue.mjs --title "..." --description "..." --team-id "<teamId>" [--priority 2] [--milestone-id "<milestoneId>"]
   ```
   (The issue is created in project **dgym** automatically.)
4. If `LINEAR_API_KEY` is missing, tell the user to add it to `.env` (get it from Linear → Settings → API).

## Behavior Rules

- Be conversational - ask what makes sense, not a checklist
- Default priority: normal (3), effort: medium (ask only if unclear)
- Max 3 files in context - most relevant only
- Bullet points over paragraphs
- **Always create the issue in Linear** – don't just output a draft, run the script