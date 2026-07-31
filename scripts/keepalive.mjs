// Supabase keep-alive: call a fixed, security-definer RPC.
// The GitHub workflow only needs the public anon key; it never receives
// service-role credentials and cannot write arbitrary rows.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equals = trimmed.indexOf('=');
    if (equals < 0) continue;
    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[keepalive] missing SUPABASE_URL/SUPABASE_ANON_KEY');
  process.exit(1);
}

async function ping() {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/keepalive_ping`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: '{}',
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`RPC keepalive failed: HTTP ${response.status} ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

try {
  const result = await ping();
  console.log(`[keepalive] OK ${JSON.stringify(result)}`);
} catch (error) {
  const cause = error?.cause;
  console.error('[keepalive] failed:', error?.message || error);
  if (cause) console.error('[keepalive] cause:', cause.code || cause.message || cause);
  process.exit(1);
}
