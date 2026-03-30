#!/usr/bin/env node
/**
 * Mark a Linear issue as Done by identifier (e.g. DGD-39).
 *
 * Usage:
 *   node scripts/mark-linear-issue-done.mjs DGD-39
 *   node scripts/mark-linear-issue-done.mjs --identifier DGD-39
 *
 * Notes:
 * - Uses LINEAR_API_KEY from .env (repo root).
 * - Resolves the team's workflow state by name. Prefers "Done", falls back to common equivalents.
 */
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
 
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });
 
const LINEAR_API_URL = 'https://api.linear.app/graphql';
const API_KEY = process.env.LINEAR_API_KEY;
 
async function graphql(query, variables = {}) {
  const res = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: API_KEY || '',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}
 
function parseIdentifier(identifier) {
  const match = String(identifier).trim().match(/^([A-Za-z]+)-(\d+)$/);
  if (!match) throw new Error(`Invalid identifier "${identifier}" (expected e.g. DGD-39)`);
  return { teamKey: match[1], number: parseFloat(match[2], 10) };
}
 
function parseArgs() {
  const args = process.argv.slice(2);
  const identifier =
    args.find((a) => a.startsWith('--identifier='))?.split('=')[1] ||
    (args.includes('--identifier') && args[args.indexOf('--identifier') + 1]) ||
    (args[0] && !args[0].startsWith('--') ? args[0] : null);
  return identifier;
}
 
async function fetchIssue(identifier) {
  const { teamKey, number } = parseIdentifier(identifier);
  const data = await graphql(
    `
    query($teamKey: String!, $number: Float!) {
      issues(
        filter: { team: { key: { eq: $teamKey } }, number: { eq: $number } }
        first: 1
      ) {
        nodes {
          id
          identifier
          title
          url
          state { id name }
          team { id key name }
        }
      }
    }
  `,
    { teamKey, number }
  );
  const node = data.issues?.nodes?.[0];
  if (!node) throw new Error(`Issue "${identifier}" not found`);
  return node;
}
 
async function fetchTeamStates(teamId) {
  const data = await graphql(
    `
    query($id: String!) {
      team(id: $id) {
        id
        key
        name
        states {
          nodes { id name type }
        }
      }
    }
  `,
    { id: teamId }
  );
  const team = data.team;
  if (!team) throw new Error('Team not found');
  return team.states?.nodes || [];
}
 
function pickDoneStateId(states) {
  const preferredNames = [
    'Done',
    'Completed',
    'Complete',
    'Finished',
    'Closed',
  ];
  const byName = (name) => states.find((s) => String(s.name).toLowerCase() === name.toLowerCase());
  for (const n of preferredNames) {
    const s = byName(n);
    if (s?.id) return s.id;
  }
  // Fallback: pick the first state whose name contains "done"
  const containsDone = states.find((s) => String(s.name).toLowerCase().includes('done'));
  if (containsDone?.id) return containsDone.id;
  return null;
}
 
async function updateIssueState(issueId, stateId) {
  const data = await graphql(
    `
    mutation($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { id identifier title url state { name } }
      }
    }
  `,
    { id: issueId, input: { stateId } }
  );
  return data.issueUpdate;
}
 
async function main() {
  if (!API_KEY) {
    console.error('❌ LINEAR_API_KEY is not set in .env (Linear → Settings → API)');
    process.exit(1);
  }
  const identifier = parseArgs();
  if (!identifier) {
    console.error('Usage: node scripts/mark-linear-issue-done.mjs <IDENTIFIER>');
    console.error('Example: node scripts/mark-linear-issue-done.mjs DGD-39');
    process.exit(1);
  }
 
  const issue = await fetchIssue(identifier.trim());
  const states = await fetchTeamStates(issue.team.id);
  const doneStateId = pickDoneStateId(states);
  if (!doneStateId) {
    const names = states.map((s) => s.name).filter(Boolean).join(', ');
    throw new Error(`Could not find a "Done" state for team ${issue.team.key}. Available: ${names}`);
  }
 
  const result = await updateIssueState(issue.id, doneStateId);
  if (!result?.success) {
    console.error('❌ Could not update issue state');
    process.exit(1);
  }
  console.log(`✅ Marked as Done: ${result.issue.identifier} — ${result.issue.title}`);
  if (result.issue?.state?.name) console.log(`State: ${result.issue.state.name}`);
  if (result.issue?.url) console.log(`URL: ${result.issue.url}`);
}
 
main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});

