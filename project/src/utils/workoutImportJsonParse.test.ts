import { describe, expect, it } from 'vitest';
import {
  extractFirstBalancedJsonValue,
  parseWorkoutImportJsonString,
  removeTrailingCommasOutsideStrings,
  stripMarkdownCodeFences,
  ParseWorkoutImportJsonError,
} from './workoutImportJsonParse';

describe('stripMarkdownCodeFences', () => {
  it('removes json fence', () => {
    expect(stripMarkdownCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
});

describe('removeTrailingCommasOutsideStrings', () => {
  it('removes trailing commas before closers', () => {
    const raw = '{"a": [1, 2,], "b": "x",}';
    const fixed = removeTrailingCommasOutsideStrings(raw);
    expect(JSON.parse(fixed)).toEqual({ a: [1, 2], b: 'x' });
  });

  it('does not remove commas inside strings', () => {
    const raw = '{"hint": "foo,]",}';
    const fixed = removeTrailingCommasOutsideStrings(raw);
    expect(JSON.parse(fixed)).toEqual({ hint: 'foo,]' });
  });
});

describe('extractFirstBalancedJsonValue', () => {
  it('ignores braces inside double-quoted strings (regression: premature slice)', () => {
    const noise = 'Here is JSON:\n';
    const inner = '{"name": "Set } bracket { test", "n": 1}';
    const sliced = extractFirstBalancedJsonValue(noise + inner + ' trailing');
    expect(sliced).toBe(inner);
    expect(JSON.parse(sliced)).toEqual({ name: 'Set } bracket { test', n: 1 });
  });

  it('extracts root array', () => {
    expect(extractFirstBalancedJsonValue('[1, 2]')).toBe('[1, 2]');
  });
});

describe('parseWorkoutImportJsonString', () => {
  it('parses fenced JSON with trailing comma and preamble', () => {
    const raw = `ok here you go\n\`\`\`json\n{"workouts": [{"name": "A",},],}\n\`\`\``;
    const v = parseWorkoutImportJsonString(raw) as { workouts: unknown[] };
    expect(v.workouts).toHaveLength(1);
  });

  it('throws ParseWorkoutImportJsonError on invalid JSON after cleanup', () => {
    expect(() => parseWorkoutImportJsonString('{ nope')).toThrow(ParseWorkoutImportJsonError);
  });
});
