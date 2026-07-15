import React, { useEffect, useRef, useState } from 'react';
import type { Language, PostureView } from '../types';
import { compressCanvas } from '../services/imageUtils';

interface Props {
  open: boolean;
  view: PostureView;
  lang: Language;
  onClose: () => void;
  onCapture: (dataUrl: string) => void;
}

const labels: Record<PostureView, { zh: string; en: string; instructionZh: string; instructionEn: string }> = {
  front: { zh: '正面', en: 'Front', instructionZh: '双脚自然站立，镜头正对身体，完整露出头和脚。', instructionEn: 'Stand naturally, face the camera, and keep head and feet visible.' },
  side: { zh: '侧面', en: 'Side', instructionZh: '转至严格 90° 侧面，保持自然站姿，不刻意挺胸或收腹。', instructionEn: 'Turn to a true 90° side view and keep a relaxed natural stance.' },
  back: { zh: '背面', en: 'Back', instructionZh: '完全背对镜头，双脚自然站立，标志点保持可见。', instructionEn: 'Face directly away with markers visible and feet relaxed.' },
};

const PostureCameraCapture: React.FC<Props> = ({ open, view, lang, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState('');
  const [levelAngle, setLevelAngle] = useState<number | null>(null);
  const [levelPermission, setLevelPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    navigator.mediaDevices?.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    }).then(stream => {
      if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch(() => setError(lang === 'zh' ? '无法访问摄像头，请检查浏览器权限或改用照片上传。' : 'Camera access failed. Check permissions or upload a photo.'));
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    };
  }, [open, lang]);

  useEffect(() => {
    if (!open) return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const screenAngle = Math.abs(window.screen.orientation?.angle ?? (window as any).orientation ?? 0) % 180;
      let roll: number | null = null;
      if (screenAngle === 90 && event.beta != null) {
        roll = Math.sign(event.beta || 1) * (90 - Math.abs(event.beta));
      } else if (event.gamma != null) {
        roll = event.gamma;
      }
      if (roll != null && Number.isFinite(roll)) {
        setLevelAngle(Math.round(roll * 10) / 10);
        setLevelPermission('granted');
      }
    };
    window.addEventListener('deviceorientation', onOrientation);
    return () => window.removeEventListener('deviceorientation', onOrientation);
  }, [open]);

  if (!open) return null;
  const copy = labels[view];
  const isLevel = levelAngle == null || Math.abs(levelAngle) <= 4;

  const enableLevel = async () => {
    const Orientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (!Orientation?.requestPermission) return;
    try {
      const result = await Orientation.requestPermission();
      setLevelPermission(result);
    } catch {
      setLevelPermission('denied');
    }
  };

  const capture = () => {
    if (!isLevel) return;
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(compressCanvas(canvas, 0.78));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-gray-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 text-white">
          <div>
            <p className="text-sm font-bold">{lang === 'zh' ? `${copy.zh}引导拍摄` : `${copy.en} guided capture`}</p>
            <p className="mt-1 text-xs text-white/55">{lang === 'zh' ? copy.instructionZh : copy.instructionEn}</p>
          </div>
          <button onClick={onClose} className="rounded-full bg-white/10 px-3 py-1.5 text-xs">{lang === 'zh' ? '关闭' : 'Close'}</button>
        </div>
        <div className="relative aspect-[3/4] max-h-[72vh] bg-black md:aspect-video">
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-contain" />
          <div className="pointer-events-none absolute inset-[7%_22%] rounded-[45%_45%_18%_18%] border-2 border-dashed border-white/70" />
          <div className="pointer-events-none absolute left-1/2 top-[6%] bottom-[6%] border-l border-dashed border-lime-300/70" />
          <div className="pointer-events-none absolute left-[8%] right-[8%] top-1/2 border-t border-dashed border-lime-300/45" />
          <div className="absolute left-4 top-4 rounded-xl bg-black/55 px-3 py-2 text-[11px] leading-relaxed text-white/85">
            {lang === 'zh' ? '镜头位于身体中段 · 全身占画面 65%–85% · 保持自然站姿' : 'Camera at mid-body · Body fills 65%–85% · Natural stance'}
          </div>
          <div className={`absolute right-4 top-4 rounded-xl px-3 py-2 text-[11px] font-semibold ${isLevel ? 'bg-emerald-500/85 text-white' : 'bg-amber-500/90 text-white'}`}>
            {levelAngle == null
              ? (lang === 'zh' ? '请按绿色垂线校准' : 'Align with the green vertical')
              : (lang === 'zh' ? `水平仪 ${levelAngle > 0 ? '+' : ''}${levelAngle.toFixed(1)}°` : `Level ${levelAngle > 0 ? '+' : ''}${levelAngle.toFixed(1)}°`)}
          </div>
          {error && <div className="absolute inset-x-4 bottom-4 rounded-xl bg-red-500/90 p-3 text-sm text-white">{error}</div>}
        </div>
        <div className="flex items-center justify-center gap-4 p-4">
          {levelPermission === 'unknown' && typeof window.DeviceOrientationEvent !== 'undefined' && (
            <button onClick={enableLevel} className="rounded-xl bg-white/10 px-3 py-2 text-[11px] text-white/75">
              {lang === 'zh' ? '启用水平仪' : 'Enable level'}
            </button>
          )}
          <button onClick={capture} disabled={Boolean(error) || !isLevel} className="h-16 w-16 rounded-full border-4 border-white bg-[#007AFF] shadow-lg disabled:opacity-30" aria-label="Capture" />
          {!isLevel && <span className="text-[11px] text-amber-300">{lang === 'zh' ? '请将倾斜控制在 ±4°' : 'Keep tilt within ±4°'}</span>}
        </div>
      </div>
    </div>
  );
};

export default PostureCameraCapture;
