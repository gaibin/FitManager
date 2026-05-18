/**
 * 设置页面 — AI 配置 / 工作室设置 / 数据管理
 */

import React, { useState } from 'react';
import { Language } from '../types';
import AIConfig from './Settings/AIConfig';

interface SettingsProps {
  lang: Language;
}

const TABS = [
  { key: 'ai', labelEn: 'AI Config', labelZh: 'AI 配置' },
  { key: 'studio', labelEn: 'Studio', labelZh: '工作室' },
  { key: 'data', labelEn: 'Data', labelZh: '数据管理' },
] as const;

const Settings: React.FC<SettingsProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<string>('ai');

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex space-x-1 bg-zinc-900/50 rounded-xl p-1 border border-zinc-800">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {lang === 'zh' ? tab.labelZh : tab.labelEn}
          </button>
        ))}
      </div>

      {activeTab === 'ai' && <AIConfig lang={lang} />}

      {activeTab === 'studio' && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-100 mb-3">
            {lang === 'zh' ? '工作室名称' : 'Studio Name'}
          </h3>
          <input
            type="text"
            defaultValue="NEONFIT STUDIO"
            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-white text-sm focus:border-lime-500 outline-none mb-3"
          />
          <button className="px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-black text-sm font-bold rounded-lg transition-all">
            {lang === 'zh' ? '保存' : 'Save'}
          </button>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-zinc-100 mb-3">
            {lang === 'zh' ? '数据管理' : 'Data Management'}
          </h3>
          <p className="text-xs text-zinc-500 mb-4">
            {lang === 'zh'
              ? '所有数据存储在浏览器本地 IndexedDB 中。清除浏览器数据将丢失记录。'
              : 'All data is stored locally in IndexedDB. Clearing browser data will erase records.'}
          </p>
          <div className="flex space-x-3">
            <button className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium rounded-lg border border-zinc-700 transition-all">
              {lang === 'zh' ? '导出数据 (JSON)' : 'Export Data (JSON)'}
            </button>
            <button className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium rounded-lg border border-red-500/20 transition-all">
              {lang === 'zh' ? '清除所有数据' : 'Clear All Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
