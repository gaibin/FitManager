/**
 * 设置页面 — Apple HIG 风格
 */

import React, { useState } from 'react';
import { Language } from '../types';
import AIConfig from './Settings/AIConfig';
import { db } from '../services/localDatabase';

interface SettingsProps { lang: Language; }

const TABS = [
  { key: 'ai', labelEn: 'AI Config', labelZh: 'AI 配置' },
  { key: 'studio', labelEn: 'Studio', labelZh: '工作室' },
  { key: 'data', labelEn: 'Data', labelZh: '数据管理' },
] as const;

const Settings: React.FC<SettingsProps> = ({ lang }) => {
  const [activeTab, setActiveTab] = useState<string>('ai');

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-in">
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}>
            {lang === 'zh' ? tab.labelZh : tab.labelEn}
          </button>
        ))}
      </div>

      {activeTab === 'ai' && <AIConfig lang={lang} />}

      {activeTab === 'studio' && (
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-bold text-gray-800 mb-3">{lang === 'zh' ? '工作室名称' : 'Studio Name'}</h3>
          <input type="text" defaultValue="NEONFIT STUDIO"
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 mb-3 transition-all" />
          <button className="px-6 py-2.5 rounded-xl text-sm font-bold text-white scale-press" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
            {lang === 'zh' ? '保存' : 'Save'}
          </button>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-bold text-gray-800 mb-3">{lang === 'zh' ? '数据管理' : 'Data Management'}</h3>
          <p className="text-xs text-gray-400 mb-4">
            {lang === 'zh' ? '所有数据存储在浏览器本地 IndexedDB 中。' : 'All data is stored locally in IndexedDB.'}
          </p>
          <div className="flex gap-3">
            <button className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all">
              {lang === 'zh' ? '导出数据 (JSON)' : 'Export (JSON)'}
            </button>
            <button className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#FF3B30] bg-[#FF3B30]/5 hover:bg-[#FF3B30]/10 transition-all">
              {lang === 'zh' ? '清除所有数据' : 'Clear All Data'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
