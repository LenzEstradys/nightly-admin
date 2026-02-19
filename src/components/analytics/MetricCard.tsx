// ===============================================
// ARCHIVO: src/components/analytics/MetricCard.tsx
// DESCRIPCIÓN: Tarjeta de métrica individual
// ===============================================

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MetricCardProps } from '../../types/analytics';

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'purple'
}) => {
  const colorClasses = {
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/30',
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/30',
    green: 'from-green-500/20 to-green-600/20 border-green-500/30',
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30'
  };

  const iconColorClasses = {
    purple: 'text-purple-400',
    blue: 'text-blue-400',
    green: 'text-green-400',
    orange: 'text-orange-400'
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp size={16} className="text-green-400" />;
    if (trend === 'down') return <TrendingDown size={16} className="text-red-400" />;
    return <Minus size={16} className="text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-gray-400';
  };

  return (
    <div 
      className={`bg-gradient-to-br ${colorClasses[color]} border rounded-xl p-6 transition-all hover:scale-[1.02] hover:shadow-xl`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg bg-gray-800/50 ${iconColorClasses[color]}`}>
          {icon}
        </div>
        {trend && trendValue && (
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <span className={`text-sm font-semibold ${getTrendColor()}`}>
              {trendValue}
            </span>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-400 mb-1">
          {title}
        </h3>
        <p className="text-3xl font-black text-white mb-1">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-gray-500">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default MetricCard;