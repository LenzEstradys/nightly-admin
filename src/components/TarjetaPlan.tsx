/**
 * admin/src/components/TarjetaPlan.tsx
 * Tarjeta de plan — usada en PropietarioPanel y SuperAdminPanel
 */

import { Check, X } from 'lucide-react';
import { PLANES, type TipoPlan, diasRestantes } from '../types/planes';

interface TarjetaPlanProps {
  planActual: TipoPlan;
  planVenceEn?: string | null;
  /** Si true, muestra las 3 tarjetas comparativas (vista propietario) */
  modoComparacion?: boolean;
  /** Si true, muestra solo la tarjeta del plan actual (vista compacta) */
  modoCompacto?: boolean;
}

const COLORES: Record<TipoPlan, {
  borde: string; fondo: string; badge: string; boton: string; texto: string;
}> = {
  basico:      { borde: 'border-gray-600',  fondo: 'bg-gray-800/60',   badge: 'bg-gray-700 text-gray-300',  boton: 'bg-gray-600 hover:bg-gray-500',           texto: 'text-gray-300' },
  profesional: { borde: 'border-blue-500',  fondo: 'bg-blue-900/20',   badge: 'bg-blue-800 text-blue-200',  boton: 'bg-blue-600 hover:bg-blue-500',           texto: 'text-blue-300' },
  premium:     { borde: 'border-yellow-500',fondo: 'bg-yellow-900/20', badge: 'bg-yellow-700 text-yellow-100', boton: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400', texto: 'text-yellow-300' },
};

export default function TarjetaPlan({ planActual, planVenceEn, modoComparacion, modoCompacto }: TarjetaPlanProps) {
  const dias = diasRestantes(planVenceEn ?? null);
  const plan = PLANES[planActual];
  const c = COLORES[planActual];

  if (modoCompacto) {
    return (
      <div className={`rounded-xl p-4 border ${c.borde} ${c.fondo}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-2xl px-3 py-1 rounded-lg ${c.badge} font-bold`}>
              {plan.badge || '📋'} {plan.nombre}
            </span>
            <span className={`text-xl font-bold ${c.texto}`}>Bs. {plan.precio}/mes</span>
          </div>
          {dias !== null && (
            <span className={`text-sm px-3 py-1 rounded-full ${dias <= 5 ? 'bg-red-900/50 text-red-300' : 'bg-gray-700 text-gray-300'}`}>
              {dias === 0 ? '⚠️ Vencido' : `${dias} días restantes`}
            </span>
          )}
        </div>
      </div>
    );
  }

  if (modoComparacion) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(PLANES) as TipoPlan[]).map((tipoPlan) => {
          const p = PLANES[tipoPlan];
          const col = COLORES[tipoPlan];
          const esActual = tipoPlan === planActual;

          return (
            <div
              key={tipoPlan}
              className={`rounded-xl p-5 border-2 relative transition-all ${col.borde} ${col.fondo} ${
                esActual ? 'ring-2 ring-offset-2 ring-offset-gray-900 ' + col.borde : 'opacity-80'
              }`}
            >
              {esActual && (
                <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${col.badge}`}>
                  TU PLAN ACTUAL
                </div>
              )}

              <div className="text-center mb-4">
                <div className="text-3xl mb-1">{p.badge || '📋'}</div>
                <h3 className={`text-lg font-bold ${col.texto}`}>{p.nombre}</h3>
                <div className="text-2xl font-bold text-white mt-1">
                  Bs. {p.precio}<span className="text-sm text-gray-400">/mes</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">{p.descripcion}</p>
              </div>

              <div className="space-y-2">
                {p.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <Check size={14} className="text-green-400 mt-0.5 shrink-0" />
                    <span className="text-gray-200">{f}</span>
                  </div>
                ))}
                {p.featuresNoIncluidas.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm opacity-40">
                    <X size={14} className="text-gray-500 mt-0.5 shrink-0" />
                    <span className="text-gray-400">{f}</span>
                  </div>
                ))}
              </div>

              {!esActual && tipoPlan !== 'basico' && (
                <div className={`mt-4 w-full py-2 rounded-lg text-center text-sm font-bold text-white ${col.boton} cursor-default`}>
                  Contacta al administrador
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return null;
}
