// ===============================================
// ARCHIVO: src/types/analytics.ts
// DESCRIPCIÓN: Types para analytics
// ===============================================

export interface AnalyticsDay {
  fecha: string;
  vistas: number;
  clicks_direccion: number;
  clicks_total: number;
}

export interface AnalyticsTotals {
  total_vistas: number;
  total_clicks: number;
  promedio_vistas: number;
}

export interface RankingLocal {
  id: string;
  nombre: string;
  tipo: string;
  total_vistas: number;
  total_clicks: number;
  ranking: number;
}

export interface LocalStats {
  analytics_week: AnalyticsDay[];
  totals: AnalyticsTotals;
  ranking: number;
  total_locales: number;
}

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'purple' | 'blue' | 'green' | 'orange';
}