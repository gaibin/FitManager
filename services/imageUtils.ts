/**
 * 图片处理工具 — base64/Blob 互转、压缩
 */

// base64 data URL → Blob
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binary = atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return new Blob([array], { type: mime });
}

// Blob → base64 data URL
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Blob → Object URL（用于 img src 显示）
export function blobToUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

// 压缩图片到指定宽度，返回 base64 data URL
function estimatedDataUrlBytes(dataUrl: string): number {
  const payload = dataUrl.slice(dataUrl.indexOf(',') + 1);
  return Math.ceil(payload.length * 0.75);
}

function encodeCanvasWithinLimit(
  source: HTMLCanvasElement,
  quality: number,
  targetBytes: number,
): string {
  let canvas = source;
  let currentQuality = quality;
  let encoded = canvas.toDataURL('image/jpeg', currentQuality);

  for (let attempt = 0; attempt < 7 && estimatedDataUrlBytes(encoded) > targetBytes; attempt++) {
    if (currentQuality > 0.58) {
      currentQuality = Math.max(0.58, currentQuality - 0.07);
    } else {
      if (Math.max(canvas.width, canvas.height) <= 1100) break;
      const next = document.createElement('canvas');
      next.width = Math.max(1, Math.round(canvas.width * 0.86));
      next.height = Math.max(1, Math.round(canvas.height * 0.86));
      next.getContext('2d')!.drawImage(canvas, 0, 0, next.width, next.height);
      canvas = next;
    }
    encoded = canvas.toDataURL('image/jpeg', currentQuality);
  }

  return encoded;
}

export function compressCanvas(canvas: HTMLCanvasElement, quality = 0.82, targetBytes = 850 * 1024): string {
  return encodeCanvasWithinLimit(canvas, quality, targetBytes);
}

export function compressImage(file: File, maxDimension = 1800, quality = 0.82, targetBytes = 850 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(compressCanvas(canvas, quality, targetBytes));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 检查图片是否有效
export function validateImage(file: File): string | null {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    return '仅支持 JPEG / PNG 格式';
  }
  if (file.size > 10 * 1024 * 1024) {
    return '图片大小不能超过 10MB';
  }
  return null;
}
