import { useState, useEffect } from 'react';
import { BarChart3, Music, Zap, Clock, Users, TrendingUp, RefreshCw, Save, LogOut, Settings, Shield } from 'lucide-react';
import { supabase } from './supabase';
import Login from './Login';
import RegistroPropietario from './RegistroPropietario';
import CodigoInvitacion from './CodigoInvitacion';
import ConfiguracionLocal from './ConfiguracionLocal';
import SuperAdminPanel from './SuperAdminPanel';

interface Local {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  latitud: number;
  longitud: number;
  estado: 'vacio' | 'medio' | 'caliente' | 'fuego';
  capacidad_actual: number;
  musica_actual?: string;
  promocion?: string;
  tiempo_espera: number;
  tiene_musica_en_vivo: boolean;
  es_zona_segura: boolean;
  verificado: boolean;
  codigo_invitacion?: string;
}

interface Perfil {
  id: string;
  rol: 'admin' | 'propietario';
  local_asignado_id?: string;
  nombre_completo?: string;
}

function App() {
  const [vista, setVista] = useState<'login' | 'registro' | 'panel'>('login');
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);
  const [mostrarSuperAdmin, setMostrarSuperAdmin] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [verificandoSesion, setVerificandoSesion] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  
  const [locales, setLocales] = useState<Local[]>([]);
  const [localSeleccionado, setLocalSeleccionado] = useState<Local | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);

  const [capacidad, setCapacidad] = useState(0);
  const [musicaActual, setMusicaActual] = useState('');
  const [promocion, setPromocion] = useState('');
  const [tiempoEspera, setTiempoEspera] = useState(0);
  const [tieneMusicaEnVivo, setTieneMusicaEnVivo] = useState(false);

  useEffect(() => {
    verificarSesion();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        obtenerPerfil(session.user.id);
      } else {
        setAutenticado(false);
        setPerfil(null);
        setVista('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const verificarSesion = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        await obtenerPerfil(session.user.id);
        setAutenticado(true);
        setVista('panel');
      }
    } catch (error) {
      console.error('Error verificando sesión:', error);
    } finally {
      setVerificandoSesion(false);
    }
  };

  const obtenerPerfil = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('perfiles')
        .select('id, rol, local_asignado_id, nombre_completo')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setPerfil(data);
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
    }
  };

  useEffect(() => {
    if (autenticado && perfil && vista === 'panel') {
      obtenerLocales();
    }
  }, [autenticado, perfil, vista]);

  useEffect(() => {
    if (localSeleccionado) {
      setCapacidad(localSeleccionado.capacidad_actual);
      setMusicaActual(localSeleccionado.musica_actual || '');
      setPromocion(localSeleccionado.promocion || '');
      setTiempoEspera(localSeleccionado.tiempo_espera);
      setTieneMusicaEnVivo(localSeleccionado.tiene_musica_en_vivo);
    }
  }, [localSeleccionado]);

  const obtenerLocales = async () => {
    setCargando(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/locales`);
      const resultado = await response.json();
      
      if (resultado.success) {
        let localesFiltrados = resultado.data;

        if (perfil?.rol === 'propietario' && perfil.local_asignado_id) {
          localesFiltrados = resultado.data.filter(
            (l: Local) => l.id === perfil.local_asignado_id
          );
        }

        setLocales(localesFiltrados);
        if (localesFiltrados.length > 0 && !localSeleccionado) {
          setLocalSeleccionado(localesFiltrados[0]);
        }
      }
    } catch (error) {
      console.error('Error obteniendo locales:', error);
      mostrarMensaje('error', 'Error al cargar locales');
    } finally {
      setCargando(false);
    }
  };

  const calcularEstado = (cap: number): 'vacio' | 'medio' | 'caliente' | 'fuego' => {
    if (cap >= 80) return 'fuego';
    if (cap >= 50) return 'caliente';
    if (cap >= 20) return 'medio';
    return 'vacio';
  };

  const actualizarLocal = async () => {
    if (!localSeleccionado) return;

    if (perfil?.rol === 'propietario' && localSeleccionado.id !== perfil.local_asignado_id) {
      mostrarMensaje('error', 'No tienes permisos para editar este local');
      return;
    }

    setGuardando(true);
    try {
      const nuevoEstado = calcularEstado(capacidad);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/locales/${localSeleccionado.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          capacidad_actual: capacidad,
          estado: nuevoEstado,
          musica_actual: musicaActual || null,
          promocion: promocion || null,
          tiempo_espera: tiempoEspera,
          tiene_musica_en_vivo: tieneMusicaEnVivo,
        }),
      });

      const resultado = await response.json();

      if (resultado.success) {
        mostrarMensaje('exito', '¡Local actualizado correctamente!');
        await obtenerLocales();
      } else {
        mostrarMensaje('error', resultado.error || 'Error al actualizar');
      }
    } catch (error) {
      console.error('Error actualizando local:', error);
      mostrarMensaje('error', 'Error al actualizar el local');
    } finally {
      setGuardando(false);
    }
  };

  const cerrarSesion = async () => {
    try {
      await supabase.auth.signOut();
      setAutenticado(false);
      setPerfil(null);
      setLocales([]);
      setLocalSeleccionado(null);
      setVista('login');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  };

  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  const obtenerColorEstado = (estado: string) => {
    switch(estado) {
      case 'fuego': return 'bg-gradient-to-r from-red-500 to-orange-500';
      case 'caliente': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'medio': return 'bg-gradient-to-r from-violet-500 to-purple-400';
      case 'vacio': return 'bg-gradient-to-r from-gray-600 to-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const obtenerTextoEstado = (estado: string) => {
    switch(estado) {
      case 'fuego': return '🔥 A REVENTAR';
      case 'caliente': return '🎉 AMBIENTE BUENO';
      case 'medio': return '🍹 TRANQUILO';
      case 'vacio': return '😴 VACÍO';
      default: return 'DESCONOCIDO';
    }
  };

  if (verificandoSesion) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌃</div>
          <p className="text-lg font-bold">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  if (vista === 'registro') {
    return <RegistroPropietario />;
  }

  if (!autenticado || vista === 'login') {
    return <Login onLoginSuccess={() => { setAutenticado(true); setVista('panel'); }} onIrARegistro={() => setVista('registro')} />;
  }

  // Mostrar Super Admin Panel
  if (mostrarSuperAdmin && perfil?.rol === 'admin') {
    return (
      <SuperAdminPanel
        onVolver={() => {
          setMostrarSuperAdmin(false);
          obtenerLocales();
        }}
      />
    );
  }

  // Mostrar configuración del local
  if (mostrarConfiguracion && localSeleccionado) {
    return (
      <ConfiguracionLocal
        localId={localSeleccionado.id}
        onGuardar={() => {
          setMostrarConfiguracion(false);
          obtenerLocales();
        }}
        onCancelar={() => setMostrarConfiguracion(false)}
      />
    );
  }

  if (cargando && locales.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌃</div>
          <p className="text-lg font-bold">Cargando panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-black/80 backdrop-blur-md border-b border-purple-500/30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🌃</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                Nightly Admin
              </h1>
              <p className="text-xs text-gray-400">
                {perfil?.nombre_completo || 'Panel de Control'} • 
                <span className="ml-1 text-purple-400">{perfil?.rol === 'admin' ? 'Administrador' : 'Propietario'}</span>
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={obtenerLocales}
              disabled={cargando}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
              <span className="text-sm font-medium">Actualizar</span>
            </button>
            
            {/* Botón Super Admin - Solo para admins */}
            {perfil?.rol === 'admin' && (
              <button
                onClick={() => setMostrarSuperAdmin(true)}
                className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 rounded-lg flex items-center gap-2 transition-all"
              >
                <Shield size={18} />
                <span className="text-sm font-medium">Super Admin</span>
              </button>
            )}
            
            <button
              onClick={() => setMostrarConfiguracion(true)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-all"
            >
              <Settings size={18} />
              <span className="text-sm font-medium">Configurar Local</span>
            </button>
            
            <button
              onClick={cerrarSesion}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg flex items-center gap-2 transition-all"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Salir</span>
            </button>
          </div>
        </div>
      </div>

      {mensaje && (
        <div className={`fixed top-20 right-4 z-50 p-4 rounded-lg shadow-lg ${
          mensaje.tipo === 'exito' ? 'bg-green-600' : 'bg-red-600'
        } text-white`}>
          <p className="font-medium">{mensaje.texto}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <BarChart3 size={20} className="text-purple-400" />
                {perfil?.rol === 'admin' ? 'Todos los Locales' : 'Mi Local'}
              </h2>

              <div className="space-y-3">
                {locales.map((local) => (
                  <button
                    key={local.id}
                    onClick={() => setLocalSeleccionado(local)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      localSeleccionado?.id === local.id
                        ? 'bg-purple-600 border-2 border-purple-400'
                        : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <h3 className="font-bold mb-1">{local.nombre}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-gray-300">{local.tipo}</span>
                      {local.verificado && (
                        <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">✓ Verificado</span>
                      )}
                    </div>
                    <div className={`inline-block px-2 py-1 rounded text-xs font-bold ${obtenerColorEstado(local.estado)}`}>
                      {obtenerTextoEstado(local.estado)}
                    </div>
                    <div className="mt-2 text-sm text-gray-300">
                      Capacidad: {local.capacidad_actual}%
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {localSeleccionado ? (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold">{localSeleccionado.nombre}</h2>
                    <div className={`px-4 py-2 rounded-full font-bold ${obtenerColorEstado(calcularEstado(capacidad))}`}>
                      {obtenerTextoEstado(calcularEstado(capacidad))}
                    </div>
                  </div>
                  <p className="text-gray-400 mb-2">{localSeleccionado.direccion}</p>
                  <p className="text-sm text-gray-500">
                    Tipo: {localSeleccionado.tipo} • 
                    Coords: {localSeleccionado.latitud.toFixed(4)}, {localSeleccionado.longitud.toFixed(4)}
                  </p>
                </div>

                {perfil?.rol === 'admin' && (
                  <CodigoInvitacion 
                    codigo={localSeleccionado.codigo_invitacion || null}
                    localNombre={localSeleccionado.nombre}
                  />
                )}

                <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-purple-400" />
                    Actualizar Estado del Local
                  </h3>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Users size={16} />
                        Capacidad Actual: {capacidad}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={capacidad}
                        onChange={(e) => setCapacidad(parseInt(e.target.value))}
                        className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Vacío</span>
                        <span>Medio</span>
                        <span>Lleno</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Music size={16} />
                        Música Sonando Ahora
                      </label>
                      <input
                        type="text"
                        value={musicaActual}
                        onChange={(e) => setMusicaActual(e.target.value)}
                        placeholder="Ej: Reggaetón, Rock, Techno..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="musicaEnVivo"
                        checked={tieneMusicaEnVivo}
                        onChange={(e) => setTieneMusicaEnVivo(e.target.checked)}
                        className="w-5 h-5 accent-purple-600 cursor-pointer"
                      />
                      <label htmlFor="musicaEnVivo" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                        <Music size={16} className="text-yellow-400" />
                        Música en Vivo Ahora
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Zap size={16} className="text-yellow-400" />
                        Promoción Activa
                      </label>
                      <input
                        type="text"
                        value={promocion}
                        onChange={(e) => setPromocion(e.target.value)}
                        placeholder="Ej: 2x1 en Cervezas, Shot gratis..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                        <Clock size={16} />
                        Tiempo de Espera en Fila: {tiempoEspera} min
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="60"
                        step="5"
                        value={tiempoEspera}
                        onChange={(e) => setTiempoEspera(parseInt(e.target.value))}
                        className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Sin fila</span>
                        <span>30 min</span>
                        <span>1 hora</span>
                      </div>
                    </div>

                    <button
                      onClick={actualizarLocal}
                      disabled={guardando}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {guardando ? (
                        <>
                          <RefreshCw size={20} className="animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        <>
                          <Save size={20} />
                          Guardar Cambios
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-12 text-center">
                <p className="text-gray-400">Selecciona un local para comenzar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
