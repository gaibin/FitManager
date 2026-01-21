import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 注意：不要在模块加载时就 createClient。
 * 如果用户的 `.env.local` 未生效/变量名写错，createClient 会直接抛错导致白屏。
 * 这里改为“延迟初始化”，让错误可以被业务层捕获并显示友好提示。
 */

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '[Supabase] 缺少环境变量：请在项目根目录的 `.env.local` 配置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY，并重启 `npm run dev`。'
    );
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}


