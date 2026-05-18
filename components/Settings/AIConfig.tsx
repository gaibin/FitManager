/**
 * AI 提供商配置组件 — 选择 AI 服务、填写 API Key、测试连接
 */

import React, { useState, useEffect } from 'react';
import { Language, AIProviderConfig } from '../../types';
import { createAIProvider, testAIProvider, PROVIDER_PRESETS } from '../../services/aiProvider';
import { db } from '../../services/localDatabase';

interface AIConfigProps {
  lang: Language;
}

const PROVIDER_LABELS: Record<string, string> = {
  gemini: 'Google Gemini',
  deepseek: 'DeepSeek',
  kimi: 'Kimi (Moonshot)',
  'openai-compatible': 'OpenAI / 兼容接口',
};

const AIConfig: React.FC<AIConfigProps> = ({ lang }) => {
  const [config, setConfig] = useState<AIProviderConfig>({
    provider: 'gemini',
    apiKey: '',
    baseUrl: '',
    modelName: '',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  // 加载已保存配置
  useEffect(() => {
    (async () => {
      const saved = await db.getAIConfig();
      if (saved) {
        setConfig({
          provider: saved.provider,
          apiKey: saved.apiKey,
          baseUrl: saved.baseUrl,
          modelName: saved.modelName,
        });
      }
    })();
  }, []);

  const handleProviderChange = (provider: AIProviderConfig['provider']) => {
    const preset = PROVIDER_PRESETS[provider];
    setConfig(prev => ({
      ...prev,
      provider,
      baseUrl: preset.baseUrl,
      modelName: preset.defaultModel,
    }));
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!config.apiKey) {
      setTestResult({ success: false, message: lang === 'zh' ? '请先填写 API Key' : 'Please enter API Key first' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testAIProvider(config);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    await db.saveAIConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const showBaseUrl = config.provider !== 'gemini';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-bold text-zinc-100 mb-2">
          {lang === 'zh' ? 'AI 提供商' : 'AI Provider'}
        </h3>
        <p className="text-xs text-zinc-500 mb-3">
          {lang === 'zh'
            ? '选择用于生成训练建议的 AI 服务。不配置时系统仍可正常使用。'
            : 'Select the AI service for generating training recommendations. The system works without AI configuration.'}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(Object.keys(PROVIDER_LABELS) as AIProviderConfig['provider'][]).map((key) => (
            <button
              key={key}
              onClick={() => handleProviderChange(key)}
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                config.provider === key
                  ? 'bg-lime-500/10 border-lime-500/50 text-lime-400'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
              }`}
            >
              {PROVIDER_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs text-zinc-500 uppercase font-semibold mb-1.5 block">
          API Key
        </label>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
          placeholder={lang === 'zh' ? '输入 API Key...' : 'Enter API Key...'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm focus:border-lime-500 outline-none font-mono"
        />
      </div>

      {showBaseUrl && (
        <div>
          <label className="text-xs text-zinc-500 uppercase font-semibold mb-1.5 block">
            Base URL
          </label>
          <input
            type="text"
            value={config.baseUrl}
            onChange={(e) => setConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
            placeholder="https://api.deepseek.com"
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm focus:border-lime-500 outline-none font-mono"
          />
        </div>
      )}

      <div>
        <label className="text-xs text-zinc-500 uppercase font-semibold mb-1.5 block">
          {lang === 'zh' ? '模型名称' : 'Model Name'}
        </label>
        <input
          type="text"
          value={config.modelName}
          onChange={(e) => setConfig(prev => ({ ...prev, modelName: e.target.value }))}
          placeholder={PROVIDER_PRESETS[config.provider]?.defaultModel || 'gpt-3.5-turbo'}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-2.5 text-white text-sm focus:border-lime-500 outline-none font-mono"
        />
      </div>

      {/* 操作按钮 */}
      <div className="flex space-x-3">
        <button
          onClick={handleTest}
          disabled={testing}
          className="flex items-center space-x-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-zinc-700 transition-all disabled:opacity-50"
        >
          {testing && (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <span>{lang === 'zh' ? '测试连接' : 'Test Connection'}</span>
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black text-sm font-bold rounded-lg transition-all"
        >
          {saved ? (lang === 'zh' ? '已保存' : 'Saved') : TRANSLATION_KEYS.save[lang]}
        </button>
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div className={`rounded-lg border p-3 text-sm ${
          testResult.success
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {testResult.message}
        </div>
      )}
    </div>
  );
};

const TRANSLATION_KEYS = {
  save: { en: 'Save', zh: '保存' },
  cancel: { en: 'Cancel', zh: '取消' },
};

export default AIConfig;
