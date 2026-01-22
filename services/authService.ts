import { getSupabaseClient } from './supabaseClient';
import type { User, UserRole } from '../types';

/**
 * 简单的身份验证服务
 * 使用 Supabase 的 users 表存储用户名、密码哈希和角色
 * 
 * 表结构（需要在 Supabase 创建）:
 * CREATE TABLE users (
 *   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *   username text UNIQUE NOT NULL,
 *   password_hash text NOT NULL,
 *   role text NOT NULL CHECK (role IN ('admin', 'member')),
 *   member_id uuid REFERENCES members(id),
 *   created_at timestamp DEFAULT now()
 * );
 */

// 简单的密码哈希（生产环境建议用 bcrypt，这里为了快速实现用简单哈希）
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function login(
  username: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const passwordHash = await hashPassword(password);

    // 查询用户
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password_hash', passwordHash)
      .single();

    if (error || !data) {
      return {
        user: null,
        error: '用户名或密码错误',
      };
    }

    const user: User = {
      id: data.id,
      username: data.username,
      role: data.role as UserRole,
      memberId: data.member_id || undefined,
    };

    // 保存到 localStorage
    localStorage.setItem('auth_user', JSON.stringify(user));
    localStorage.setItem('auth_token', data.id); // 简单 token

    return { user, error: null };
  } catch (err) {
    console.error('[Auth] Login error', err);
    return {
      user: null,
      error: '登录失败，请稍后重试',
    };
  }
}

export function logout(): void {
  localStorage.removeItem('auth_user');
  localStorage.removeItem('auth_token');
}

export function getCurrentUser(): User | null {
  try {
    const userStr = localStorage.getItem('auth_user');
    if (!userStr) return null;
    return JSON.parse(userStr) as User;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === 'admin';
}
