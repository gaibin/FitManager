import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, subValue, icon, trend, trendUp, color = '#007AFF' }) => {
  return (
    <div className="card-hover relative overflow-hidden rounded-2xl bg-white p-3.5 sm:p-5" style={{
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
    }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: color }} />
      <div className="flex justify-between items-start mb-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.03em] text-gray-400 sm:text-[11px] sm:tracking-[0.05em]">{label}</p>
        {icon && <div className="hidden opacity-50 sm:block" style={{ color }}>{icon}</div>}
      </div>
      <div className="flex items-end gap-2">
        <h3 className="text-2xl font-extrabold tracking-tight text-gray-800 sm:text-3xl">{value}</h3>
        {subValue && <span className="mb-0.5 text-xs font-semibold text-gray-400 sm:text-sm">{subValue}</span>}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-2">
          <svg className={`w-3 h-3 ${trendUp ? 'text-[#34C759]' : 'text-[#FF3B30]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={trendUp ? "M5 10l7-7m0 0l7 7m-7-7v18" : "M19 14l-7 7m0 0l-7-7m7 7V3"} />
          </svg>
          <span className={`text-[11px] font-semibold ${trendUp ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>{trend}</span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
