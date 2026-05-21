import React, { useState } from 'react';
import { Language } from '../types';
import { login } from '../services/authService';

interface LoginPageProps { lang: Language; onLoginSuccess: () => void; }

const LoginPage: React.FC<LoginPageProps> = ({ lang, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    const { user, error: err } = await login(username, password);
    if (user) { onLoginSuccess(); } else { setError(err || 'Login failed'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 50%, #f0f0f5 100%)' }}>
      <div className="w-full max-w-sm mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-800 tracking-tight">NeonFit</h1>
          <p className="text-sm text-gray-400 mt-1">{lang === 'zh' ? '工作室管理平台' : 'Studio Manager'}</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl p-6 space-y-4" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1.5 block">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} autoFocus
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 focus:ring-2 focus:ring-[#007AFF]/10 transition-all" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1.5 block">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 focus:ring-2 focus:ring-[#007AFF]/10 transition-all" />
          </div>
          {error && <div className="bg-[#FF3B30]/5 border border-[#FF3B30]/10 rounded-xl p-3 text-sm text-[#FF3B30] font-medium">{error}</div>}
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all scale-press disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
            {loading ? (lang === 'zh' ? '登录中...' : 'Signing in...') : (lang === 'zh' ? '登录' : 'Sign In')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
