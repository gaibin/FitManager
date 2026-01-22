import React, { useState } from 'react';
import { login } from '../services/authService';
import { TRANSLATIONS } from '../constants';
import type { Language } from '../types';

interface LoginPageProps {
  lang: Language;
  onLoginSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ lang, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { user, error: loginError } = await login(username, password);

    if (loginError || !user) {
      setError(loginError || '登录失败');
      setLoading(false);
      return;
    }

    setLoading(false);
    onLoginSuccess();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950">
      <div className="w-full max-w-md p-8 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-500 mb-2">
            NEONFIT STUDIO
          </h1>
          <p className="text-zinc-500 text-sm">
            {lang === 'zh' ? '请登录以访问管理系统' : 'Please login to access the management system'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wide">
              {lang === 'zh' ? '用户名' : 'Username'}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 transition-all"
              placeholder={lang === 'zh' ? '请输入用户名' : 'Enter username'}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 mb-2 uppercase tracking-wide">
              {lang === 'zh' ? '密码' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white focus:border-lime-500 focus:outline-none focus:ring-1 focus:ring-lime-500 transition-all"
              placeholder={lang === 'zh' ? '请输入密码' : 'Enter password'}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-lime-500 hover:bg-lime-400 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-lime-500/10"
          >
            {loading
              ? lang === 'zh'
                ? '登录中...'
                : 'Logging in...'
              : lang === 'zh'
              ? '登录'
              : 'Login'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-600">
          <p>
            {lang === 'zh'
              ? '管理员：使用管理员账号登录 | 会员：使用您的姓名登录'
              : 'Admin: Use admin account | Member: Use your name to login'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
