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
    <div className="card-hover bg-white rounded-2xl p-5 relative overflow-hidden" style={{
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
    }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: color }} />
      <div className="flex justify-between items-start mb-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-gray-400">{label}</p>
        {icon && <div className="opacity-50" style={{ color }}>{icon}</div>}
      </div>
      <div className="flex items-end gap-2">
        <h3 className="text-3xl font-extrabold text-gray-800 tracking-tight">{value}</h3>
        {subValue && <span className="text-sm font-semibold text-gray-400 mb-0.5">{subValue}</span>}
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
