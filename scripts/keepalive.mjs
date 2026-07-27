// ============================================================
// Supabase 防回收「保活脚本」
// 每天 upsert 一行心跳到 public.heartbeats，制造一次数据库写请求，
// 使免费版项目保持活跃、不会被暂停/回收。
//
// 凭证读取顺序：
//   1. 环境变量 SUPABASE_URL / SUPABASE_ANON_KEY（或 SUPABASE_SERVICE_ROLE_KEY）
//   2. 项目根目录 .env.local 中的 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
//
// 本地运行：  node scripts/keepalive.mjs
// 定时运行：  见 .github/workflows/keepalive.yml（GitHub Actions 每日执行）
// ============================================================

import { createClient } from '@supabase/supabase-js';
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

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;

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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  // 先读已有计数，再 +1，便于在 Supabase 里直观看到累计保活次数
  const { data: existing } = await supabase
    .from('heartbeats')
    .select('ping_count')
    .eq('id', 1)
    .maybeSingle();

  if (existing && existing.error && existing.error.code === '42P01') {
    throw new Error(
      '表 public.heartbeats 不存在，请先在 Supabase SQL Editor 执行 services/keepalive_heartbeat.sql'
    );
  }

  const nextCount = (existing?.ping_count ?? 0) + 1;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('heartbeats')
    .upsert(
      { id: 1, last_ping: now, ping_count: nextCount, updated_at: now },
      { onConflict: 'id' }
    )
    .select('last_ping, ping_count')
    .single();

  if (error) {
    if (error.code === '42P01') {
      throw new Error(
        '表 public.heartbeats 不存在，请先在 Supabase SQL Editor 执行 services/keepalive_heartbeat.sql'
      );
    }
    throw error;
  }

  console.log(
    `[keepalive] OK — 心跳已写入，时间 ${data.last_ping}，累计保活次数 ${data.ping_count}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[keepalive] 失败:', err?.message || err);
    process.exit(1);
  });
