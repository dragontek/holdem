#!/usr/bin/env node
/**
 * Conventional Commits 1.0.0 Validator
 *
 * Usage:
 *   node scripts/validateCommitMsg.mjs --file <commit-msg-file>
 *   node scripts/validateCommitMsg.mjs --message "<commit-header>"
 *   node scripts/validateCommitMsg.mjs --range <base>..<head>
 */
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const ALLOWED_TYPES = [
  'feat',
  'fix',
  'perf',
  'refactor',
  'docs',
  'style',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

const CONVENTIONAL_HEADER_RE = new RegExp(
  `^(${ALLOWED_TYPES.join('|')})(\\([a-z0-9._/-]+\\))?(!)?:\\s.+`
);

const IGNORED_PATTERNS = [
  /^Merge\s(pull request|branch|remote-tracking branch|tag)\s/i,
  /^Revert\s".+"$/i,
];

function validateHeader(rawMessage, label = 'commit') {
  const firstLine = String(rawMessage || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith('#'));

  if (!firstLine) {
    return { ok: false, reason: `${label}: commit message cannot be empty.` };
  }

  if (IGNORED_PATTERNS.some((re) => re.test(firstLine))) {
    return { ok: true, header: firstLine };
  }

  if (!CONVENTIONAL_HEADER_RE.test(firstLine)) {
    return {
      ok: false,
      header: firstLine,
      reason: [
        `${label}: "${firstLine}" does not follow Conventional Commits.`,
        `Expected format: <type>(<optional-scope>)[!]: <description>`,
        `Allowed types: ${ALLOWED_TYPES.join(', ')}`,
        `Examples:`,
        `  feat(clock): make game timer backend-authoritative`,
        `  fix(auth): clear lingering Appwrite session on login`,
        `  feat(rbac)!: restrict league creation to platform admins`,
      ].join('\n'),
    };
  }

  if (firstLine.length > 100) {
    return {
      ok: false,
      header: firstLine,
      reason: `${label}: commit subject exceeds 100 characters (${firstLine.length}): "${firstLine}"`,
    };
  }

  return { ok: true, header: firstLine };
}

function main() {
  const args = process.argv.slice(2);
  const mode = args[0];
  const value = args[1];

  if (mode === '--file' && value) {
    const content = fs.readFileSync(value, 'utf8');
    const result = validateHeader(content, 'commit-msg');
    if (!result.ok) {
      console.error(`\n❌ ${result.reason}\n`);
      process.exit(1);
    }
    console.log(`✅ Conventional Commit valid: ${result.header}`);
    return;
  }

  if (mode === '--message' && value !== undefined) {
    const result = validateHeader(value, 'message');
    if (!result.ok) {
      console.error(`\n❌ ${result.reason}\n`);
      process.exit(1);
    }
    console.log(`✅ Conventional Commit valid: ${result.header}`);
    return;
  }

  if (mode === '--range' && value) {
    let rawLog = '';
    try {
      rawLog = execSync(`git log --no-merges --format="%H%x1f%s" ${value}`, {
        encoding: 'utf8',
      }).trim();
    } catch (err) {
      console.error(`❌ Failed to inspect git range "${value}":`, err.message);
      process.exit(1);
    }

    if (!rawLog) {
      console.log(`✅ No non-merge commits to validate in range ${value}.`);
      return;
    }

    const lines = rawLog.split(/\r?\n/).filter(Boolean);
    const failures = [];

    for (const line of lines) {
      const [sha, subject] = line.split('\x1f');
      const shortSha = (sha || '').slice(0, 7);
      const res = validateHeader(subject, `commit ${shortSha}`);
      if (!res.ok) {
        failures.push(res.reason);
      }
    }

    if (failures.length > 0) {
      console.error('\n❌ Conventional Commit validation failed:\n');
      for (const f of failures) {
        console.error(`${f}\n`);
      }
      process.exit(1);
    }

    console.log(`✅ All ${lines.length} commit(s) in ${value} follow Conventional Commits.`);
    return;
  }

  console.error(
    'Usage:\n  node scripts/validateCommitMsg.mjs --file <path>\n  node scripts/validateCommitMsg.mjs --message "<subject>"\n  node scripts/validateCommitMsg.mjs --range <base>..<head>'
  );
  process.exit(1);
}

main();
