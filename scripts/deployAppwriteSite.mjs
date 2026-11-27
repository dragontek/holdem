#!/usr/bin/env node
/**
 * Automated Appwrite Sites Deployment Script
 *
 * Uploads a pre-built static site tarball (`holdem-site.tar.gz`) to Appwrite Sites
 * using `node-appwrite`, activates it, and waits until the deployment status is `ready`.
 *
 * Required env:
 *   APPWRITE_API_KEY       - Appwrite Server API Key with `sites.read` + `sites.write` scopes
 *
 * Optional env (defaults match project config):
 *   APPWRITE_ENDPOINT      - Defaults to VITE_APPWRITE_ENDPOINT or https://dragontek.io/v1
 *   APPWRITE_PROJECT_ID    - Defaults to VITE_APPWRITE_PROJECT_ID or appwrite.config.json
 *   APPWRITE_SITE_ID       - Target Site ID (auto-discovered if omitted & unambiguous)
 *   APPWRITE_BUNDLE_PATH   - Defaults to holdem-site.tar.gz
 */
import fs from 'node:fs';
import path from 'node:path';
import { Client, Sites } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';

function loadDotEnvIfPresent() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) continue;
    const key = match[1];
    if (process.env[key]) continue;
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function normalizeEndpoint(raw) {
  const trimmed = String(raw || '').trim().replace(/\/+$/, '');
  if (!trimmed) return 'https://dragontek.io/v1';
  try {
    const parsed = new URL(trimmed);
    if (!parsed.pathname || parsed.pathname === '/') {
      return `${trimmed}/v1`;
    }
  } catch {
    if (!/\/v\d+$/i.test(trimmed)) {
      return `${trimmed}/v1`;
    }
  }
  return trimmed;
}

function readConfigProjectId() {
  try {
    const cfgPath = path.resolve(process.cwd(), 'appwrite.config.json');
    if (!fs.existsSync(cfgPath)) return '';
    const parsed = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    return typeof parsed.projectId === 'string' ? parsed.projectId.trim() : '';
  } catch {
    return '';
  }
}

async function resolveSiteId(sites, explicitSiteId) {
  if (explicitSiteId) {
    const site = await sites.get({ siteId: explicitSiteId });
    return { siteId: site.$id, siteName: site.name };
  }

  console.log('🔎 APPWRITE_SITE_ID not set — discovering target site via Appwrite Sites API...');
  const list = await sites.list();
  const candidates = list.sites || [];

  if (candidates.length === 0) {
    throw new Error(
      'No Appwrite Sites found in this project. Create a Site in Appwrite Console → Sites first, then set APPWRITE_SITE_ID.'
    );
  }

  if (candidates.length === 1) {
    return { siteId: candidates[0].$id, siteName: candidates[0].name };
  }

  const matched = candidates.find((s) => /holdem|jack.?ten|poker/i.test(`${s.name} ${s.$id}`));
  if (matched) {
    return { siteId: matched.$id, siteName: matched.name };
  }

  const summary = candidates.map((s) => `  - ${s.name} (id: ${s.$id})`).join('\n');
  throw new Error(
    `Multiple Appwrite Sites found; please set APPWRITE_SITE_ID to one of:\n${summary}`
  );
}

async function waitForDeploymentReady(sites, siteId, deploymentId, timeoutMs = 240_000) {
  const startedAt = Date.now();
  let lastStatus = '';

  while (Date.now() - startedAt < timeoutMs) {
    const dep = await sites.getDeployment({ siteId, deploymentId });
    const status = String(dep.status || '');
    if (status !== lastStatus) {
      console.log(`⏳ Appwrite deployment ${deploymentId}: status="${status}"`);
      lastStatus = status;
    }

    if (status === 'ready') {
      return dep;
    }

    if (status === 'failed' || status === 'canceled') {
      const logs = dep.buildLogs ? `\n--- Appwrite Build Logs ---\n${dep.buildLogs}` : '';
      throw new Error(`Appwrite deployment ${deploymentId} ended with status "${status}".${logs}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(`Timed out waiting for Appwrite deployment ${deploymentId} to become ready.`);
}

async function main() {
  loadDotEnvIfPresent();

  const endpoint = normalizeEndpoint(
    process.env.APPWRITE_ENDPOINT ||
      process.env.VITE_APPWRITE_ENDPOINT ||
      'https://dragontek.io/v1'
  );
  const projectId = (
    process.env.APPWRITE_PROJECT_ID ||
    process.env.VITE_APPWRITE_PROJECT_ID ||
    readConfigProjectId() ||
    '6ad3e9f6000495b2033d'
  ).trim();
  const apiKey = (process.env.APPWRITE_API_KEY || '').trim();
  const explicitSiteId = (process.env.APPWRITE_SITE_ID || '').trim();
  const bundlePath = path.resolve(
    process.cwd(),
    process.env.APPWRITE_BUNDLE_PATH || 'holdem-site.tar.gz'
  );

  if (!apiKey) {
    console.error(
      '❌ Missing APPWRITE_API_KEY.\n' +
        '   Add repository secret APPWRITE_API_KEY in GitHub Settings → Secrets and variables → Actions\n' +
        '   with Appwrite API key scopes: sites.read, sites.write.'
    );
    process.exit(1);
  }

  if (!fs.existsSync(bundlePath)) {
    console.error(
      `❌ Site bundle not found at ${bundlePath}. Run "npm run bundle:site" before deploying.`
    );
    process.exit(1);
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey);
  const sites = new Sites(client);

  const { siteId, siteName } = await resolveSiteId(sites, explicitSiteId);
  const bundleSizeKb = (fs.statSync(bundlePath).size / 1024).toFixed(1);

  console.log(`🚀 Deploying Jack Ten Poker to Appwrite Sites`);
  console.log(`   Endpoint:   ${endpoint}`);
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Site:       ${siteName} (${siteId})`);
  console.log(`   Bundle:     ${path.basename(bundlePath)} (${bundleSizeKb} KB)`);

  const deployment = await sites.createDeployment({
    siteId,
    code: InputFile.fromPath(bundlePath, path.basename(bundlePath)),
    installCommand: '',
    buildCommand: '',
    outputDirectory: '.',
    activate: true,
  });

  console.log(`📦 Uploaded deployment ${deployment.$id} (initial status: ${deployment.status})`);
  const ready = await waitForDeploymentReady(sites, siteId, deployment.$id);

  // Ensure the new deployment is explicitly activated
  try {
    await sites.updateSiteDeployment({ siteId, deploymentId: ready.$id });
  } catch {
    // Already activated by activate: true
  }

  console.log(`✅ Production Appwrite Site "${siteName}" is LIVE (deployment ${ready.$id})!`);
}

main().catch((err) => {
  console.error('❌ Appwrite Site deployment failed:', err?.message || err);
  process.exit(1);
});
