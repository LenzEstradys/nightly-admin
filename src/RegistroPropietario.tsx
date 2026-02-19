import { useState } from 'react';
import { supabase } from './supabase';
import { ArrowLeft, UserPlus, Key, User, Mail, Lock, Check, Loader, Eye, EyeOff } from 'lucide-react';

interface RegistroPropietarioProps {
  onVolverALogin: () => void;
  onRegistroExitoso?: () => void;
}

/**
 * Espera a que el trigger de Supabase cree el perfil del usuario recién registrado.
 * Usa backoff exponencial: 200ms, 400ms, 800ms, 1600ms, 3200ms = máx ~6 segundos.
 * Retorna true si el perfil fue creado, false si agotó los intentos.
 */
async function esperarPerfil(userId: string, maxIntentos = 5): Promise<boolean> {
  for (let intento = 0; intento < maxIntentos; intento++) {
    // Espera exponencial antes de cada intento (0, 200, 400, 800, 1600 ms)
    if (intento > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, intento - 1) * 200));
    }

    const { data, error } = await supabase
      .from('perfiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      return true; // Perfil encontrado ✅
    }
  }
  return false; // Agotó los intentos ❌
}

export default function RegistroPropietario({ onVolverALogin, onRegistroExitoso }: RegistroPropietarioProps) {
  const [codigoInvitacion, setCodigoInvitacion] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registroExitoso, setRegistroExitoso] = useState(false);

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      // 1. Validar código de invitación
      const { data: codigoData, error: codigoError } = await supabase
        .from('codigos_invitacion')
        .select('*, locales(*)')
        .eq('codigo', codigoInvitacion.toUpperCase())
        .eq('usado', false)
        .maybeSingle();

      if (codigoError) {
        console.error('Error validando código:', codigoError);
        throw new Error('Error al validar código de invitación');
      }

      if (!codigoData) {
        throw new Error('Código de invitación inválido o ya usado');
      }

      if (!codigoData.local_id) {
        throw new Error('Código no asociado a ningún local');
      }

      // 2. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            nombre_completo: nombreCompleto.trim(),
            rol: 'propietario'
          }
        }
      });

      if (authError) {
        console.error('Error en signUp:', authError);
        throw new Error(authError.message || 'Error al crear cuenta');
      }

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // 3. Esperar a que el trigger de Supabase cree el perfil
      //    Usamos retry con backoff exponencial en lugar de setTimeout fijo
      //    para que sea robusto bajo carga y latencia variable.
      const perfilCreado = await esperarPerfil(authData.user.id);
      if (!perfilCreado) {
        // Limpiar el usuario creado para no dejar cuentas huérfanas
        await supabase.auth.signOut();
        throw new Error(
          'No se pudo crear tu perfil. Por favor intenta de nuevo o contacta soporte.'
        );
      }

      // 4. Actualizar perfil con local asignado
      const { error: updateError } = await supabase
        .from('perfiles')
        .update({ 
          local_asignado_id: codigoData.local_id,
          nombre_completo: nombreCompleto.trim()
        })
        .eq('id', authData.user.id);

      if (updateError) {
        console.error('Error actualizando perfil:', updateError);
        throw new Error('Error asignando local al propietario');
      }

      // 5. Marcar código como usado
      const { error: codigoUpdateError } = await supabase
        .from('codigos_invitacion')
        .update({ 
          usado: true,
          usado_por: authData.user.id,
          fecha_uso: new Date().toISOString()
        })
        .eq('codigo', codigoInvitacion.toUpperCase());

      if (codigoUpdateError) {
        // No lanzar error — el usuario ya está creado y asignado
        console.error('Advertencia: no se pudo marcar el código como usado:', codigoUpdateError);
      }

      // 6. Mostrar éxito y hacer login automático
      setRegistroExitoso(true);
      
      // Login directo (ya tenemos las credenciales, no necesitamos setTimeout)
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (!loginError) {
        // Pequeña pausa solo para que el usuario vea el mensaje de éxito
        setTimeout(() => onRegistroExitoso?.(), 1500);
      } else {
        // Login falló pero la cuenta existe — el usuario puede hacer login manual
        console.error('Login automático falló, redirigir a login manual:', loginError);
        setTimeout(() => onVolverALogin(), 2500);
      }

    } catch (error: any) {
      console.error('Error en registro:', error);
      setError(error.message || 'Error al crear cuenta');
    } finally {
      setCargando(false);
    }
  };

  if (registroExitoso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900/20 to-gray-900 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-green-900/30 border border-green-500/50 rounded-2xl p-8 animate-slide-up">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <Check size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">¡Registro Exitoso!</h2>
            <p className="text-gray-300 mb-6">
              Tu cuenta ha sido creada correctamente. Iniciando sesión...
            </p>
            <div className="flex items-center justify-center gap-2">
              <Loader size={20} className="animate-spin" />
              <span className="text-sm text-gray-400">Cargando panel...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={onVolverALogin}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          Volver al login
        </button>

        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <UserPlus size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold">Crear Cuenta</h2>
          </div>
          <p className="text-gray-400 text-sm mb-6">Únete a Nightly y gestiona tu local</p>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-xl flex items-start gap-3">
              <div className="text-red-400">⚠️</div>
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegistro} className="space-y-5">
            {/* Código de Invitación */}
            <div className="space-y-2">
              <label htmlFor="codigo" className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Key size={16} />
                Código de Invitación
              </label>
              <input
                id="codigo"
                type="text"
                value={codigoInvitacion}
                onChange={(e) => setCodigoInvitacion(e.target.value.toUpperCase())}
                placeholder="EJ: ABC123"
                required
                maxLength={6}
                className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-500 uppercase font-mono tracking-wider"
              />
              <p className="text-xs text-gray-500">Código proporcionado por Nightly</p>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <p className="text-sm text-gray-400 mb-4">Información de tu cuenta:</p>

              {/* Nombre Completo */}
              <div className="space-y-2 mb-4">
                <label htmlFor="nombre" className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <User size={16} />
                  Nombre Completo
                </label>
                <input
                  id="nombre"
                  type="text"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Email */}
              <div className="space-y-2 mb-4">
                <label htmlFor="email" className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Mail size={16} />
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Contraseña */}
              <div className="space-y-2">
                <label htmlFor="password" className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Lock size={16} />
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={mostrarPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                    className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-xl px-4 py-3.5 pr-12 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword(!mostrarPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                  >
                    {mostrarPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 mt-6"
            >
              {cargando ? (
                <>
                  <Loader size={22} className="animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus size={22} />
                  Crear Cuenta
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <button
                onClick={onVolverALogin}
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                Iniciar Sesión
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up { animation: slide-up 0.6s ease-out; }
      `}</style>
    </div>
  );
}
