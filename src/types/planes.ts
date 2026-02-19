/**
 * admin/src/types/planes.ts
 * Tipos y constantes del sistema de planes
 */

export type TipoPlan = 'basico' | 'profesional' | 'premium';

export interface Plan {
  id: TipoPlan;
  nombre: string;
  precio: number;
  color: string;
  badge: string;
  descripcion: string;
  features: string[];
  featuresNoIncluidas: string[];
}

export const PLANES: Record<TipoPlan, Plan> = {
  basico: {
    id: 'basico',
    nombre: 'Básico',
    precio: 20,
    color: 'gray',
    badge: '',
    descripcion: 'Presencia esencial en el mapa',
    features: [
      'Aparecer en el mapa',
      'Actualizar capacidad en tiempo real',
      'Una promoción activa',
    ],
    featuresNoIncluidas: [
      'Posición destacada',
      'Fotos del local',
      'Estadísticas semanales',
      'Badge visible',
      'Boost al #1',
    ],
  },
  profesional: {
    id: 'profesional',
    nombre: 'Profesional',
    precio: 120,
    color: 'blue',
    badge: '⭐',
    descripcion: 'Más visibilidad, más clientes',
    features: [
      'Todo lo del plan Básico',
      'Badge ⭐ Destacado visible',
      'Posición normal (sobre básicos)',
      'Hasta 3 promociones activas',
      'Hasta 5 fotos del local',
      'Estadísticas semanales básicas',
    ],
    featuresNoIncluidas: [
      'Posición Top fija',
      'Boost al #1',
      'WhatsApp directo',
      'Stats completas',
    ],
  },
  premium: {
    id: 'premium',
    nombre: 'Premium',
    precio: 280,
    color: 'yellow',
    badge: '👑',
    descripcion: 'Máxima visibilidad en tu ciudad',
    features: [
      'Todo lo del plan Profesional',
      'Badge 👑 Premium visible',
      'Top fijo en tu ciudad',
      'Promociones ilimitadas',
      'Hasta 15 fotos del local',
      'Estadísticas completas',
      'Boost al #1 (4 veces/mes, 2 horas)',
      'Botón WhatsApp directo',
    ],
    featuresNoIncluidas: [],
  },
};

export function planVigente(planVenceEn: string | null): boolean {
  if (!planVenceEn) return true; // Sin fecha = vigente indefinido
  return new Date(planVenceEn) > new Date();
}

export function diasRestantes(planVenceEn: string | null): number | null {
  if (!planVenceEn) return null;
  const diff = new Date(planVenceEn).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
