/**
 * 体态热力图叠加 — 在照片上用颜色标注异常区域
 */

import React, { useRef, useEffect } from 'react';
import type { PostureIssue } from '../types';

interface PostureHeatmapProps {
  issues: PostureIssue[];
  width: number;
  height: number;
  opacity?: number;
}

// 体态问题对应的照片区域 (归一化坐标 0-1)
const ISSUE_REGIONS: Record<string, { x: number; y: number; r: number; label: string }[]> = {
  '高低肩': [{ x: 0.5, y: 0.15, r: 0.3, label: 'Shoulder' }],
  '头前引': [{ x: 0.5, y: 0.08, r: 0.15, label: 'Neck' }],
  '含胸圆肩': [{ x: 0.5, y: 0.2, r: 0.25, label: 'Chest' }],
  '骨盆前倾趋势': [{ x: 0.5, y: 0.5, r: 0.2, label: 'Pelvis' }],
  '骨盆倾斜': [{ x: 0.5, y: 0.5, r: 0.2, label: 'Pelvis' }],
  '膝内扣': [{ x: 0.5, y: 0.75, r: 0.15, label: 'Knee' }],
  '脊柱侧弯趋势': [{ x: 0.5, y: 0.35, r: 0.35, label: 'Spine' }],
  '肩旋转': [{ x: 0.5, y: 0.17, r: 0.28, label: 'Shoulder' }],
};

const sevColor = (s: string): [number, number, number] =>
  s === '严重' ? [255, 59, 48] : s === '中度' ? [255, 149, 0] : [52, 199, 89];

const PostureHeatmap: React.FC<PostureHeatmapProps> = ({ issues, width, height, opacity = 0.5 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, width, height);

    issues.forEach(issue => {
      const regions = ISSUE_REGIONS[issue.name] || [{ x: 0.5, y: 0.4, r: 0.2, label: issue.name }];
      const [r, g, b] = sevColor(issue.severity);

      regions.forEach(region => {
        const cx = region.x * width;
        const cy = region.y * height;
        const radius = region.r * Math.min(width, height);

        // Gradient circle
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `rgba(${r},${g},${b},${opacity})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${opacity * 0.5})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Thin border
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Small label at bottom of circle
        if (issue.severity !== '正常') {
          ctx.fillStyle = `rgba(${r},${g},${b},0.9)`;
          ctx.font = `bold ${Math.max(10, radius * 0.2)}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(issue.severity, cx, cy + radius * 0.65);
        }
      });
    });
  }, [issues, width, height, opacity]);

  if (issues.length === 0) return null;
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
};

export default PostureHeatmap;
