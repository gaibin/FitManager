import React, { useMemo, useRef, useState } from 'react';
import type { PostureLandmark, PostureMeasurement, PostureViewResult } from '../types';

interface Props {
  src: string;
  view: PostureViewResult;
  measurement?: PostureMeasurement;
  editable?: boolean;
  onMove?: (collection: 'landmarks' | 'markers', name: string, point: PostureLandmark) => void;
  className?: string;
}

const CONNECTIONS: [string, string][] = [
  ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
  ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
  ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
  ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
  ['right_hip', 'right_knee'], ['right_knee', 'right_ankle'],
];

const PosturePhotoOverlay: React.FC<Props> = ({ src, view, measurement, editable = false, onMove, className = '' }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [imageSize, setImageSize] = useState({ width: 1000, height: 1500 });
  const active = useMemo(() => new Set(measurement?.landmarkIds || []), [measurement]);
  const points: Record<string, PostureLandmark> = { ...view.landmarks, ...view.markers };

  const movePoint = (event: React.PointerEvent<SVGCircleElement>, collection: 'landmarks' | 'markers', name: string) => {
    if (!editable || !onMove || !svgRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const update = (clientX: number, clientY: number) => {
      const svg = svgRef.current!;
      const pt = svg.createSVGPoint();
      pt.x = clientX; pt.y = clientY;
      const local = pt.matrixTransform(svg.getScreenCTM()?.inverse());
      const original = collection === 'markers' ? view.markers[name] : view.landmarks[name];
      onMove(collection, name, {
        ...original,
        x: Math.max(0, Math.min(1, local.x / imageSize.width)),
        y: Math.max(0, Math.min(1, local.y / imageSize.height)),
        source: 'manual', confidence: 1, visibility: 1, sigma: 0.0015,
      });
    };
    update(event.clientX, event.clientY);
    const onPointerMove = (e: PointerEvent) => update(e.clientX, e.clientY);
    const onPointerUp = () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp, { once: true });
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-950 ${className}`}>
      <img
        src={src}
        alt={`${view.view} posture evidence`}
        className="block h-full w-full object-contain"
        onLoad={event => setImageSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
      />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${imageSize.width} ${imageSize.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="absolute inset-0 h-full w-full"
      >
        {CONNECTIONS.map(([a, b]) => {
          if (!points[a] || !points[b]) return null;
          const highlighted = active.has(a) || active.has(b);
          return (
            <line key={`${a}-${b}`} x1={points[a].x * imageSize.width} y1={points[a].y * imageSize.height}
              x2={points[b].x * imageSize.width} y2={points[b].y * imageSize.height}
              stroke={highlighted ? '#FF9500' : '#7FB3FF'} strokeWidth={highlighted ? 5 : 3}
              vectorEffect="non-scaling-stroke" opacity={0.9} />
          );
        })}
        {(Object.entries(view.landmarks) as [string, PostureLandmark][]).map(([name, point]) => (
          <circle key={`pose-${name}`} cx={point.x * imageSize.width} cy={point.y * imageSize.height}
            r={active.has(name) ? 10 : 6} fill={active.has(name) ? '#FF9500' : '#007AFF'}
            stroke="white" strokeWidth={2} vectorEffect="non-scaling-stroke"
            opacity={point.visibility < 0.5 ? 0.35 : 0.95}
            className={editable ? 'cursor-grab active:cursor-grabbing' : ''}
            onPointerDown={event => movePoint(event, 'landmarks', name)} />
        ))}
        {(Object.entries(view.markers) as [string, PostureLandmark][]).map(([name, point]) => (
          <g key={`marker-${name}`}>
            <circle cx={point.x * imageSize.width} cy={point.y * imageSize.height}
              r={active.has(name) ? 13 : 9} fill={point.source === 'marker' || point.source === 'manual' ? '#34C759' : '#FFD60A'} stroke="white" strokeWidth={3}
              vectorEffect="non-scaling-stroke" className={editable ? 'cursor-grab active:cursor-grabbing' : ''}
              onPointerDown={event => movePoint(event, 'markers', name)} />
            <text x={point.x * imageSize.width + 12} y={point.y * imageSize.height - 12}
              fill="white" fontSize="22" fontWeight="700" paintOrder="stroke" stroke="#111827" strokeWidth="4">
              {name}
            </text>
          </g>
        ))}
      </svg>
      <div className="absolute bottom-3 left-3 rounded-full bg-black/65 px-3 py-1.5 text-[10px] font-semibold text-white">
        蓝色：模型节点 · 绿色：贴点/人工点 · 黄色：待复核代理点 · 橙色：当前测量
      </div>
    </div>
  );
};

export default PosturePhotoOverlay;
