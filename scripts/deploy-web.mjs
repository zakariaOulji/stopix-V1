#!/usr/bin/env node
// Build the web app and deploy it to EAS Hosting, refusing to ship a demo
// (mock) build or one without Supabase settings.
//
//   node scripts/deploy-web.mjs           -> preview URL (https://stopix--<id>.expo.app)
//   node scripts/deploy-web.mjs --prod    -> production URL (https://stopix.expo.app)
//
// EXPO_PUBLIC_* values are inlined at build time from the local .env files
// (.env, then .env.production / .env.production.local override it).
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { parseProjectEnv } = require('@expo/env');

const prod = process.argv.includes('--prod');
const { env, files } = parseProjectEnv(process.cwd(), { mode: 'production', silent: true });
const value = (k) => process.env[k] ?? env[k] ?? '';

const problems = [];
if (value('EXPO_PUBLIC_USE_MOCKS').toLowerCase() !== 'false') {
  problems.push('EXPO_PUBLIC_USE_MOCKS doit valoir "false" (sinon l’app en ligne tourne sur les données de démo).');
}
if (!/^https:\/\/.+\.supabase\.co\/?$/.test(value('EXPO_PUBLIC_SUPABASE_URL').trim())) {
  problems.push('EXPO_PUBLIC_SUPABASE_URL manquante ou invalide (https://<ref>.supabase.co).');
}
if (value('EXPO_PUBLIC_SUPABASE_ANON_KEY').trim().length < 20) {
  problems.push('EXPO_PUBLIC_SUPABASE_ANON_KEY manquante.');
}
if (problems.length) {
  console.error(`\nDéploiement annulé — configuration lue dans : ${files.join(', ') || '(aucun fichier .env)'}\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('\nCorrige .env (ou crée .env.production) puis relance.\n');
  process.exit(1);
}
console.log(`Configuration OK (${files.join(', ')}) — Supabase : ${value('EXPO_PUBLIC_SUPABASE_URL')}`);

const run = (cmd) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
run('npx expo export --platform web --clear');
run(`npx eas-cli@latest deploy${prod ? ' --prod' : ''}`);
