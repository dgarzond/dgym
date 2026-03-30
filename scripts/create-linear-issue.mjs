#!/usr/bin/env node
/**
 * Create an issue in Linear via GraphQL API.
 * Project is always "dgym" (or LINEAR_PROJECT_ID in .env).
 *
 * Usage:
 *   node scripts/create-linear-issue.mjs --title "Bug: X" --description "..." --team-id "xxx" [--priority 2] [--milestone-id "xxx"]
 *   echo '{"title":"...","description":"...","teamId":"..."}' | node scripts/create-linear-issue.mjs
 *
 * List teams:    node scripts/create-linear-issue.mjs --list-teams
 * List milestones (dgym): node scripts/create-linear-issue.mjs --list-milestones
 */

import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const API_KEY = process.env.LINEAR_API_KEY;
const DEFAULT_PROJECT_NAME = 'dgym';

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

async function listTeams() {
  const data = await graphql(`
    query {
      teams {
        nodes {
          id
          key
          name
        }
      }
    }
  `);
  return data.teams.nodes;
}

async function getProjectId() {
  const id = process.env.LINEAR_PROJECT_ID;
  if (id) return id;
  const data = await graphql(`
    query {
      projects(first: 50) {
        nodes {
          id
          name
        }
      }
    }
  `);
  const project = data.projects.nodes.find(
    (p) => p.name && p.name.toLowerCase() === DEFAULT_PROJECT_NAME.toLowerCase()
  );
  if (!project) throw new Error(`Proyecto "${DEFAULT_PROJECT_NAME}" no encontrado. Crea el proyecto en Linear o define LINEAR_PROJECT_ID en .env`);
  return project.id;
}

async function listMilestones() {
  const projectId = await getProjectId();
  const data = await graphql(
    `
    query($id: String!) {
      project(id: $id) {
        name
        projectMilestones(first: 50) {
          nodes {
            id
            name
            sortOrder
          }
        }
      }
    }`,
    { id: projectId }
  );
  const project = data.project;
  if (!project) throw new Error('Proyecto no encontrado');
  const milestones = (project.projectMilestones && project.projectMilestones.nodes) || [];
  return { projectName: project.name, milestones };
}

async function createIssue({ teamId, title, description, priority, projectId, projectMilestoneId, parentId }) {
  const input = { teamId, title };
  if (description) input.description = description;
  if (priority != null) input.priority = priority; // 0=None, 1=Urgent, 2=High, 3=Medium, 4=Low
  if (projectId) input.projectId = projectId;
  if (projectMilestoneId) input.projectMilestoneId = projectMilestoneId;
  if (parentId) input.parentId = parentId; // sub-issue of this parent
  const data = await graphql(
    `mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        issue { id identifier title url }
        success
      }
    }`,
    { input }
  );
  return data.issueCreate;
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.includes('--list-teams')) return { listTeams: true };
  if (args.includes('--list-milestones')) return { listMilestones: true };
  const obj = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i + 1]) obj.title = args[i + 1];
    if (args[i] === '--description' && args[i + 1]) obj.description = args[i + 1];
    if (args[i] === '--team-id' && args[i + 1]) obj.teamId = args[i + 1];
    if (args[i] === '--priority' && args[i + 1]) obj.priority = parseInt(args[i + 1], 10);
    if (args[i] === '--milestone-id' && args[i + 1]) obj.milestoneId = args[i + 1];
    if (args[i] === '--parent-id' && args[i + 1]) obj.parentId = args[i + 1];
  }
  return obj;
}

async function main() {
  if (!API_KEY) {
    console.error('❌ LINEAR_API_KEY no está definida en .env');
    process.exit(1);
  }
  let params = parseArgs();
  if (params.listTeams) {
    const teams = await listTeams();
    console.log('Teams disponibles:');
    teams.forEach((t) => console.log(`  ${t.key} (${t.name}): ${t.id}`));
    return;
  }
  if (params.listMilestones) {
    const { projectName, milestones } = await listMilestones();
    console.log(`Milestones del proyecto "${projectName}":`);
    if (milestones.length === 0) {
      console.log('  (ninguno)');
    } else {
      milestones.forEach((m) => console.log(`  ${m.name}: ${m.id}`));
    }
    return;
  }
  // Try reading JSON from stdin
  if (!params.title && !process.stdin.isTTY) {
    try {
      const raw = readFileSync(0, 'utf-8');
      if (raw.trim()) params = { ...params, ...JSON.parse(raw) };
    } catch (_) {}
  }
  if (!params.teamId || !params.title) {
    console.error('Uso: node create-linear-issue.mjs --title "..." --team-id "..." [--description "..."] [--priority 2] [--milestone-id "uuid"] [--parent-id "uuid"]');
    console.error('  O: echo \'{"title":"...","teamId":"...","description":"..."}\' | node create-linear-issue.mjs');
    console.error('  Listar teams:     node create-linear-issue.mjs --list-teams');
    console.error('  Listar milestones: node create-linear-issue.mjs --list-milestones');
    process.exit(1);
  }
  const projectId = await getProjectId();
  const result = await createIssue({
    ...params,
    projectId,
    projectMilestoneId: params.milestoneId || null,
    parentId: params.parentId || null,
  });
  if (result.success) {
    console.log(`✅ Issue creado: ${result.issue.identifier} - ${result.issue.title}`);
    console.log(`   URL: ${result.issue.url}`);
  } else {
    console.error('❌ No se pudo crear el issue');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
