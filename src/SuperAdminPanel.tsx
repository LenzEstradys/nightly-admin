/**
 * admin/src/SuperAdminPanel.tsx
 * Panel de administración con controles de gestión completos
 * v3 - Con botones de Activar/Desactivar/Verificar/Eliminar
 */

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useAuth } from './hooks/useAuth';
import { usePermisos, separarLocalesPorCreador } from './hooks/usePermisos';
import { 
  LayoutDashboard, Building2, Users, Search, Edit, 
  Trash2, Key, CheckCircle, XCircle, ArrowLeft,
  TrendingUp, Activity, MapPin, Eye, EyeOff, User,
  Shield, Power, PowerOff, AlertTriangle, Loader, Crown
} from 'lucide-react';
import EditarLocal from './components/EditarLocal';
import CrearLocalRapido from './components/CrearLocalRapido';
import AsignarPlan from './components/AsignarPlan';
import { backendService } from './services/backendService';
import { type TipoPlan } from './types/planes';

interface Estadisticas {
  total_locales: number;
  mis_locales: number;
  locales_activos: number;
  locales_verificados: number;
  propietarios_activos: number;
}

interface LocalConPropietario {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  activo: boolean;
  verificado: boolean;
  codigo_invitacion: string | null;
  codigo_usado: boolean;
  propietario_id: string | null;
  propietario_nombre: string | null;
  propietario_email: string | null;
  propietario_plan: string | null;
  propietario_plan_vence_en: string | null;
  capacidad_actual: number;
  estado: string;
  creado_por_id: string | null;
  creado_por_nombre: string | null;
  creado_por_email: string | null;
  fecha_creacion: string;
}

interface SuperAdminPanelProps {
  onVolver: () => void;
}

type Vista = 'dashboard' | 'mis-locales' | 'todos-locales' | 'propietarios';

export default function SuperAdminPanel({ onVolver }: SuperAdminPanelProps) {
  const { role, user } = useAuth(); // Agregar user
  const permisos = usePermisos(role);
  
  const [vista, setVista] = useState<Vista>('dashboard');
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);
  const [mostrarCrearRapido, setMostrarCrearRapido] = useState(false);
  const [propietarioParaPlan, setPropietarioParaPlan] = useState<{
    id: string; nombre_completo: string; email: string; plan: TipoPlan; plan_vence_en: string | null;
  } | null>(null);
  const [mostrarOtrosLocales, setMostrarOtrosLocales] = useState(false);
  const [localEditando, setLocalEditando] = useState<LocalConPropietario | null>(null);
  
  // Estados para gestión de locales
  const [localGestionando, setLocalGestionando] = useState<LocalConPropietario | null>(null);
  const [accionGestion, setAccionGestion] = useState<'activar' | 'desactivar' | 'verificar' | 'desverificar' | 'eliminar' | null>(null);
  const [procesandoGestion, setProcesandoGestion] = useState(false);
  
  const [estadisticas, setEstadisticas] = useState<Estadisticas>({
    total_locales: 0,
    mis_locales: 0,
    locales_activos: 0,
    locales_verificados: 0,
    propietarios_activos: 0
  });
  
  const [todosLosLocales, setTodosLosLocales] = useState<LocalConPropietario[]>([]);
  const [misLocales, setMisLocales] = useState<LocalConPropietario[]>([]);
  const [otrosLocales, setOtrosLocales] = useState<LocalConPropietario[]>([]);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarDatos();
  }, []);

  useEffect(() => {
    if (todosLosLocales.length > 0 && permisos.userId) {
      const { misLocales: mis, otrosLocales: otros } = separarLocalesPorCreador(
        todosLosLocales,
        permisos.userId
      );
      setMisLocales(mis);
      setOtrosLocales(otros);
      
      setEstadisticas({
        total_locales: todosLosLocales.length,
        mis_locales: mis.length,
        locales_activos: todosLosLocales.filter(l => l.activo).length,
        locales_verificados: todosLosLocales.filter(l => l.verificado).length,
        propietarios_activos: new Set(
          todosLosLocales
            .filter(l => l.propietario_nombre)
            .map(l => l.propietario_email)
        ).size
      });
    }
  }, [todosLosLocales, permisos.userId]);

  const cargarDatos = async (intentos = 3): Promise<void> => {
    try {
      setCargando(true);

      const { data, error } = await supabase
        .from('v_locales_con_propietarios')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setTodosLosLocales(data || []);
    } catch (error) {
      if (intentos > 1) {
        // Esperar 800ms antes de reintentar
        await new Promise(res => setTimeout(res, 800));
        return cargarDatos(intentos - 1);
      }
      console.error('Error cargando datos tras 3 intentos:', error);
      mostrarMensaje('error', 'Error al cargar datos. Revisa tu conexión.');
    } finally {
      setCargando(false);
    }
  };

  const handleGestionarLocal = async () => {
    if (!localGestionando || !accionGestion) return;

    setProcesandoGestion(true);
    try {
      if (accionGestion === 'eliminar') {
        await backendService.eliminarLocal(localGestionando.id);
        mostrarMensaje('exito', `🗑️ "${localGestionando.nombre}" eliminado`);
      } else {
        // activar/desactivar/verificar/desverificar → PATCH por backend (bypasea RLS)
        const campos: Record<string, boolean> = {
          activar:      { activo: true },
          desactivar:   { activo: false },
          verificar:    { verificado: true },
          desverificar: { verificado: false },
        }[accionGestion] as unknown as Record<string, boolean>;

        await backendService.actualizarLocal(localGestionando.id, campos);

        // Optimistic update en estado local
        setTodosLosLocales(prev =>
          prev.map(l => l.id === localGestionando.id ? { ...l, ...campos } : l)
        );

        const mensajes: Record<string, string> = {
          activar:      `✅ "${localGestionando.nombre}" activado`,
          desactivar:   `⏸️ "${localGestionando.nombre}" desactivado`,
          verificar:    `✅ "${localGestionando.nombre}" verificado`,
          desverificar: `❌ Verificación removida de "${localGestionando.nombre}"`,
        };
        mostrarMensaje('exito', mensajes[accionGestion]);
      }

      await cargarDatos();
      setLocalGestionando(null);
      setAccionGestion(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      mostrarMensaje('error', `❌ ${msg}`);
    } finally {
      setProcesandoGestion(false);
    }
  };

  const handleLocalCreado = () => {
    cargarDatos();
    setMostrarCrearRapido(false);
    mostrarMensaje('exito', '✅ Local creado correctamente');
  };

  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 3000);
  };

  const localesFiltrados = (locales: LocalConPropietario[]) => {
    if (!busqueda) return locales;
    return locales.filter(local =>
      local.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      local.tipo.toLowerCase().includes(busqueda.toLowerCase()) ||
      local.propietario_nombre?.toLowerCase().includes(busqueda.toLowerCase())
    );
  };

  const esAdminPrincipal = permisos.esAdmin;

  // Renderizar Dashboard
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              {permisos.esAdmin ? '👑 Super Admin' : '⚡ Pasante'}
            </h2>
            <p className="text-gray-400">
              {user?.email || 'Usuario'}
            </p>
          </div>
          {permisos.esPasante && (
            <div className="text-right">
              <p className="text-sm text-gray-400">Mis locales creados</p>
              <p className="text-4xl font-bold text-purple-400">{estadisticas.mis_locales}</p>
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Building2 size={20} className="text-blue-400" />
            <Activity size={16} className="text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-white">{estadisticas.total_locales}</p>
          <p className="text-xs text-gray-400">Total Locales</p>
        </div>

        {permisos.esPasante && (
          <div className="bg-gray-800/50 rounded-xl p-4 border border-purple-500/30">
            <div className="flex items-center justify-between mb-2">
              <User size={20} className="text-purple-400" />
              <TrendingUp size={16} className="text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-400">{estadisticas.mis_locales}</p>
            <p className="text-xs text-gray-400">Mis Locales</p>
          </div>
        )}

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <CheckCircle size={20} className="text-green-400 mb-2" />
          <p className="text-2xl font-bold text-white">{estadisticas.locales_activos}</p>
          <p className="text-xs text-gray-400">Activos</p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <Shield size={20} className="text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-white">{estadisticas.locales_verificados}</p>
          <p className="text-xs text-gray-400">Verificados</p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <Users size={20} className="text-yellow-400 mb-2" />
          <p className="text-2xl font-bold text-white">{estadisticas.propietarios_activos}</p>
          <p className="text-xs text-gray-400">Propietarios</p>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-bold text-white mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => setVista('mis-locales')}
            className="flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-lg transition-colors"
          >
            <Building2 size={20} />
            <div className="text-left">
              <p className="font-semibold">Mis Locales</p>
              <p className="text-xs opacity-80">Gestionar locales que creé</p>
            </div>
          </button>

          <button
            onClick={() => setVista('todos-locales')}
            className="flex items-center gap-3 bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-lg transition-colors"
          >
            <MapPin size={20} />
            <div className="text-left">
              <p className="font-semibold">Todos los Locales</p>
              <p className="text-xs opacity-80">Ver mapa completo</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar Lista de Locales
  const renderListaLocales = (locales: LocalConPropietario[], titulo: string, icono: React.ReactNode, puedeEditar: boolean = true) => {
    const filtrados = localesFiltrados(locales);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icono}
            <h2 className="text-xl font-bold text-white">
              {titulo} ({filtrados.length})
            </h2>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar local..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Lista */}
        <div className="space-y-3">
          {filtrados.length === 0 ? (
            <div className="bg-gray-800/30 rounded-lg p-8 text-center">
              <p className="text-gray-400">
                {busqueda ? 'No se encontraron locales' : 'No hay locales aún'}
              </p>
            </div>
          ) : (
            filtrados.map(local => (
              <div
                key={local.id}
                className={`rounded-lg p-4 border transition-all ${
                  !local.activo 
                    ? 'bg-gray-900/30 border-gray-800 opacity-60' 
                    : puedeEditar && permisos.puedeEditarLocal(local)
                    ? 'bg-gray-800/50 border-purple-500/30 hover:border-purple-500/50'
                    : 'bg-gray-800/50 border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className={`text-lg font-bold ${local.activo ? 'text-white' : 'text-gray-500'}`}>
                        {local.nombre}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        local.activo 
                          ? 'bg-green-900/50 text-green-300' 
                          : 'bg-red-900/50 text-red-300'
                      }`}>
                        {local.activo ? '🟢 Activo' : '🔴 Inactivo'}
                      </span>
                      {local.verificado && (
                        <Shield size={14} className="text-blue-400" title="Verificado" />
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {local.tipo}
                      </span>

                      {local.creado_por_nombre && (
                        <span className="text-gray-500">
                          📝 Creado por: {local.creado_por_nombre}
                        </span>
                      )}

                      {local.codigo_invitacion && (
                        <span className="flex items-center gap-1 text-purple-400">
                          <Key size={12} />
                          {local.codigo_invitacion}
                          {local.codigo_usado && <span className="text-green-400">(usado)</span>}
                        </span>
                      )}

                      {local.propietario_nombre && (
                        <span className="text-green-400">
                          👤 {local.propietario_nombre}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="flex items-center gap-2">
                    {/* Botón Editar */}
                    {puedeEditar && permisos.puedeEditarLocal(local) && (
                      <button 
                        onClick={() => setLocalEditando(local)}
                        className="p-2 text-purple-400 hover:bg-purple-900/30 rounded-lg transition-colors"
                        title="Editar local"
                      >
                        <Edit size={16} />
                      </button>
                    )}

                    {/* Controles de Gestión - SOLO ADMIN PRINCIPAL */}
                    {esAdminPrincipal && (
                      <>
                        {/* Toggle Activo/Inactivo */}
                        <button
                          onClick={() => {
                            setLocalGestionando(local);
                            setAccionGestion(local.activo ? 'desactivar' : 'activar');
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            local.activo
                              ? 'text-green-400 hover:bg-green-900/30'
                              : 'text-gray-500 hover:bg-gray-700'
                          }`}
                          title={local.activo ? 'Desactivar local' : 'Activar local'}
                        >
                          {local.activo ? <Power size={16} /> : <PowerOff size={16} />}
                        </button>

                        {/* Toggle Verificado */}
                        <button
                          onClick={() => {
                            setLocalGestionando(local);
                            setAccionGestion(local.verificado ? 'desverificar' : 'verificar');
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            local.verificado
                              ? 'text-blue-400 hover:bg-blue-900/30'
                              : 'text-gray-500 hover:bg-gray-700'
                          }`}
                          title={local.verificado ? 'Quitar verificación' : 'Verificar local'}
                        >
                          <Shield size={16} />
                        </button>

                        {/* Eliminar */}
                        <button
                          onClick={() => {
                            setLocalGestionando(local);
                            setAccionGestion('eliminar');
                          }}
                          className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Eliminar local"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}

                    {/* Solo lectura para pasantes */}
                    {!puedeEditar && !permisos.puedeEditarLocal(local) && (
                      <div className="p-2 text-gray-600" title="Solo lectura">
                        <Eye size={16} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // Render principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onVolver}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Super Admin Panel
              </h1>
              <p className="text-gray-400">Gestiona todos los locales y propietarios</p>
            </div>
          </div>

          <button
            onClick={() => setMostrarCrearRapido(true)}
            className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-500/30"
          >
            <Building2 size={20} />
            ⚡ Crear Local
          </button>
        </div>

        {/* Mensajes */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-lg ${
            mensaje.tipo === 'exito' 
              ? 'bg-green-900/30 border border-green-500/50 text-green-200' 
              : 'bg-red-900/30 border border-red-500/50 text-red-200'
          }`}>
            {mensaje.texto}
          </div>
        )}

        {/* Navegación */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          <button
            onClick={() => setVista('dashboard')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              vista === 'dashboard'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>

          <button
            onClick={() => setVista('mis-locales')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              vista === 'mis-locales'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <Building2 size={18} />
            Mis Locales
            {permisos.esPasante && estadisticas.mis_locales > 0 && (
              <span className="bg-purple-500 text-white text-xs px-2 py-0.5 rounded-full">
                {estadisticas.mis_locales}
              </span>
            )}
          </button>

          <button
            onClick={() => setVista('todos-locales')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
              vista === 'todos-locales'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            <MapPin size={18} />
            Todos los Locales
          </button>

          {esAdminPrincipal && (
            <button
              onClick={() => setVista('propietarios')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                vista === 'propietarios'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Users size={18} />
              Propietarios
            </button>
          )}
        </div>

        {/* Contenido */}
        {cargando ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="animate-spin text-purple-400" size={48} />
          </div>
        ) : (
          <>
            {vista === 'dashboard' && renderDashboard()}

            {vista === 'mis-locales' && renderListaLocales(
              misLocales,
              '📝 Mis Locales (Puedo Editar)',
              <Building2 size={24} className="text-purple-400" />,
              true
            )}

            {vista === 'todos-locales' && (
              <div className="space-y-6">
                {esAdminPrincipal ? (
                  renderListaLocales(
                    todosLosLocales,
                    'Todos los Locales',
                    <MapPin size={24} className="text-purple-400" />,
                    true
                  )
                ) : (
                  <>
                    {renderListaLocales(
                      misLocales,
                      '✏️ Mis Locales (Puedo Editar)',
                      <Edit size={24} className="text-purple-400" />,
                      true
                    )}

                    {otrosLocales.length > 0 && (
                      <div className="border-t border-gray-700 pt-6">
                        <button
                          onClick={() => setMostrarOtrosLocales(!mostrarOtrosLocales)}
                          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
                        >
                          {mostrarOtrosLocales ? <EyeOff size={20} /> : <Eye size={20} />}
                          <span className="font-medium">
                            {mostrarOtrosLocales ? 'Ocultar' : 'Mostrar'} Locales de Otros Pasantes ({otrosLocales.length})
                          </span>
                        </button>

                        {mostrarOtrosLocales && renderListaLocales(
                          otrosLocales,
                          '👁️ Locales de Otros (Solo Lectura)',
                          <Eye size={24} className="text-gray-400" />,
                          false
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {vista === 'propietarios' && !esAdminPrincipal && (
              <div className="bg-gray-800/30 rounded-lg p-12 text-center">
                <Shield size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No tienes permisos para ver esta sección</p>
              </div>
            )}
            {vista === 'propietarios' && esAdminPrincipal && (() => {
              // Extraer propietarios únicos de todosLosLocales
              const propietariosMap = new Map<string, {
                id: string; nombre: string; email: string;
                plan: TipoPlan; planVenceEn: string | null; locales: string[];
              }>();
              todosLosLocales.forEach(l => {
                if (l.propietario_id && l.propietario_email) {
                  const existing = propietariosMap.get(l.propietario_id);
                  if (existing) {
                    existing.locales.push(l.nombre);
                  } else {
                    propietariosMap.set(l.propietario_id, {
                      id: l.propietario_id,
                      nombre: l.propietario_nombre || 'Sin nombre',
                      email: l.propietario_email,
                      plan: (l.propietario_plan as TipoPlan) || 'basico',
                      planVenceEn: l.propietario_plan_vence_en || null,
                      locales: [l.nombre],
                    });
                  }
                }
              });
              const propietarios = Array.from(propietariosMap.values());

              const BADGE: Record<string, string> = {
                basico: '📋', profesional: '⭐', premium: '👑',
              };
              const BADGE_COLOR: Record<string, string> = {
                basico: 'bg-gray-700 text-gray-300',
                profesional: 'bg-blue-900/50 text-blue-300',
                premium: 'bg-yellow-900/50 text-yellow-300',
              };

              return (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Users size={22} className="text-purple-400" />
                      Propietarios ({propietarios.length})
                    </h2>
                  </div>

                  {propietarios.length === 0 ? (
                    <div className="bg-gray-800/30 rounded-lg p-12 text-center">
                      <Users size={48} className="text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No hay propietarios registrados aún</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {propietarios.map(p => (
                        <div key={p.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="font-bold text-white truncate">{p.nombre}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${BADGE_COLOR[p.plan]}`}>
                                {BADGE[p.plan]} {p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 truncate">{p.email}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              📍 {p.locales.join(', ')}
                            </p>
                          </div>
                          <button
                            onClick={() => setPropietarioParaPlan({
                              id: p.id,
                              nombre_completo: p.nombre,
                              email: p.email,
                              plan: p.plan,
                              plan_vence_en: p.planVenceEn,
                            })}
                            className="shrink-0 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Crown size={14} />
                            Plan
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

          </>
        )}

        {/* Modal Crear Local */}
        {mostrarCrearRapido && (
          <CrearLocalRapido
            onLocalCreado={handleLocalCreado}
            onCancelar={() => setMostrarCrearRapido(false)}
          />
        )}

        {/* Modal Editar Local */}
        {localEditando && (
          <EditarLocal
            local={localEditando}
            onGuardado={() => {
              setLocalEditando(null);
              cargarDatos();
              mostrarMensaje('exito', 'Local actualizado correctamente');
            }}
            onCancelar={() => setLocalEditando(null)}
          />
        )}

        {/* Modal Asignar Plan */}
        {propietarioParaPlan && (
          <AsignarPlan
            propietario={propietarioParaPlan}
            onGuardado={() => {
              setPropietarioParaPlan(null);
              cargarDatos();
              mostrarMensaje('exito', `✅ Plan asignado a ${propietarioParaPlan.nombre_completo}`);
            }}
            onCancelar={() => setPropietarioParaPlan(null)}
          />
        )}

        {/* Modal de Confirmación de Gestión */}
        {localGestionando && accionGestion && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setLocalGestionando(null);
                setAccionGestion(null);
              }
            }}
          >
            <div 
              className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-red-500/30"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-xl ${
                  accionGestion === 'eliminar' ? 'bg-red-900/30' :
                  accionGestion === 'activar' ? 'bg-green-900/30' :
                  accionGestion === 'desactivar' ? 'bg-yellow-900/30' :
                  'bg-blue-900/30'
                }`}>
                  <AlertTriangle size={24} className={
                    accionGestion === 'eliminar' ? 'text-red-400' :
                    accionGestion === 'activar' ? 'text-green-400' :
                    accionGestion === 'desactivar' ? 'text-yellow-400' :
                    'text-blue-400'
                  } />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {accionGestion === 'eliminar' ? '🗑️ Eliminar Local' :
                     accionGestion === 'activar' ? '✅ Activar Local' :
                     accionGestion === 'desactivar' ? '⏸️ Desactivar Local' :
                     accionGestion === 'verificar' ? '✅ Verificar Local' :
                     '❌ Quitar Verificación'}
                  </h3>
                  <p className="text-sm text-gray-400">Esta acción se ejecutará inmediatamente</p>
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-6">
                <p className="text-white font-medium mb-2">{localGestionando.nombre}</p>
                <div className="text-sm text-gray-400 space-y-1">
                  <p>Tipo: {localGestionando.tipo}</p>
                  {localGestionando.propietario_nombre && (
                    <p>Propietario: {localGestionando.propietario_nombre}</p>
                  )}
                  <p className="flex items-center gap-2">
                    Estado actual:
                    <span className={localGestionando.activo ? 'text-green-400' : 'text-red-400'}>
                      {localGestionando.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    {localGestionando.verificado && (
                      <span className="text-blue-400">(Verificado)</span>
                    )}
                  </p>
                </div>
              </div>

              {accionGestion === 'eliminar' && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3 mb-6">
                  <p className="text-red-200 text-sm">
                    ⚠️ <strong>ADVERTENCIA:</strong> Esta acción es permanente y no se puede deshacer.
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setLocalGestionando(null);
                    setAccionGestion(null);
                  }}
                  disabled={procesandoGestion}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await handleGestionarLocal();
                  }}
                  disabled={procesandoGestion}
                  className={`flex-1 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 ${
                    accionGestion === 'eliminar'
                      ? 'bg-red-600 hover:bg-red-700 disabled:bg-red-800'
                      : 'bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800'
                  } text-white disabled:cursor-not-allowed`}
                >
                  {procesandoGestion ? (
                    <>
                      <Loader size={20} className="animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      {accionGestion === 'eliminar' && '🗑️ Eliminar'}
                      {accionGestion === 'activar' && '✅ Activar'}
                      {accionGestion === 'desactivar' && '⏸️ Desactivar'}
                      {accionGestion === 'verificar' && '✅ Verificar'}
                      {accionGestion === 'desverificar' && '❌ Quitar Verificación'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
