import React, { useState } from 'react';
import type { Language, User } from '../types';
import { login, register, type RegistrationRole } from '../services/authService';

interface LoginPageProps {
  lang: Language;
  onLoginSuccess: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ lang, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<RegistrationRole>('coach');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isZh = lang === 'zh';

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const result = mode === 'login'
      ? await login(username, password)
      : await register(username, password, role);
    if (result.user) onLoginSuccess(result.user);
    else setError(result.error || (isZh ? '操作失败，请稍后重试' : 'Something went wrong. Please try again.'));
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-[#f4f5f8] px-4 py-8 sm:grid sm:place-items-center sm:px-6">
      <div className="mx-auto w-full max-w-[27rem]">
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] shadow-lg shadow-[#5856D6]/20">
            <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">YGFIT</h1>
          <p className="mt-1 text-sm text-gray-400">{isZh ? '教练与会员体态管理平台' : 'Coach & Member Posture Platform'}</p>
        </div>

        <div className="rounded-[1.75rem] border border-white/80 bg-white p-2 shadow-[0_18px_60px_rgba(31,41,55,0.10)]">
          <div className="grid grid-cols-2 rounded-2xl bg-gray-100 p-1">
            {(['login', 'register'] as const).map((item) => (
              <button key={item} type="button" onClick={() => switchMode(item)}
                className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${mode === item ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                {item === 'login' ? (isZh ? '登录' : 'Sign in') : (isZh ? '注册试用' : 'Create account')}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
            {mode === 'register' && (
              <div>
                <p className="mb-2 text-xs font-bold text-gray-500">{isZh ? '选择身份' : 'Account type'}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['coach', 'member'] as RegistrationRole[]).map((item) => {
                    const selected = role === item;
                    return (
                      <button key={item} type="button" onClick={() => setRole(item)}
                        className={`rounded-2xl border px-3 py-3 text-left transition ${selected ? 'border-[#007AFF]/40 bg-[#007AFF]/7 ring-2 ring-[#007AFF]/10' : 'border-gray-100 bg-gray-50'}`}>
                        <span className={`block text-sm font-extrabold ${selected ? 'text-[#007AFF]' : 'text-gray-700'}`}>
                          {item === 'coach' ? (isZh ? '我是教练' : 'Coach') : (isZh ? '我是会员' : 'Member')}
                        </span>
                        <span className="mt-0.5 block text-[10px] leading-relaxed text-gray-400">
                          {item === 'coach'
                            ? (isZh ? '创建自己的会员工作区' : 'Manage your own members')
                            : (isZh ? '只查看自己的训练档案' : 'View your own records')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">{isZh ? '账号' : 'Username'}</label>
              <input type="text" value={username} onChange={(event) => setUsername(event.target.value)} autoFocus autoComplete="username" required
                placeholder={isZh ? '3–24 个字符，不含空格' : '3–24 characters, no spaces'}
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none transition focus:border-[#007AFF]/30 focus:ring-4 focus:ring-[#007AFF]/8" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-500">{isZh ? '密码' : 'Password'}</label>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8}
                placeholder={isZh ? '至少 8 位' : 'At least 8 characters'}
                className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none transition focus:border-[#007AFF]/30 focus:ring-4 focus:ring-[#007AFF]/8" />
            </div>

            {error && <div role="alert" className="rounded-2xl border border-[#FF3B30]/10 bg-[#FF3B30]/5 px-4 py-3 text-sm font-medium text-[#D83028]">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-[#007AFF] to-[#5856D6] py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#007AFF]/15 transition active:scale-[0.99] disabled:opacity-60">
              {loading
                ? (isZh ? '正在处理…' : 'Please wait…')
                : mode === 'login'
                  ? (isZh ? '登录工作台' : 'Sign in')
                  : (isZh ? `注册${role === 'coach' ? '教练' : '会员'}账号` : 'Create account')}
            </button>

            <p className="text-center text-[11px] leading-relaxed text-gray-400">
              {isZh ? '试用版仅需账号和密码；不同账号的数据彼此隔离。' : 'Trial accounts only need a username and password. Data stays private.'}
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
