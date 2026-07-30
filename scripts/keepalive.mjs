// ============================================================
// Supabase 防回收「保活脚本」（零依赖版）
// 每天 upsert 一行心跳到 public.heartbeats，制造一次数据库写请求，
// 使免费版项目保持活跃、不会被暂停/回收。
//
// 直接用原生 fetch 调 PostgREST，不依赖 @supabase/supabase-js，
// 因此不挑 Node 版本（Node 18+ 即可），也无需 npm install。
//
// 凭证读取顺序：
//   1. 环境变量 SUPABASE_URL / SUPABASE_ANON_KEY（或 SUPABASE_SERVICE_ROLE_KEY）
//   2. 项目根目录 .env.local 中的 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//
// 本地运行：  node scripts/keepalive.mjs
// 定时运行：  见 .github/workflows/keepalive.yml（GitHub Actions 每日执行）
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// 读取 .env.local（仅当对应环境变量尚未设置时填充，避免覆盖显式传入的值）
function loadEnvLocal() {
  const envPath = path.join(root, '.env.local');
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvLocal();

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[keepalive] 缺少 Supabase 凭证。请设置 SUPABASE_URL / SUPABASE_ANON_KEY，' +
      '或在项目根目录 .env.local 中配置 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY。'
  );
  process.exit(1);
}

const restBase = `${supabaseUrl}/rest/v1`;
const baseHeaders = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
};

function tableMissing(status, body) {
  // PostgREST 在表不存在时通常返回 404，且 message 含 "does not exist"
  return status === 404 || /does not exist|PGRST106/i.test(body || '');
}

async function readCount() {
  const res = await fetch(`${restBase}/heartbeats?id=eq.1&select=ping_count`, {
    headers: baseHeaders,
  });
  const text = await res.text();
  if (tableMissing(res.status, text)) {
    throw new Error(
      '表 public.heartbeats 不存在，请先在 Supabase SQL Editor 执行 services/keepalive_heartbeat.sql'
    );
  }
  if (!res.ok) {
    throw new Error(`读取心跳失败: HTTP ${res.status} ${text}`);
  }
  let arr = [];
  try {
    arr = JSON.parse(text);
  } catch {
    arr = [];
  }
  return Array.isArray(arr) && arr[0] ? Number(arr[0].ping_count) || 0 : 0;
}

async function upsert(count) {
  const now = new Date().toISOString();
  const body = { id: 1, last_ping: now, ping_count: count, updated_at: now };
  const res = await fetch(`${restBase}/heartbeats`, {
    method: 'POST',
    headers: {
      ...baseHeaders,
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (tableMissing(res.status, text)) {
    throw new Error(
      '表 public.heartbeats 不存在，请先在 Supabase SQL Editor 执行 services/keepalive_heartbeat.sql'
    );
  }
  if (!res.ok) {
    throw new Error(`写入心跳失败: HTTP ${res.status} ${text}`);
  }
  let data = [];
  try {
    data = JSON.parse(text);
  } catch {
    data = [];
  }
  return Array.isArray(data) ? data[0] : data;
}

async function main() {
  const prev = await readCount();
  const row = await upsert(prev + 1);
  console.log(
    `[keepalive] OK — 心跳已写入，时间 ${row?.last_ping}，累计保活次数 ${row?.ping_count}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[keepalive] 失败:', err?.message || err);
    process.exit(1);
  });
