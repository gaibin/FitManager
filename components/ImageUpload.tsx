import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface ImageUploadProps {
  lang: Language;
  onUpload: (base64: string) => void;
  currentImage?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ lang, onUpload, currentImage }) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
        onUpload(result);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-6 flex flex-col items-center justify-center text-center">
      <div className="relative group mb-4">
        <div className={`w-32 h-32 rounded-2xl overflow-hidden border-2 ${preview ? 'border-lime-400' : 'border-dashed border-zinc-700'} flex items-center justify-center bg-zinc-950`}>
          {preview ? (
            <img src={preview} alt="Progress" className="w-full h-full object-cover" />
          ) : (
            <svg className="w-10 h-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>
        <label className="absolute bottom-0 right-0 bg-lime-500 text-zinc-900 p-2 rounded-full cursor-pointer hover:bg-lime-400 transition-colors shadow-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
        </label>
      </div>
      <span className="text-zinc-500 text-sm font-medium">{TRANSLATIONS.uploadPhoto[lang]}</span>
    </div>
  );
};

export default ImageUpload;