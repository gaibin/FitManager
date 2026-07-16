import type { Session } from '@supabase/supabase-js';
import type { User, UserRole } from '../types';
import { getSupabaseClient } from './supabaseClient';

export type RegistrationRole = 'coach' | 'member';

const ACCOUNT_DOMAIN = 'accounts.ygfit.local';

function normalizeUsername(username: string): string {
  return username.trim().normalize('NFKC').toLocaleLowerCase('zh-CN');
}

export function validateCredentials(username: string, password: string): string | null {
  const normalized = normalizeUsername(username);
  if (normalized.length < 3 || normalized.length > 24) return '账号需为 3–24 个字符';
  if (/\s/.test(normalized)) return '账号不能包含空格';
  if (password.length < 8) return '密码至少需要 8 位';
  if (password.length > 72) return '密码不能超过 72 位';
  return null;
}

export async function usernameToInternalEmail(username: string): Promise<string> {
  const normalized = normalizeUsername(username);
  const bytes = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 48);
  return `u-${hash}@${ACCOUNT_DOMAIN}`;
}

function friendlyAuthError(message: string, mode: 'login' | 'register'): string {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return '账号或密码错误';
  if (text.includes('already registered') || text.includes('already exists')) return '这个账号已被注册';
  if (text.includes('password')) return mode === 'register' ? '密码不符合要求，请至少输入 8 位' : '账号或密码错误';
  if (text.includes('rate limit')) return '尝试次数过多，请稍后再试';
  return mode === 'register' ? '注册失败，请稍后重试' : '登录失败，请稍后重试';
}

async function profileForSession(session: Session): Promise<User> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, role, studio_id, member_id')
    .eq('id', session.user.id)
    .single();

  if (error || !data) throw new Error('账号资料尚未创建，请刷新页面或联系管理员');

  return {
    id: data.id,
    username: data.username,
    role: data.role as UserRole,
    studioId: data.studio_id || undefined,
    memberId: data.member_id || undefined,
  };
}

export async function register(
  username: string,
  password: string,
  role: RegistrationRole,
): Promise<{ user: User | null; error: string | null }> {
  const validationError = validateCredentials(username, password);
  if (validationError) return { user: null, error: validationError };

  try {
    const supabase = getSupabaseClient();
    const normalized = normalizeUsername(username);
    const email = await usernameToInternalEmail(normalized);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim().normalize('NFKC'),
          username_normalized: normalized,
          account_type: role,
        },
      },
    });

    if (error) return { user: null, error: friendlyAuthError(error.message, 'register') };
    if (!data.session) return { user: null, error: '账号已创建，但自动登录尚未启用，请联系管理员' };
    return { user: await profileForSession(data.session), error: null };
  } catch (error) {
    console.error('[Auth] Register error', error);
    return { user: null, error: error instanceof Error ? error.message : '注册失败，请稍后重试' };
  }
}

export async function login(
  username: string,
  password: string,
): Promise<{ user: User | null; error: string | null }> {
  const validationError = validateCredentials(username, password);
  if (validationError) return { user: null, error: '账号或密码错误' };

  try {
    const supabase = getSupabaseClient();
    const email = await usernameToInternalEmail(username);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session) return { user: null, error: friendlyAuthError(error?.message || '', 'login') };
    return { user: await profileForSession(data.session), error: null };
  } catch (error) {
    console.error('[Auth] Login error', error);
    return { user: null, error: error instanceof Error ? error.message : '登录失败，请稍后重试' };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return null;
  return profileForSession(data.session);
}

export async function logout(): Promise<void> {
  await getSupabaseClient().auth.signOut();
}
