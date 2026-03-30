#!/usr/bin/env node
/**
 * Fetch an issue from Linear by identifier (e.g. DGYM-123).
 * Prints title, description, and metadata for use by explore and other commands.
 *
 * Usage:
 *   node scripts/fetch-linear-issue.mjs DGYM-123
 *   node scripts/fetch-linear-issue.mjs --identifier DGYM-123
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
  if (!match) throw new Error(`Invalid identifier "${identifier}" (expected e.g. DGYM-42)`);
  return { teamKey: match[1], number: parseFloat(match[2], 10) };
}

async function fetchIssue(identifier) {
  const { teamKey, number } = parseIdentifier(identifier);
  const data = await graphql(
    `
    query($teamKey: String!, $number: Float!) {
      issues(
        filter: {
          team: { key: { eq: $teamKey } }
          number: { eq: $number }
        }
        first: 1
      ) {
        nodes {
          id
          identifier
          title
          description
          url
          state { name }
          priority
          project { name }
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

function parseArgs() {
  const args = process.argv.slice(2);
  const identifier = args.find((a) => a.startsWith('--identifier='))?.split('=')[1]
    || (args.includes('--identifier') && args[args.indexOf('--identifier') + 1])
    || (args[0] && !args[0].startsWith('--') ? args[0] : null);
  return identifier;
}

async function main() {
  if (!API_KEY) {
    console.error('❌ LINEAR_API_KEY is not set in .env (Linear → Settings → API)');
    process.exit(1);
  }
  const identifier = parseArgs();
  if (!identifier) {
    console.error('Usage: node scripts/fetch-linear-issue.mjs <IDENTIFIER>');
    console.error('Example: node scripts/fetch-linear-issue.mjs DGYM-123');
    process.exit(1);
  }
  const issue = await fetchIssue(identifier.trim());
  // Output as readable text for the explore command (title + description block)
  console.log(`# ${issue.identifier}: ${issue.title}`);
  if (issue.url) console.log(`URL: ${issue.url}`);
  if (issue.state?.name) console.log(`State: ${issue.state.name}`);
  if (issue.priority != null) console.log(`Priority: ${issue.priority}`);
  // For create-plan: sub-issues need parent id and same team
  console.log(`Issue ID: ${issue.id}`);
  if (issue.team?.id) console.log(`Team ID: ${issue.team.id}`);
  console.log('');
  if (issue.description) {
    console.log('---');
    console.log(issue.description);
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
