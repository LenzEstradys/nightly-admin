/**
 * admin/src/components/EditarLocal.tsx
 * Modal para editar información de un local
 * Sprint 3: Validaciones de formulario con errores inline por campo
 */

import { useState } from 'react';
import { X, Save, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';

interface Local {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  telefono: string | null;
  activo: boolean;
  verificado: boolean;
}

interface EditarLocalProps {
  local: Local;
  onGuardado: () => void;
  onCancelar: () => void;
}

type EstadoGuardado = 'idle' | 'guardando' | 'exito' | 'error';

interface Errores {
  nombre?: string;
  telefono?: string;
}

// Teléfonos bolivianos: 7/6xxxxxxx (móvil) o 2/3/4xxxxxxx (fijo)
const TELEFONO_BO = /^[2-9]\d{7}$/;

function validar(nombre: string, telefono: string): Errores {
  const errores: Errores = {};
  if (!nombre.trim()) {
    errores.nombre = 'El nombre es obligatorio';
  } else if (nombre.trim().length < 3) {
    errores.nombre = 'El nombre debe tener al menos 3 caracteres';
  } else if (nombre.trim().length > 80) {
    errores.nombre = 'El nombre no puede superar 80 caracteres';
  }
  const tel = telefono.replace(/[\s\-\(\)]/g, '');
  if (tel && !TELEFONO_BO.test(tel)) {
    errores.telefono = 'Formato inválido. Ej: 76543210 (8 dígitos)';
  }
  return errores;
}

export default function EditarLocal({ local, onGuardado, onCancelar }: EditarLocalProps) {
  const [estado, setEstado] = useState<EstadoGuardado>('idle');
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [nombre, setNombre] = useState(local.nombre);
  const [tipo, setTipo] = useState(local.tipo);
  const [direccion, setDireccion] = useState(local.direccion || '');
  const [telefono, setTelefono] = useState(local.telefono || '');
  const [errores, setErrores] = useState<Errores>({});
  const [tocado, setTocado] = useState<Record<string, boolean>>({});

  const marcarTocado = (campo: string) =>
    setTocado(prev => ({ ...prev, [campo]: true }));

  const handleGuardar = async () => {
    // Validar todos los campos antes de enviar
    const nuevosErrores = validar(nombre, telefono);
    setErrores(nuevosErrores);
    setTocado({ nombre: true, telefono: true });

    if (Object.keys(nuevosErrores).length > 0) return;

    setEstado('guardando');
    setMensajeError(null);

    try {
      const tel = telefono.replace(/[\s\-\(\)]/g, '');
      const updateData = {
        nombre: nombre.trim(),
        tipo,
        direccion: direccion.trim(),
        telefono: tel || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('locales')
        .update(updateData)
        .eq('id', local.id);

      if (error) throw error;

      setEstado('exito');
      setTimeout(() => onGuardado(), 1000);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido al guardar';
      setMensajeError(msg);
      setEstado('error');
    }
  };

  // Validar en tiempo real solo campos ya tocados
  const handleNombreChange = (val: string) => {
    setNombre(val);
    if (tocado.nombre) {
      setErrores(prev => ({ ...prev, ...validar(val, telefono) }));
    }
  };

  const handleTelefonoChange = (val: string) => {
    setTelefono(val);
    if (tocado.telefono) {
      const { telefono: telErr } = validar(nombre, val);
      setErrores(prev => ({ ...prev, telefono: telErr }));
    }
  };

  const cargando = estado === 'guardando';
  const formularioValido = Object.keys(validar(nombre, telefono)).length === 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-purple-500/30">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Editar Local</h2>
          <button
            onClick={onCancelar}
            disabled={cargando}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {/* Toast éxito */}
        {estado === 'exito' && (
          <div className="flex items-center gap-3 bg-green-900/40 border border-green-500/50 rounded-xl p-4 mb-4">
            <CheckCircle size={20} className="text-green-400 shrink-0" />
            <p className="text-green-300 font-medium">¡Local actualizado correctamente!</p>
          </div>
        )}

        {/* Toast error de red */}
        {estado === 'error' && mensajeError && (
          <div className="flex items-start gap-3 bg-red-900/40 border border-red-500/50 rounded-xl p-4 mb-4">
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium">Error al guardar</p>
              <p className="text-red-400 text-sm mt-1">{mensajeError}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-4">

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre del Local *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => handleNombreChange(e.target.value)}
              onBlur={() => {
                marcarTocado('nombre');
                setErrores(prev => ({ ...prev, ...validar(nombre, telefono) }));
              }}
              disabled={cargando || estado === 'exito'}
              className={`w-full bg-gray-700 border rounded-lg px-4 py-3 text-white focus:outline-none transition-colors disabled:opacity-60 ${
                tocado.nombre && errores.nombre
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-600 focus:border-purple-500'
              }`}
            />
            {tocado.nombre && errores.nombre && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errores.nombre}
              </p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Local *
            </label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              disabled={cargando || estado === 'exito'}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 disabled:opacity-60"
            >
              <option value="bar">🍺 Bar</option>
              <option value="club">🎵 Club</option>
              <option value="pub">🍻 Pub</option>
              <option value="discoteca">💃 Discoteca</option>
              <option value="restaurante">🍴 Restaurante</option>
            </select>
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dirección
            </label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              disabled={cargando || estado === 'exito'}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 disabled:opacity-60"
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => handleTelefonoChange(e.target.value)}
              onBlur={() => {
                marcarTocado('telefono');
                const { telefono: telErr } = validar(nombre, telefono);
                setErrores(prev => ({ ...prev, telefono: telErr }));
              }}
              placeholder="Ej: 76543210"
              disabled={cargando || estado === 'exito'}
              className={`w-full bg-gray-700 border rounded-lg px-4 py-3 text-white focus:outline-none transition-colors disabled:opacity-60 ${
                tocado.telefono && errores.telefono
                  ? 'border-red-500 focus:border-red-400'
                  : 'border-gray-600 focus:border-purple-500'
              }`}
            />
            {tocado.telefono && errores.telefono && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {errores.telefono}
              </p>
            )}
          </div>

          {/* Info */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-xs text-blue-200">
              ℹ️ <strong>Nota:</strong> Los campos "Activo" y "Verificado" solo pueden ser modificados por administradores desde el panel de super admin.
            </p>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancelar}
            disabled={cargando}
            className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={cargando || !formularioValido || estado === 'exito'}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
          >
            {cargando ? (
              <><Loader size={20} className="animate-spin" />Guardando...</>
            ) : estado === 'exito' ? (
              <><CheckCircle size={20} />Guardado</>
            ) : (
              <><Save size={20} />Guardar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
