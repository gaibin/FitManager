import React, { useState } from 'react';
import { Language } from '../types';

interface ImageUploadProps { lang: Language; onUpload: (base64: string) => void; currentImage?: string; }

const ImageUpload: React.FC<ImageUploadProps> = ({ lang, onUpload, currentImage }) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { const result = reader.result as string; setPreview(result); onUpload(result); };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 flex flex-col items-center" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="relative group mb-2">
        <div className={`w-28 h-28 rounded-2xl overflow-hidden border-2 flex items-center justify-center bg-gray-50 transition-all ${preview ? 'border-[#007AFF]/20' : 'border-dashed border-gray-200'}`}>
          {preview ? (
            <img src={preview} alt="Progress" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          )}
        </div>
        <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer shadow-sm transition-transform hover:scale-110" style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>
      <span className="text-[10px] font-medium text-gray-400">Progress Photo</span>
    </div>
  );
};

export default ImageUpload;
