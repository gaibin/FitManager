/**
 * 设置页面 — Apple HIG 风格
 */

import React, { useState, useEffect } from 'react';
import { Language } from '../types';
import AIConfig from './Settings/AIConfig';
import { db } from '../services/localDatabase';

interface SettingsProps { lang: Language; studioName: string; onStudioUpdate: (name: string, coach: string, logo: string) => void; }

const TABS = [
  { key: 'ai', labelEn: 'AI Config', labelZh: 'AI 配置' },
  { key: 'studio', labelEn: 'Branding', labelZh: '品牌设置' },
  { key: 'data', labelEn: 'Data', labelZh: '数据管理' },
] as const;

const Settings: React.FC<SettingsProps> = ({ lang, studioName, onStudioUpdate }) => {
  const [activeTab, setActiveTab] = useState<string>('ai');
  const [name, setName] = useState(studioName);
  const [coach, setCoach] = useState('');
  const [logo, setLogo] = useState('');
  const [accentColor, setAccentColor] = useState('#007AFF');
  const [savedBrand, setSavedBrand] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await db.getStudioConfig();
      if (c) {
        if (c.name) setName(c.name);
        if (c.coachName) setCoach(c.coachName);
        if (c.logo) setLogo(c.logo);
        if (c.accentColor) setAccentColor(c.accentColor);
      }
    })();
  }, []);

  const handleSaveBrand = async () => {
    await db.saveStudioConfig({ name, coachName: coach, logo: logo || undefined, accentColor });
    onStudioUpdate(name, coach, logo);
    setSavedBrand(true);
    setTimeout(() => setSavedBrand(false), 2000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

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
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="text-sm font-bold text-gray-800 mb-4">{lang === 'zh' ? '工作室 Logo' : 'Studio Logo'}</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
                {logo ? <img src={logo} className="w-full h-full object-cover" alt="Logo" /> : <span className="text-2xl text-gray-300 font-black">N</span>}
              </div>
              <label className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-600 cursor-pointer transition-all">
                {lang === 'zh' ? '上传 Logo' : 'Upload Logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 className="text-sm font-bold text-gray-800 mb-4">{lang === 'zh' ? '基本信息' : 'Info'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1 block">{lang === 'zh' ? '工作室名称' : 'Studio Name'}</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1 block">{lang === 'zh' ? '教练姓名' : 'Coach Name'}</label>
                <input type="text" value={coach} onChange={e => setCoach(e.target.value)} placeholder={lang === 'zh' ? '用于报告签名' : 'For report signature'}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-[#007AFF]/30 transition-all" />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.1em] mb-1 block">{lang === 'zh' ? '品牌色' : 'Accent Color'}</label>
                <div className="flex gap-2">
                  {['#007AFF', '#FF2D55', '#34C759', '#FF9500', '#5856D6', '#5AC8FA'].map(c => (
                    <button key={c} onClick={() => setAccentColor(c)}
                      className="w-8 h-8 rounded-full border-2 transition-all scale-press"
                      style={{ backgroundColor: c, borderColor: accentColor === c ? '#1D1D1F' : 'transparent' }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button onClick={handleSaveBrand}
            className="w-full py-3 rounded-xl text-sm font-bold text-white scale-press"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
            {savedBrand ? (lang === 'zh' ? '已保存' : 'Saved') : (lang === 'zh' ? '保存品牌设置' : 'Save Branding')}
          </button>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-bold text-gray-800 mb-3">{lang === 'zh' ? '数据管理' : 'Data Management'}</h3>
          <p className="text-xs text-gray-400 mb-4">{lang === 'zh' ? '所有数据存储在浏览器本地 IndexedDB 中。' : 'All data is stored locally in IndexedDB.'}</p>
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
