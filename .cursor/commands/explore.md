# Initial Exploration Stage

Your task is NOT to implement this yet, but to fully understand and prepare.

## When the user gives a ticket number

If the user provides a **Linear ticket identifier** (e.g. `DGYM-42` or `DGYM-123`):

1. **Fetch the issue** from Linear first:
   ```bash
   node scripts/fetch-linear-issue.mjs <IDENTIFIER>
   ```
   Example: `node scripts/fetch-linear-issue.mjs DGYM-42`
2. Use the fetched **title and description** as the feature/problem description for the exploration below.
3. If `LINEAR_API_KEY` is missing in `.env`, ask the user to add it (Linear → Settings → API) and continue by asking them to paste the issue content instead.

If no ticket number is given, ask the user to describe the problem or feature (or to provide a Linear ticket identifier).

---

Your responsibilities:

- Analyze and understand the existing codebase thoroughly.
- Determine exactly how this feature integrates, including dependencies, structure, edge cases (within reason, don't go overboard), and constraints.
- Clearly identify anything unclear or ambiguous in my description or the current implementation.
- List clearly all questions or ambiguities you need clarified.

Remember, your job is not to implement (yet). Just exploring, planning, and then asking me questions to ensure all ambiguities are covered. We will go back and forth until you have no further questions. Do NOT assume any requirements or scope beyond explicitly described details.

Please confirm that you fully understand and I will describe the problem I want to solve and the feature in a detailed manner.