/**
 * AI 提供商配置 — Apple HIG 风格
 */

import React, { useState, useEffect } from 'react';
import { Language, AIProviderConfig } from '../../types';
import { testAIProvider, PROVIDER_PRESETS } from '../../services/aiProvider';
import { db } from '../../services/localDatabase';

interface AIConfigProps { lang: Language; }

const AIConfig: React.FC<AIConfigProps> = ({ lang }) => {
  const [config, setConfig] = useState<AIProviderConfig>({ provider: 'gemini', apiKey: '', baseUrl: '', modelName: '' });
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { (async () => { const s = await db.getAIConfig(); if (s) setConfig(s); })(); }, []);

  const handleProviderChange = (p: AIProviderConfig['provider']) => {
    const preset = PROVIDER_PRESETS[p];
    setConfig(prev => ({ ...prev, provider: p, baseUrl: preset.baseUrl, modelName: preset.defaultModel }));
    setResult(null);
  };

  const handleTest = async () => {
    if (!config.apiKey) { setResult({ success: false, message: lang === 'zh' ? '请先填写 API Key' : 'Enter API Key' }); return; }
    setTesting(true); setResult(null);
    try { const r = await testAIProvider(config); setResult(r); } catch (e: any) { setResult({ success: false, message: e.message }); }
    finally { setTesting(false); }
  };

  const handleSave = async () => { await db.saveAIConfig(config); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const providers: { key: AIProviderConfig['provider']; label: string }[] = [
    { key: 'gemini', label: 'Google Gemini' }, { key: 'deepseek', label: 'DeepSeek' },
    { key: 'kimi', label: 'Kimi' }, { key: 'openai-compatible', label: 'OpenAI Compatible' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-2">{lang === 'zh' ? 'AI 提供商' : 'AI Provider'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {providers.map(({ key, label }) => (
            <button key={key} onClick={() => handleProviderChange(key)}
              className={`py-2.5 px-3 rounded-xl text-[11px] font-semibold transition-all border ${
                config.provider === key ? 'border-[#007AFF]/30 bg-[#007AFF]/5 text-[#007AFF]' : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}>{label}</button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1.5 block">API Key</label>
        <input type="password" value={config.apiKey} onChange={e => setConfig(p => ({ ...p, apiKey: e.target.value }))}
          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 transition-all font-mono" />
      </div>
      {config.provider !== 'gemini' && (
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1.5 block">Base URL</label>
          <input type="text" value={config.baseUrl} onChange={e => setConfig(p => ({ ...p, baseUrl: e.target.value }))}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 transition-all font-mono" />
        </div>
      )}
      <div>
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1.5 block">{lang === 'zh' ? '模型名称' : 'Model'}</label>
        <input type="text" value={config.modelName} onChange={e => setConfig(p => ({ ...p, modelName: e.target.value }))}
          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 transition-all font-mono" />
      </div>
      <div className="flex gap-3">
        <button onClick={handleTest} disabled={testing}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50">
          {testing && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
          {lang === 'zh' ? '测试连接' : 'Test'}
        </button>
        <button onClick={handleSave} className="px-6 py-3 rounded-xl text-sm font-bold text-white scale-press" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
          {saved ? 'Saved' : (lang === 'zh' ? '保存' : 'Save')}
        </button>
      </div>
      {result && (
        <div className={`rounded-xl p-4 text-sm font-medium ${result.success ? 'bg-[#34C759]/5 text-[#34C759] border border-[#34C759]/10' : 'bg-[#FF3B30]/5 text-[#FF3B30] border border-[#FF3B30]/10'}`}>
          {result.message}
        </div>
      )}
    </div>
  );
};

export default AIConfig;
