import { useState } from 'react';
import { supabase } from './supabase';
import { UserPlus, Key, Mail, Lock, AlertCircle, CheckCircle, ArrowLeft, Eye, EyeOff, Sparkles, Shield, Zap } from 'lucide-react';

export default function RegistroPropietario() {
  const [paso, setPaso] = useState<'formulario' | 'exito'>('formulario');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [codigoInvitacion, setCodigoInvitacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localAsignado, setLocalAsignado] = useState<string>('');

  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre_completo: nombreCompleto,
            rol: 'propietario'
          }
        }
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('No se pudo crear el usuario');
      }

      // 2. Asignar local con código de invitación
      const { data: resultado, error: asignacionError } = await supabase
        .rpc('registrar_propietario_con_codigo', {
          email_propietario: email,
          codigo: codigoInvitacion.toUpperCase()
        });

      if (asignacionError) throw asignacionError;

      if (!resultado.success) {
        throw new Error(resultado.error || 'Error al asignar local');
      }

      // 3. Confirmar email automáticamente (solo para desarrollo)
      try {
        await supabase.rpc('confirm_user_email', { user_email: email });
      } catch (emailError) {
        console.log('No se pudo confirmar email automáticamente:', emailError);
      }

      // 4. Obtener nombre del local asignado
      const { data: localData } = await supabase
        .from('locales')
        .select('nombre')
        .eq('codigo_invitacion', codigoInvitacion.toUpperCase())
        .single();

      if (localData) {
        setLocalAsignado(localData.nombre);
      }

      setPaso('exito');
    } catch (error: any) {
      console.error('Error en registro:', error);
      setError(error.message || 'Error al registrar. Verifica tus datos.');
    } finally {
      setCargando(false);
    }
  };

  const irALogin = () => {
    window.location.href = '/';
  };

  if (paso === 'exito') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="max-w-lg w-full relative z-10">
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-block relative mb-6">
              <div className="p-6 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-2xl shadow-green-500/50 animate-bounce-slow">
                <CheckCircle size={64} className="text-white" />
              </div>
              <div className="absolute -top-2 -right-2 animate-pulse">
                <Sparkles className="text-yellow-400" size={32} />
              </div>
            </div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              ¡Registro Exitoso!
            </h1>
            <p className="text-gray-400 text-lg">Tu cuenta ha sido creada correctamente</p>
          </div>

          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-8 space-y-6 animate-slide-up">
            <div className="text-center p-6 bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-xl border border-purple-500/30">
              <p className="text-lg text-gray-300 mb-3">Has sido asignado como propietario de:</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                {localAsignado}
              </p>
            </div>

            <div className="border-t border-gray-700/50 pt-6">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
                <Zap className="text-yellow-400" size={24} />
                Próximos pasos:
              </h3>
              <div className="space-y-3">
                {[
                  { icon: '🔑', text: 'Inicia sesión con tu email y contraseña' },
                  { icon: '📝', text: 'Actualiza la información de tu local' },
                  { icon: '⚡', text: 'Mantén el estado actualizado en tiempo real' },
                  { icon: '🎉', text: 'Gestiona promociones y música' }
                ].map((paso, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                  >
                    <span className="text-2xl">{paso.icon}</span>
                    <p className="text-gray-300 pt-1">{paso.text}</p>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={irALogin}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
            >
              <ArrowLeft size={22} />
              Ir a Iniciar Sesión
            </button>
          </div>
        </div>

        <style>{`
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slide-up {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-10px) scale(1.05); }
          }
          .animate-fade-in { animation: fade-in 0.6s ease-out; }
          .animate-slide-up { animation: slide-up 0.6s ease-out 0.2s backwards; }
          .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-lg w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-block relative mb-6">
            <div className="text-7xl mb-2 animate-bounce-slow">🌃</div>
            <div className="absolute -top-2 -right-2">
              <Shield className="text-green-400 animate-pulse" size={24} />
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-3 animate-gradient">
            Registro de Propietarios
          </h1>
          <p className="text-gray-400 text-lg">Únete a Nightly y gestiona tu local</p>
        </div>

        {/* Registration Form */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl p-8 animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
              <UserPlus size={24} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold">Crear Cuenta</h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-900/30 backdrop-blur-sm border border-red-500/50 rounded-xl flex items-start gap-3 animate-shake">
              <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          <form onSubmit={handleRegistro} className="space-y-5">
            {/* Código de Invitación */}
            <div className="space-y-2">
              <label htmlFor="codigo" className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Key size={18} className="text-yellow-400" />
                Código de Invitación
              </label>
              <input
                id="codigo"
                type="text"
                value={codigoInvitacion}
                onChange={(e) => setCodigoInvitacion(e.target.value.toUpperCase())}
                placeholder="Ej: ABC123"
                required
                maxLength={10}
                className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-xl px-4 py-3.5 font-mono text-xl tracking-widest uppercase text-center focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all placeholder:text-gray-500"
              />
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <Shield size={12} />
                Código proporcionado por el administrador de Nightly
              </p>
            </div>

            <div className="border-t border-gray-700/50 pt-5">
              <p className="text-sm text-gray-400 mb-4 font-semibold">Información de tu cuenta:</p>

              <div className="space-y-4">
                {/* Nombre Completo */}
                <div className="space-y-2">
                  <label htmlFor="nombreCompleto" className="block text-sm font-semibold text-gray-300">
                    Nombre Completo
                  </label>
                  <input
                    id="nombreCompleto"
                    type="text"
                    value={nombreCompleto}
                    onChange={(e) => setNombreCompleto(e.target.value)}
                    placeholder="Tu nombre"
                    required
                    className="w-full bg-gray-700/50 backdrop-blur-sm border border-gray-600 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all placeholder:text-gray-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
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

                {/* Password */}
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
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
            >
              {cargando ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registrando...
                </>
              ) : (
                <>
                  <UserPlus size={22} />
                  Crear Cuenta
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t border-gray-700/50 text-center text-sm text-gray-400">
            <p>
              ¿Ya tienes cuenta?{' '}
              <button 
                onClick={irALogin} 
                className="text-purple-400 hover:text-purple-300 font-semibold transition-colors"
              >
                Iniciar Sesión
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2024 Nightly. Todos los derechos reservados.</p>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        .animate-slide-up { animation: slide-up 0.6s ease-out 0.2s backwards; }
        .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        .animate-gradient { 
          background-size: 200% auto;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
