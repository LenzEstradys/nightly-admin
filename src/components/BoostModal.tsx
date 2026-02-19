/**
 * admin/src/components/BoostModal.tsx
 * Modal para activar "LLENAR RÁPIDO" - Notificaciones urgentes
 */

import { useState } from 'react';
import { X, Zap, Users, Clock, Target, DollarSign, Send } from 'lucide-react';
import { supabase } from '../supabase';

interface BoostModalProps {
  localId: string;
  localNombre: string;
  boostsRestantes: number;
  onClose: () => void;
  onBoostEnviado: () => void;
}

export default function BoostModal({ 
  localId, 
  localNombre, 
  boostsRestantes, 
  onClose, 
  onBoostEnviado 
}: BoostModalProps) {
  const [enviando, setEnviando] = useState(false);
  const [promocion, setPromocion] = useState('');
  const [duracion, setDuracion] = useState(2);
  const [radio, setRadio] = useState(2.0);

  const handleEnviar = async () => {
    if (!promocion.trim()) {
      alert('⚠️ Escribe una promoción atractiva');
      return;
    }

    setEnviando(true);
    try {
      const { data, error } = await supabase.rpc('usar_boost', {
        p_local_id: localId,
        p_titulo: `🔥 ${localNombre}`,
        p_mensaje: promocion,
        p_promocion: promocion,
        p_radio_km: radio,
        p_duracion_horas: duracion
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        throw new Error(result.error);
      }

      alert(`✅ ${result.mensaje}\n\nBoosts restantes: ${result.boosts_restantes}`);
      onBoostEnviado();
      onClose();
    } catch (error: any) {
      console.error('Error enviando boost:', error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl max-w-md w-full p-6 border border-orange-500/30 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">LLENAR RÁPIDO</h2>
              <p className="text-sm text-gray-400">Notifica a usuarios cercanos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Info */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 mb-6">
          <p className="text-sm text-blue-200">
            💡 <strong>Tip:</strong> Usa esto cuando tengas <strong>poca gente</strong> y quieras 
            atraer clientes rápidamente con una promoción irresistible.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Promoción */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Target size={16} />
              Promoción Urgente *
            </label>
            <textarea
              value={promocion}
              onChange={(e) => setPromocion(e.target.value)}
              placeholder="Ej: 2x1 en todo hasta las 23:00 🍺"
              maxLength={100}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 resize-none"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">{promocion.length}/100 caracteres</p>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Clock size={16} />
              Duración del Boost
            </label>
            <select
              value={duracion}
              onChange={(e) => setDuracion(parseInt(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
            >
              <option value={1}>1 hora</option>
              <option value={2}>2 horas (recomendado)</option>
              <option value={3}>3 horas</option>
              <option value={4}>4 horas</option>
            </select>
          </div>

          {/* Radio */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
              <Users size={16} />
              Radio de Notificación
            </label>
            <select
              value={radio}
              onChange={(e) => setRadio(parseFloat(e.target.value))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white"
            >
              <option value={1.0}>1 km (~100-200 usuarios)</option>
              <option value={2.0}>2 km (~300-500 usuarios)</option>
              <option value={3.0}>3 km (~500-800 usuarios)</option>
              <option value={5.0}>5 km (~1000+ usuarios)</option>
            </select>
          </div>

          {/* Preview */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Vista previa de la notificación:</p>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="font-bold text-white mb-1">🔥 {localNombre}</p>
              <p className="text-sm text-gray-300">{promocion || 'Tu promoción aparecerá aquí'}</p>
              <p className="text-xs text-gray-500 mt-2">📍 A solo 500m de ti - Poca gente ahora</p>
            </div>
          </div>

          {/* Costo */}
          <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign size={20} className="text-orange-400" />
                <span className="font-medium">Costo:</span>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-orange-400">1 Boost</p>
                <p className="text-xs text-gray-400">Te quedan: {boostsRestantes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={enviando}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={enviando || !promocion.trim() || boostsRestantes <= 0}
            className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
          >
            {enviando ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send size={20} />
                🚀 Enviar Ahora
              </>
            )}
          </button>
        </div>

        {boostsRestantes <= 0 && (
          <p className="text-xs text-center text-red-400 mt-4">
            ⚠️ No te quedan boosts este mes. Se renovarán en la próxima facturación.
          </p>
        )}
      </div>
    </div>
  );
}
