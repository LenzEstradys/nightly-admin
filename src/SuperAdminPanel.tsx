import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  LayoutDashboard, Building2, Users, Plus, Search, Edit, 
  Trash2, Key, CheckCircle, XCircle, ArrowLeft, Save,
  TrendingUp, Activity, MapPin, Phone
} from 'lucide-react';

interface Estadisticas {
  locales_activos: number;
  total_locales: number;
  propietarios_activos: number;
  locales_verificados: number;
  codigos_disponibles: number;
}

interface LocalConPropietario {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  activo: boolean;
  verificado: boolean;
  codigo_invitacion: string;
  propietario_nombre: string | null;
  propietario_email: string | null;
  capacidad_actual: number;
  estado: string;
}

interface SuperAdminPanelProps {
  onVolver: () => void;
}

type Vista = 'dashboard' | 'crear-local' | 'lista-locales' | 'lista-propietarios';

export default function SuperAdminPanel({ onVolver }: SuperAdminPanelProps) {
  const [vista, setVista] = useState<Vista>('dashboard');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);
  
  // Estados para estadísticas
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    locales_activos: 0,
    total_locales: 0,
    propietarios_activos: 0,
    locales_verificados: 0,
    codigos_disponibles: 0
  });
  
  // Estados para locales
  const [locales, setLocales] = useState<LocalConPropietario[]>([]);
  const [busqueda, setBusqueda] = useState('');
  
  // Estados para crear local
  const [nuevoLocal, setNuevoLocal] = useState({
    nombre: '',
    tipo: 'bar',
    direccion: '',
    latitud: -16.5000,
    longitud: -68.1300
  });

  useEffect(() => {
    cargarEstadisticas();
    cargarLocales();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      const { data, error } = await supabase
        .from('v_estadisticas_admin')
        .select('*')
        .single();
      
      if (error) throw error;
      if (data) setEstadisticas(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const cargarLocales = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('v_locales_con_propietarios')
        .select('*');
      
      if (error) throw error;
      if (data) setLocales(data);
    } catch (error) {
      console.error('Error cargando locales:', error);
    } finally {
      setCargando(false);
    }
  };

  const crearLocal = async () => {
    setCargando(true);
    setMensaje(null);
    
    try {
      const { data, error } = await supabase.rpc('crear_local_admin', {
        p_nombre: nuevoLocal.nombre,
        p_tipo: nuevoLocal.tipo,
        p_direccion: nuevoLocal.direccion,
        p_latitud: nuevoLocal.latitud,
        p_longitud: nuevoLocal.longitud
      });

      if (error) throw error;

      if (data && data.success) {
        setMensaje({ 
          tipo: 'exito', 
          texto: `¡Local creado! Código: ${data.codigo_invitacion}` 
        });
        
        // Resetear formulario
        setNuevoLocal({
          nombre: '',
          tipo: 'bar',
          direccion: '',
          latitud: -16.5000,
          longitud: -68.1300
        });
        
        // Recargar datos
        await cargarEstadisticas();
        await cargarLocales();
        
        // Volver al dashboard después de 3 segundos
        setTimeout(() => setVista('dashboard'), 3000);
      }
    } catch (error: any) {
      console.error('Error creando local:', error);
      setMensaje({ tipo: 'error', texto: 'Error al crear local' });
    } finally {
      setCargando(false);
    }
  };

  const toggleEstadoLocal = async (localId: string, nuevoEstado: boolean) => {
    try {
      const { error } = await supabase
        .from('locales')
        .update({ activo: nuevoEstado })
        .eq('id', localId);
      
      if (error) throw error;
      
      setMensaje({ 
        tipo: 'exito', 
        texto: `Local ${nuevoEstado ? 'activado' : 'desactivado'} correctamente` 
      });
      
      await cargarLocales();
      await cargarEstadisticas();
    } catch (error) {
      console.error('Error cambiando estado:', error);
      setMensaje({ tipo: 'error', texto: 'Error al cambiar estado' });
    }
  };

  const localesFiltrados = locales.filter(local =>
    local.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    local.direccion?.toLowerCase().includes(busqueda.toLowerCase()) ||
    local.tipo.toLowerCase().includes(busqueda.toLowerCase())
  );

  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onVolver}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Volver
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                Super Admin Panel
              </h1>
              <p className="text-gray-400">Gestiona todos los locales y propietarios</p>
            </div>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 animate-slide-up ${
            mensaje.tipo === 'exito' 
              ? 'bg-green-900/30 border border-green-500/50' 
              : 'bg-red-900/30 border border-red-500/50'
          }`}>
            {mensaje.tipo === 'exito' ? <CheckCircle size={24} /> : <XCircle size={24} />}
            <p>{mensaje.texto}</p>
          </div>
        )}

        {/* Navegación */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'crear-local', label: 'Crear Local', icon: Plus },
            { id: 'lista-locales', label: 'Locales', icon: Building2 },
            { id: 'lista-propietarios', label: 'Propietarios', icon: Users }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setVista(tab.id as Vista)}
                className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                  vista === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                }`}
              >
                <Icon size={20} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Contenido */}
        {vista === 'dashboard' && (
          <div className="space-y-6">
            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Locales Activos', value: estadisticas.locales_activos, icon: Building2, color: 'green' },
                { label: 'Total Locales', value: estadisticas.total_locales, icon: Building2, color: 'blue' },
                { label: 'Propietarios', value: estadisticas.propietarios_activos, icon: Users, color: 'purple' },
                { label: 'Verificados', value: estadisticas.locales_verificados, icon: CheckCircle, color: 'green' },
                { label: 'Códigos Disponibles', value: estadisticas.codigos_disponibles, icon: Key, color: 'yellow' }
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
                    <div className="flex items-center justify-between mb-2">
                      <Icon size={24} className={`text-${stat.color}-400`} />
                      <TrendingUp size={16} className="text-gray-500" />
                    </div>
                    <p className="text-3xl font-bold mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-400">{stat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Activity className="text-purple-400" size={24} />
                Acciones Rápidas
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => setVista('crear-local')}
                  className="p-6 bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl hover:border-purple-500/50 transition-all text-left"
                >
                  <Plus size={32} className="text-purple-400 mb-3" />
                  <h3 className="font-bold text-lg mb-1">Crear Local</h3>
                  <p className="text-sm text-gray-400">Agrega un nuevo local a la plataforma</p>
                </button>

                <button
                  onClick={() => setVista('lista-locales')}
                  className="p-6 bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl hover:border-blue-500/50 transition-all text-left"
                >
                  <Building2 size={32} className="text-blue-400 mb-3" />
                  <h3 className="font-bold text-lg mb-1">Ver Locales</h3>
                  <p className="text-sm text-gray-400">Gestiona todos los locales</p>
                </button>

                <button
                  onClick={() => setVista('lista-propietarios')}
                  className="p-6 bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-xl hover:border-green-500/50 transition-all text-left"
                >
                  <Users size={32} className="text-green-400 mb-3" />
                  <h3 className="font-bold text-lg mb-1">Propietarios</h3>
                  <p className="text-sm text-gray-400">Gestiona propietarios</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {vista === 'crear-local' && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-purple-400" size={24} />
              Crear Nuevo Local
            </h2>

            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Nombre del Local
                </label>
                <input
                  type="text"
                  value={nuevoLocal.nombre}
                  onChange={(e) => setNuevoLocal({ ...nuevoLocal, nombre: e.target.value })}
                  placeholder="Ej: Diesel Club"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Tipo
                </label>
                <select
                  value={nuevoLocal.tipo}
                  onChange={(e) => setNuevoLocal({ ...nuevoLocal, tipo: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="bar">Bar</option>
                  <option value="club">Club</option>
                  <option value="discoteca">Discoteca</option>
                  <option value="pub">Pub</option>
                  <option value="restaurante">Restaurante</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-pink-400" />
                  Dirección
                </label>
                <input
                  type="text"
                  value={nuevoLocal.direccion}
                  onChange={(e) => setNuevoLocal({ ...nuevoLocal, direccion: e.target.value })}
                  placeholder="Ej: Av. 6 de Agosto #1234"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Latitud
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={nuevoLocal.latitud}
                    onChange={(e) => setNuevoLocal({ ...nuevoLocal, latitud: parseFloat(e.target.value) })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Longitud
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={nuevoLocal.longitud}
                    onChange={(e) => setNuevoLocal({ ...nuevoLocal, longitud: parseFloat(e.target.value) })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500">
                💡 Tip: Busca la ubicación en Google Maps, haz clic derecho y copia las coordenadas
              </p>

              <button
                onClick={crearLocal}
                disabled={cargando || !nuevoLocal.nombre || !nuevoLocal.direccion}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cargando ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Crear Local
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {vista === 'lista-locales' && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="text-purple-400" size={24} />
                Todos los Locales ({locales.length})
              </h2>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar local..."
                  className="pl-10 pr-4 py-2 bg-gray-700/50 border border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-3">
              {localesFiltrados.map((local) => (
                <div
                  key={local.id}
                  className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50 hover:border-gray-500/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold">{local.nombre}</h3>
                        <span className="px-3 py-1 bg-purple-600/30 text-purple-300 text-xs rounded-full">
                          {local.tipo}
                        </span>
                        {local.verificado && (
                          <CheckCircle size={18} className="text-green-400" aria-label="Verificado" />
                        )}
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-400 mb-2">
                        <p className="flex items-center gap-2">
                          <MapPin size={14} />
                          {local.direccion || 'Sin dirección'}
                        </p>
                        <p className="flex items-center gap-2">
                          <Key size={14} className="text-yellow-400" />
                          Código: <span className="font-mono text-yellow-300">{local.codigo_invitacion}</span>
                        </p>
                      </div>
                      
                      {local.propietario_nombre && (
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <Users size={14} />
                          Propietario: <span className="text-white">{local.propietario_nombre}</span> 
                          ({local.propietario_email})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleEstadoLocal(local.id, !local.activo)}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                          local.activo
                            ? 'bg-green-600/30 text-green-300 hover:bg-green-600/40'
                            : 'bg-gray-600/30 text-gray-400 hover:bg-gray-600/40'
                        }`}
                      >
                        {local.activo ? 'Activo' : 'Inactivo'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {localesFiltrados.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No se encontraron locales
                </div>
              )}
            </div>
          </div>
        )}

        {vista === 'lista-propietarios' && (
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Users className="text-purple-400" size={24} />
              Propietarios Activos
            </h2>
            
            <div className="space-y-3">
              {locales
                .filter(local => local.propietario_nombre)
                .map((local) => (
                  <div
                    key={local.id}
                    className="bg-gray-700/30 rounded-xl p-4 border border-gray-600/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-lg mb-1">{local.propietario_nombre}</h3>
                        <p className="text-sm text-gray-400 mb-2">{local.propietario_email}</p>
                        <p className="text-sm">
                          Local asignado: <span className="text-purple-400 font-semibold">{local.nombre}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}