import React, { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Language, PostureAssessment, PostureMeasurement } from '../types';
import { buildPostureSeries } from '../services/postureSeries';

interface AssessmentTrendsProps {
  assessments: PostureAssessment[];
  lang: Language;
}

interface MeasurementOption {
  id: string;
  name: string;
  nameEn: string;
  unit: string;
  count: number;
}

interface TrendPoint {
  date: string;
  fullDate: string;
  value: number;
  confidence: number;
  uncertainty: number | null;
}

const getMeasurements = (assessment: PostureAssessment): PostureMeasurement[] =>
  assessment.measurements ?? assessment.report.measurements ?? [];

const toPercent = (value: number) => Math.round(value <= 1 ? value * 100 : value);

const AssessmentTrends: React.FC<AssessmentTrendsProps> = ({ assessments, lang }) => {
  const series = useMemo(() => buildPostureSeries(assessments), [assessments]);

  const scoreData = useMemo<TrendPoint[]>(() => series.points.map(point => ({
    date: point.date.substring(5),
    fullDate: point.date,
    value: point.value,
    confidence: toPercent(point.confidence),
    uncertainty: null,
  })), [series]);

  const measurementOptions = useMemo<MeasurementOption[]>(() => {
    const grouped = new Map<string, MeasurementOption>();
    assessments.forEach(assessment => {
      if (assessment.schemaVersion !== 2) return;
      getMeasurements(assessment).forEach(measurement => {
        const unit = measurement.unit.toLowerCase();
        const isAngle = unit.includes('\u00b0') || unit.includes('deg');
        if (!isAngle || measurement.status === 'unavailable' || !Number.isFinite(measurement.value)) return;
        const existing = grouped.get(measurement.id);
        grouped.set(measurement.id, {
          id: measurement.id,
          name: measurement.name,
          nameEn: measurement.nameEn,
          unit: measurement.unit,
          count: (existing?.count ?? 0) + 1,
        });
      });
    });
    return Array.from(grouped.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [assessments]);

  const [activeMetric, setActiveMetric] = useState('score');
  const optionKey = measurementOptions.map(option => option.id).join('|');

  useEffect(() => {
    if (activeMetric === 'score' && scoreData.length === 0 && measurementOptions.length > 0) {
      setActiveMetric(measurementOptions[0].id);
      return;
    }
    if (activeMetric !== 'score' && !measurementOptions.some(option => option.id === activeMetric)) {
      setActiveMetric(scoreData.length > 0 ? 'score' : measurementOptions[0]?.id ?? 'score');
    }
  }, [activeMetric, optionKey, scoreData.length]);

  const activeOption = measurementOptions.find(option => option.id === activeMetric);
  const measurementData = useMemo<TrendPoint[]>(() => {
    if (!activeOption) return [];
    return assessments
      .map(assessment => {
        const measurement = getMeasurements(assessment).find(item => item.id === activeOption.id);
        if (!measurement || measurement.status === 'unavailable' || !Number.isFinite(measurement.value)) return null;
        return {
          date: assessment.date.substring(5),
          fullDate: assessment.date,
          value: measurement.value,
          confidence: toPercent(measurement.confidence),
          uncertainty: measurement.uncertainty,
        };
      })
      .filter((point): point is TrendPoint => point !== null)
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));
  }, [activeOption, assessments]);

  if (assessments.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <h3 className="text-sm font-bold text-gray-800 mb-4">{lang === 'zh' ? '体态评估趋势' : 'Assessment Trends'}</h3>
        <div className="flex items-center justify-center h-32 text-sm text-gray-400">
          {lang === 'zh' ? '暂无评估数据，完成首次体态评估后显示' : 'No assessment data yet'}
        </div>
      </div>
    );
  }

  const isScore = activeMetric === 'score';
  const data = isScore ? scoreData : measurementData;
  const unit = isScore ? (lang === 'zh' ? '点' : 'pts') : (activeOption?.unit || '\u00b0');
  const decimals = isScore ? 0 : 1;
  const title = isScore
    ? (series.version === 'v2'
        ? (lang === 'zh' ? '个人趋势指数' : 'Personal Trend Index')
        : (lang === 'zh' ? '旧版体态评分' : 'Legacy Posture Score'))
    : (lang === 'zh' ? activeOption?.name : activeOption?.nameEn) || '';
  const first = data[0];
  const latest = data[data.length - 1];
  const delta = first && latest ? latest.value - first.value : 0;

  return (
    <div className="bg-white rounded-2xl p-6 h-full" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-800">{lang === 'zh' ? '体态变化追踪' : 'Posture Progress'}</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-extrabold text-gray-900">{latest ? latest.value.toFixed(decimals) : '\u2014'}</span>
            <span className="text-xs font-semibold text-gray-400">{unit}</span>
            {data.length >= 2 && (
              <span className={`text-xs font-bold ${isScore ? (delta >= 0 ? 'text-[#248A3D]' : 'text-[#FF3B30]') : 'text-[#007AFF]'}`}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(decimals)}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">{title}</p>
        </div>
        {(scoreData.length > 0 || measurementOptions.length > 0) && (
          <select value={activeMetric} onChange={event => setActiveMetric(event.target.value)}
            className="bg-gray-100 border-0 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-[#007AFF]/15 max-w-[220px]">
            {scoreData.length > 0 && (
              <option value="score">{series.version === 'v2' ? (lang === 'zh' ? '个人趋势指数' : 'Trend index') : (lang === 'zh' ? '旧版评分' : 'Legacy score')}</option>
            )}
            {measurementOptions.map(option => (
              <option key={option.id} value={option.id}>{lang === 'zh' ? option.name : option.nameEn}</option>
            ))}
          </select>
        )}
      </div>

      {data.length === 0 ? (
        <div className="h-[170px] rounded-xl bg-gray-50 flex items-center justify-center px-6 text-center text-sm text-gray-400">
          {lang === 'zh' ? '首次测量已保存；下一次评估后会形成变化折线。' : 'The baseline is saved. A trend appears after the next assessment.'}
        </div>
      ) : (
        <div className="h-[210px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6E6E73', fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis domain={isScore ? [0, 100] : ['auto', 'auto']} tick={{ fill: '#6E6E73', fontSize: 10 }} tickLine={false} axisLine={false} width={42}
                tickFormatter={value => Number(value).toFixed(decimals)} />
              <Tooltip
                formatter={(value: any, _name: any, item: any) => {
                  const point = item?.payload;
                  const uncertainty = point?.uncertainty != null ? ` \u00b1${Number(point.uncertainty).toFixed(1)}` : '';
                  return [`${Number(value).toFixed(decimals)}${uncertainty} ${unit}`, title];
                }}
                labelFormatter={(_label: any, payload: any[]) => {
                  const point = payload?.[0]?.payload;
                  return point ? `${point.fullDate} \u00b7 ${lang === 'zh' ? '置信度' : 'confidence'} ${point.confidence}%` : _label;
                }}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E5EA', borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                itemStyle={{ color: '#1D1D1F', fontSize: 12 }}
                labelStyle={{ color: '#6E6E73', marginBottom: 6, fontSize: 11 }}
              />
              <Line type="monotone" dataKey="value" name={title} stroke="#007AFF" strokeWidth={2.5}
                dot={{ fill: '#007AFF', stroke: '#fff', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: '#007AFF', stroke: '#fff', strokeWidth: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {!isScore && data.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-2">
          {lang === 'zh' ? '角度按历次原始测量展示，正负方向沿用评估页定义。' : 'Raw angle history; signed direction follows the assessment definition.'}
        </p>
      )}
    </div>
  );
};

export default AssessmentTrends;
