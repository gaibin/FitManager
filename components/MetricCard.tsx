import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, subValue, icon }) => {
  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-5 hover:border-lime-500/30 transition-colors duration-300">
      <div className="flex justify-between items-start mb-2">
        <p className="text-zinc-500 text-sm uppercase tracking-wider font-semibold">{label}</p>
        {icon && <div className="text-lime-400">{icon}</div>}
      </div>
      <div className="flex items-end space-x-2">
        <h3 className="text-3xl font-bold text-zinc-100">{value}</h3>
        {subValue && <span className="text-lime-400 text-sm font-medium mb-1">{subValue}</span>}
      </div>
    </div>
  );
};

export default MetricCard;