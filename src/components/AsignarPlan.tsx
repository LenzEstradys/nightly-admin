/**
 * admin/src/components/AsignarPlan.tsx
 * Modal para que el super admin asigne un plan a un propietario
 * Usa backendService (service_role) para bypasear RLS de perfiles
 */

import { useState } from 'react';
import { X, Check, Loader, Crown } from 'lucide-react';
import { PLANES, type TipoPlan } from '../types/planes';
import { backendService } from '../services/backendService';

interface Propietario {
  id: string;
  nombre_completo: string;
  email: string;
  plan: TipoPlan;
  plan_vence_en: string | null;
}

interface AsignarPlanProps {
  propietario: Propietario;
  onGuardado: () => void;
  onCancelar: () => void;
}

const COLORES_PLAN: Record<TipoPlan, string> = {
  basico:      'border-gray-600 bg-gray-800',
  profesional: 'border-blue-500 bg-blue-900/30',
  premium:     'border-yellow-500 bg-yellow-900/30',
};

export default function AsignarPlan({ propietario, onGuardado, onCancelar }: AsignarPlanProps) {
  const [planSeleccionado, setPlanSeleccionado] = useState<TipoPlan>(propietario.plan);
  const [meses, setMeses] = useState(1);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechaVencimiento = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + meses);
    return d.toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const venceEnISO = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + meses);
    return d.toISOString();
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await backendService.asignarPlan(propietario.id, planSeleccionado, venceEnISO());
      onGuardado();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-lg w-full p-6 border border-purple-500/30">

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Crown size={24} className="text-yellow-400" />
            <div>
              <h2 className="text-xl font-bold text-white">Asignar Plan</h2>
              <p className="text-sm text-gray-400">{propietario.nombre_completo} · {propietario.email}</p>
            </div>
          </div>
          <button onClick={onCancelar} disabled={guardando}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-3 mb-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Selector de plan */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {(Object.keys(PLANES) as TipoPlan[]).map((tipo) => {
            const p = PLANES[tipo];
            const esActual = tipo === propietario.plan;
            const seleccionado = tipo === planSeleccionado;
            return (
              <button key={tipo} onClick={() => setPlanSeleccionado(tipo)}
                className={`rounded-xl p-4 border-2 text-center transition-all relative ${
                  seleccionado
                    ? COLORES_PLAN[tipo] + ' ring-2 ring-offset-1 ring-offset-gray-800 ring-white/30'
                    : 'border-gray-700 bg-gray-700/50 opacity-60 hover:opacity-80'
                }`}>
                {esActual && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gray-600 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                    actual
                  </div>
                )}
                <div className="text-2xl mb-1">{p.badge || '📋'}</div>
                <div className="font-bold text-white text-sm">{p.nombre}</div>
                <div className="text-xs text-gray-300 mt-1">Bs. {p.precio}/mes</div>
              </button>
            );
          })}
        </div>

        {/* Duración */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Duración del plan</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 6].map((m) => (
              <button key={m} onClick={() => setMeses(m)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  meses === m ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}>
                {m === 1 ? '1 mes' : m === 6 ? '6 meses' : `${m} meses`}
              </button>
            ))}
          </div>
        </div>

        {/* Resumen */}
        <div className="bg-gray-900/60 rounded-xl p-4 mb-6 border border-gray-700">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Plan</span>
            <span className="text-white font-medium">{PLANES[planSeleccionado].badge} {PLANES[planSeleccionado].nombre}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Duración</span>
            <span className="text-white font-medium">{meses} {meses === 1 ? 'mes' : 'meses'}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Total</span>
            <span className="text-green-400 font-bold">Bs. {PLANES[planSeleccionado].precio * meses}</span>
          </div>
          <div className="flex justify-between text-sm border-t border-gray-700 pt-2 mt-2">
            <span className="text-gray-400">Vence el</span>
            <span className="text-white">{fechaVencimiento()}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onCancelar} disabled={guardando}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 text-white py-3 rounded-lg font-medium transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={guardando}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
            {guardando
              ? <><Loader size={18} className="animate-spin" />Guardando...</>
              : <><Check size={18} />Asignar Plan</>}
          </button>
        </div>
      </div>
    </div>
  );
}
