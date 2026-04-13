# Plan Creation Stage

When the user invokes this command, do the following in order.

## 1. Get the ticket

- **If the user provided a Linear issue identifier** (e.g. `DGYM-123`), use it.
- **Otherwise**, ask: “Which Linear issue should I use? (e.g. DGYM-123)”

## 2. Fetch the ticket

Run:

```bash
node scripts/fetch-linear-issue.mjs <IDENTIFIER>
```

From the output, capture and keep for later:

- **Issue ID** (line `Issue ID: <uuid>`) — needed to create sub-issues.
- **Team ID** (line `Team ID: <uuid>`) — same team for all sub-issues.
- **Title and description** — used to build the plan.

If the script fails (e.g. missing `LINEAR_API_KEY` or issue not found), report the error and stop.

## 3. Build the plan

Using the ticket’s title and description (and any prior context), produce a **markdown plan document** with:

- Clear, minimal, concise steps.
- Status for each step using:
  - 🟩 Done
  - 🟨 In Progress
  - 🟥 To Do
- Dynamic overall progress percentage at the top.
- No extra scope or complexity beyond what the ticket and context clarify.
- Steps that are modular, minimal, and fit the existing codebase.

Use this structure:

```markdown
# Feature Implementation Plan

**Overall Progress:** `0%`

## TLDR
Short summary of what we're building and why.

## Critical Decisions
- Decision 1: [choice] - [brief rationale]
- Decision 2: [choice] - [brief rationale]

## Tasks

- [ ] 🟥 **Step 1: [Name]**
  - [ ] 🟥 Subtask 1
  - [ ] 🟥 Subtask 2

- [ ] 🟥 **Step 2: [Name]**
  - [ ] 🟥 Subtask 1
  - [ ] 🟥 Subtask 2

...
```

Output this plan in your response. Do not add steps that weren’t implied by the ticket or the conversation.

## 4. Create a sub-issue for every step

For **each** main step in the plan (each “Step N: [Name]”):

1. Create a **sub-issue** in Linear linked to the fetched ticket:
   - Use the **Issue ID** from step 2 as the parent.
   - Use the **Team ID** from step 2 for the new issue.

2. Run:

   ```bash
   node scripts/create-linear-issue.mjs --title "Step N: [Name]" --description "[Step summary and subtasks as needed]" --team-id "<Team ID>" --parent-id "<Issue ID>"
   ```

   Use the same `<Team ID>` and `<Issue ID>` for every sub-issue. Adjust title and description to match the step.

3. If the user asked for a specific priority or milestone, use `--priority` and/or `--milestone-id` as in the create-issue command.

Result: the original ticket becomes the parent, and each plan step becomes a **sub-issue** (child) in Linear.

## Behavior rules

- Do not build or write code in this stage; only fetch the ticket, write the plan, and create the sub-issues.
- If the user has not specified an issue identifier, ask once before fetching.
- After creating sub-issues, briefly confirm how many were created and link to the parent issue.
