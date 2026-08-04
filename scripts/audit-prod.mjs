#!/usr/bin/env node
/**
 * Production dependency audit with a reviewable allowlist.
 *
 * `pnpm audit --prod --audit-level high` on its own cannot express "this one
 * advisory does not apply to us": pnpm 8's `auditConfig.ignoreGhsas` is a
 * pnpm 9 feature, and pinning the whole toolchain to a new major just to
 * silence one entry is a worse trade than reading it here.
 *
 * Every exception carries a reason and is visible in review. An advisory that
 * is not listed fails the build.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** GHSA id -> why it does not apply. Re-justify on every dependency bump. */
const ALLOWLIST = {
  'GHSA-qwww-vcr4-c8h2':
    'react-router RSC Mode CSRF bypass. Fixed only in react-router 8, which ' +
    'requires React 19 as a peer; this app is on React 18. It applies to ' +
    'React Server Components mode, which this app does not use — src/App.tsx ' +
    'mounts a plain <BrowserRouter> with four static routes, there is no ' +
    'server runtime, no loaders and no actions.',
};

const BLOCKING = new Set(['high', 'critical']);

const { stdout } = await run('pnpm', ['audit', '--prod', '--json'], {
  maxBuffer: 32 * 1024 * 1024,
}).catch((e) => ({ stdout: e.stdout ?? '' }));

if (!stdout.trim()) {
  console.error('audit-prod: pnpm audit produced no output');
  process.exit(1);
}

const advisories = Object.values(JSON.parse(stdout).advisories ?? {});
const blocking = advisories.filter((a) => BLOCKING.has(a.severity));

const unexpected = blocking.filter((a) => !(a.github_advisory_id in ALLOWLIST));
const accepted = blocking.filter((a) => a.github_advisory_id in ALLOWLIST);

for (const a of accepted) {
  console.log(`accepted  ${a.github_advisory_id}  ${a.module_name}  (${a.severity})`);
  console.log(`          ${ALLOWLIST[a.github_advisory_id]}`);
}

if (unexpected.length > 0) {
  console.error(`\n${unexpected.length} unaccepted high/critical advisory(ies):`);
  for (const a of unexpected) {
    console.error(`  ${a.github_advisory_id}  ${a.module_name}  ${a.title}`);
    console.error(`    vulnerable: ${a.vulnerable_versions}  patched: ${a.patched_versions}`);
  }
  process.exit(1);
}

console.log(`\nNo unaccepted high or critical advisories (${accepted.length} accepted).`);
