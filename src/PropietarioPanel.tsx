/**
 * admin/src/PropietarioPanel.tsx
 * Panel del propietario con funcionalidades por plan
 *
 * BÁSICO (Bs.20):    capacidad, horario, música, 3 promos/mes
 * PROFESIONAL (Bs.120): + stats, fotos, redes sociales, promos ilimitadas
 * PREMIUM (Bs.280):  + todo profesional + boost, posición top
 */

import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  ArrowLeft, Save, TrendingUp, Users, MapPin, Phone,
  Music, Shield, Instagram, Facebook,
  Sparkles, Loader, Eye, Crown, Lock, Clock,
  Star, Zap, BarChart2, ChevronRight
} from 'lucide-react';
import TarjetaPlan from './components/TarjetaPlan';
import { type TipoPlan, planVigente, PLANES } from './types/planes';
import { backendService } from './services/backendService';

interface PropietarioData {
  id: string;
  nombre_completo: string;
  local_asignado_id: string;
}

interface LocalData {
  id: string;
  nombre: string;
  tipo: string;
  direccion: string;
  telefono: string | null;
  activo: boolean;
  verificado: boolean;
  capacidad_actual: number;
  estado: string;
  tiempo_espera: number;
  tiene_musica_en_vivo: boolean;
  es_zona_segura: boolean;
  musica_actual: string | null;
  promocion: string | null;
  instagram: string | null;
  facebook: string | null;
  horario_apertura: string | null;
  horario_cierre: string | null;
  rango_precio: string | null;
  descripcion: string | null;
}

interface PropietarioPanelProps {
  onVolver: () => void;
  propietarioData: PropietarioData;
}

type TabActiva = 'control' | 'info' | 'estadisticas' | 'plan';

// Contar promos usadas este mes (simplificado: cuenta cambios en localStorage)
function getPromosEsteMes(localId: string): number {
  const key = `promos_${localId}_${new Date().getFullYear()}_${new Date().getMonth()}`;
  return parseInt(localStorage.getItem(key) || '0', 10);
}
function incrementarPromos(localId: string) {
  const key = `promos_${localId}_${new Date().getFullYear()}_${new Date().getMonth()}`;
  const actual = parseInt(localStorage.getItem(key) || '0', 10);
  localStorage.setItem(key, String(actual + 1));
}

export default function PropietarioPanel({ onVolver, propietarioData }: PropietarioPanelProps) {
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [local, setLocal] = useState<LocalData | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);
  const [plan, setPlan] = useState<TipoPlan>('basico');
  const [planVenceEn, setPlanVenceEn] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<TabActiva>('control');

  // Editables
  const [capacidadActual, setCapacidadActual] = useState(0);
  const [tiempoEspera, setTiempoEspera] = useState(0);
  const [musicaEnVivo, setMusicaEnVivo] = useState(false);
  const [musicaActual, setMusicaActual] = useState('');
  const [promocion, setPromocion] = useState('');
  const [horarioApertura, setHorarioApertura] = useState('');
  const [horarioCierre, setHorarioCierre] = useState('');

  // Estados Pro/Premium
  const [instagram, setInstagram] = useState('');
  const [facebook, setFacebook] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [rangoPrecio, setRangoPrecio] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [uploadProgreso, setUploadProgreso] = useState(0);
  const [eliminandoFoto, setEliminandoFoto] = useState<string | null>(null);

  const promosUsadas = local ? getPromosEsteMes(local.id) : 0;
  const puedeStats = plan === 'profesional' || plan === 'premium';
  const puedePromos = puedeStats ? true : promosUsadas < 3;
  const esPremium = plan === 'premium';

  useEffect(() => {
    cargarLocal();
    cargarPlan();
  }, []);

  const cargarPlan = async () => {
    const { data } = await supabase
      .from('perfiles')
      .select('plan, plan_vence_en')
      .eq('id', propietarioData.id)
      .single();
    if (data) {
      setPlan((data.plan as TipoPlan) || 'basico');
      setPlanVenceEn(data.plan_vence_en);
    }
  };

  const cargarLocal = async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', propietarioData.local_asignado_id)
        .single();
      if (error) throw error;
      if (data) {
        setLocal(data);
        setCapacidadActual(data.capacidad_actual || 0);
        setTiempoEspera(data.tiempo_espera || 0);
        setMusicaEnVivo(data.tiene_musica_en_vivo || false);
        setMusicaActual(data.musica_actual || '');
        setPromocion(data.promocion || '');
        setHorarioApertura(data.horario_apertura || '');
        setHorarioCierre(data.horario_cierre || '');
        // Pro/Premium
        setInstagram(data.instagram || '');
        setFacebook(data.facebook || '');
        setDescripcion(data.descripcion || '');
        setRangoPrecio(data.rango_precio || '');
        setTelefono(data.telefono || '');
        setFotos(data.fotos || []);
      }
    } catch {
      mostrarMensaje('error', 'Error al cargar datos del local');
    } finally {
      setCargando(false);
    }
  };

  const calcularEstado = (cap: number) => {
    if (cap >= 80) return 'fuego';
    if (cap >= 50) return 'caliente';
    if (cap >= 20) return 'medio';
    return 'vacio';
  };

  const getEstadoEmoji = (e: string) =>
    ({ fuego: '🔥', caliente: '🟡', medio: '🟢', vacio: '⚪' }[e] ?? '⚪');

  const getEstadoTexto = (e: string) =>
    ({ fuego: 'A REVENTAR', caliente: 'CONCURRIDO', medio: 'MODERADO', vacio: 'VACÍO' }[e] ?? '—');

  const guardar = async () => {
    if (!local) return;
    const promocionCambio = promocion.trim() !== (local.promocion || '');
    if (plan === 'basico' && promocionCambio && promosUsadas >= 3) {
      mostrarMensaje('error', '⚠️ Límite de 3 promos este mes. Actualiza al plan Profesional.');
      return;
    }
    setGuardando(true);
    try {
      const nuevoEstado = calcularEstado(capacidadActual);
      const campos: Record<string, unknown> = {
        capacidad_actual: capacidadActual,
        estado: nuevoEstado,
        tiempo_espera: tiempoEspera,
        tiene_musica_en_vivo: musicaEnVivo,
        musica_actual: musicaActual.trim() || null,
        promocion: promocion.trim() || null,
        horario_apertura: horarioApertura || null,
        horario_cierre: horarioCierre || null,
      };
      // Campos exclusivos Pro/Premium
      if (puedeStats) {
        campos.instagram = instagram.trim() || null;
        campos.facebook = facebook.trim() || null;
        campos.descripcion = descripcion.trim() || null;
        campos.rango_precio = rangoPrecio || null;
        campos.telefono = telefono.trim() || null;
      }
      await backendService.actualizarMiLocal(campos);
      if (plan === 'basico' && promocionCambio) incrementarPromos(local.id);
      setLocal({ ...local, capacidad_actual: capacidadActual, estado: nuevoEstado });
      mostrarMensaje('exito', '✅ Local actualizado correctamente');
    } catch (err: unknown) {
      mostrarMensaje('error', `❌ ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleSubirFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formatosPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!formatosPermitidos.includes(file.type)) {
      mostrarMensaje('error', '❌ Formato no permitido. Usa JPG, PNG o WebP');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      mostrarMensaje('error', '❌ La foto no puede superar 5MB');
      e.target.value = '';
      return;
    }

    setSubiendoFoto(true);
    setUploadProgreso(0);
    try {
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg', 'image/jpg': 'jpg',
        'image/png': 'png', 'image/webp': 'webp',
      };
      const extension = mimeToExt[file.type] ?? 'jpg';

      // 1. Pedir presigned URL al backend (valida plan + límite)
      const { signedUrl, path } = await backendService.presignFoto(extension);

      // 2. Subir binario directo a Supabase Storage con progreso real
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            setUploadProgreso(Math.round((ev.loaded / ev.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload falló: HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Error de red al subir foto'));
        xhr.send(file);
      });

      // 3. Registrar en DB (confirmar ownership + actualizar array)
      const result = await backendService.confirmFotoLocal(path);
      setFotos(result.fotos);
      mostrarMensaje('exito', result.mensaje);
    } catch (err: unknown) {
      mostrarMensaje('error', `❌ ${err instanceof Error ? err.message : 'Error al subir foto'}`);
    } finally {
      setSubiendoFoto(false);
      setUploadProgreso(0);
      e.target.value = '';
    }
  };

  const handleEliminarFoto = async (url: string) => {
    setEliminandoFoto(url);
    try {
      const result = await backendService.eliminarFotoLocal(url);
      setFotos(result.fotos);
      mostrarMensaje('exito', 'Foto eliminada');
    } catch (err: unknown) {
      mostrarMensaje('error', 'Error al eliminar foto');
    } finally {
      setEliminandoFoto(null);
    }
  };

  const mostrarMensaje = (tipo: 'exito' | 'error', texto: string) => {
    setMensaje({ tipo, texto });
    setTimeout(() => setMensaje(null), 4000);
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 text-white flex items-center justify-center">
        <Loader size={48} className="animate-spin text-blue-400" />
      </div>
    );
  }
  if (!local) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xl text-red-400 mb-4">⚠️ No se encontró tu local</p>
          <button onClick={onVolver} className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg">Volver</button>
        </div>
      </div>
    );
  }

  const estadoActual = calcularEstado(capacidadActual);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={onVolver} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Panel de Propietario
              </h1>
              <p className="text-gray-400 text-sm">Gestiona tu local en tiempo real</p>
            </div>
          </div>
          <button onClick={guardar} disabled={guardando}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all disabled:cursor-not-allowed text-sm">
            {guardando ? <><Loader size={16} className="animate-spin" />Guardando...</> : <><Save size={16} />Guardar</>}
          </button>
        </div>

        {/* Info del local */}
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-5 border border-blue-500/30 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white mb-2">🏠 {local.nombre}</h2>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="px-3 py-1 bg-blue-900/50 rounded-full">{local.tipo}</span>
                {local.verificado && (
                  <span className="px-3 py-1 bg-green-900/50 rounded-full flex items-center gap-1">
                    <Shield size={12} />Verificado
                  </span>
                )}
                <span className={`px-3 py-1 rounded-full ${local.activo ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                  {local.activo ? '🟢 Activo' : '🔴 Inactivo'}
                </span>
                {plan === 'premium' && <span className="px-3 py-1 bg-yellow-900/50 text-yellow-300 rounded-full font-bold">👑 Premium</span>}
                {plan === 'profesional' && <span className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full">⭐ Profesional</span>}
                {plan === 'basico' && <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">📋 Básico</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl mb-1">{getEstadoEmoji(estadoActual)}</div>
              <p className="text-sm font-bold">{getEstadoTexto(estadoActual)}</p>
            </div>
          </div>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-4 p-4 rounded-lg text-sm ${
            mensaje.tipo === 'exito'
              ? 'bg-green-900/30 border border-green-500/50 text-green-200'
              : 'bg-red-900/30 border border-red-500/50 text-red-200'
          }`}>{mensaje.texto}</div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {([
            { id: 'control', label: 'Control', icon: <Zap size={16} /> },
            { id: 'info',    label: 'Mi Local', icon: <MapPin size={16} /> },
            { id: 'estadisticas', label: 'Estadísticas', icon: <BarChart2 size={16} />, locked: !puedeStats },
            { id: 'plan',    label: 'Mi Plan', icon: <Crown size={16} /> },
          ] as { id: TabActiva; label: string; icon: React.ReactNode; locked?: boolean }[]).map(tab => (
            <button key={tab.id} onClick={() => setTabActiva(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                tabActiva === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}>
              {tab.icon}
              {tab.label}
              {tab.locked && <Lock size={12} className="text-yellow-400" />}
            </button>
          ))}
        </div>

        {/* ── TAB CONTROL ── */}
        {tabActiva === 'control' && (
          <div className="space-y-5">

            {/* Capacidad */}
            <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Users size={20} className="text-blue-400" />Capacidad Actual
              </h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-4xl font-bold text-blue-400">{capacidadActual}%</span>
                  <span className="text-gray-400 text-sm">{getEstadoTexto(estadoActual)}</span>
                </div>
                <input type="range" min="0" max="100" value={capacidadActual}
                  onChange={(e) => setCapacidadActual(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #3b82f6 ${capacidadActual}%, #374151 ${capacidadActual}%)` }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0% Vacío</span><span>20% Medio</span><span>50% Caliente</span><span>80% 🔥</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Tiempo de Espera (minutos)</label>
                <input type="number" min="0" max="120" value={tiempoEspera}
                  onChange={(e) => setTiempoEspera(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white" />
              </div>
            </div>

            {/* Horario */}
            <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Clock size={20} className="text-cyan-400" />Horario
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Apertura</label>
                  <input type="time" value={horarioApertura}
                    onChange={(e) => setHorarioApertura(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Cierre</label>
                  <input type="time" value={horarioCierre}
                    onChange={(e) => setHorarioCierre(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white" />
                </div>
              </div>
            </div>

            {/* Promoción */}
            <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles size={20} className="text-yellow-400" />Promoción Activa
                </h3>
                {plan === 'basico' && (
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                    promosUsadas >= 3 ? 'bg-red-900/50 text-red-300' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {promosUsadas}/3 este mes
                  </span>
                )}
              </div>

              {plan === 'basico' && promosUsadas >= 3 ? (
                <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
                  <p className="text-yellow-300 font-bold mb-1">⚠️ Límite mensual alcanzado</p>
                  <p className="text-gray-300 text-sm mb-3">Usaste tus 3 cambios de promoción este mes. Con el plan Profesional tendrías promos ilimitadas.</p>
                  <button onClick={() => setTabActiva('plan')}
                    className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold flex items-center gap-1 transition-colors">
                    Ver planes <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <textarea value={promocion} onChange={(e) => setPromocion(e.target.value)}
                    placeholder="Ej: 2x1 en cervezas hasta las 23:00"
                    maxLength={200} rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 resize-none" />
                  <p className="text-xs text-gray-500 mt-1">{promocion.length}/200</p>
                </>
              )}
            </div>

            {/* Música */}
            <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Music size={20} className="text-purple-400" />Ambiente Musical
              </h3>
              <label className="flex items-center gap-3 mb-4 cursor-pointer">
                <input type="checkbox" checked={musicaEnVivo}
                  onChange={(e) => setMusicaEnVivo(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600" />
                <span className="font-medium">🎸 Música en vivo ahora</span>
              </label>
              <input type="text" value={musicaActual} onChange={(e) => setMusicaActual(e.target.value)}
                placeholder="Ej: Reggaeton, House, Rock"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
            </div>
          </div>
        )}

        {/* ── TAB INFO ── */}
        {tabActiva === 'info' && (
          <div className="space-y-5">

            {/* Info básica — solo lectura */}
            <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">Información del Local</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-400 mb-1">📍 Dirección</p>
                  <p className="font-medium">{local.direccion || 'Por confirmar'}</p>
                </div>
                {horarioApertura && (
                  <div>
                    <p className="text-gray-400 mb-1">🕐 Horario (editable en Control)</p>
                    <p className="font-medium">{horarioApertura} - {horarioCierre}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Campos editables Pro/Premium */}
            <div className={`rounded-xl p-5 border ${puedeStats ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-800/20 border-gray-700/40'}`}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold">Perfil Completo</h3>
                {!puedeStats && (
                  <span className="text-xs bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full flex items-center gap-1">
                    <Lock size={10} />Plan Profesional
                  </span>
                )}
              </div>

              {puedeStats ? (
                <div className="space-y-4">
                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                      <Phone size={14} className="text-yellow-400" />Teléfono
                    </label>
                    <input type="text" value={telefono} onChange={e => setTelefono(e.target.value)}
                      placeholder="Ej: +591 7XXXXXXX"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                  {/* Descripción */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">📝 Descripción</label>
                    <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)}
                      placeholder="Describe tu local, ambiente, especialidades..."
                      maxLength={300} rows={3}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 resize-none" />
                    <p className="text-xs text-gray-500 mt-1">{descripcion.length}/300</p>
                  </div>
                  {/* Rango de precios */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">💰 Rango de Precios</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['$', '$$', '$$$', '$$$$'].map(r => (
                        <button key={r} onClick={() => setRangoPrecio(r)}
                          className={`py-2 rounded-lg text-sm font-bold transition-colors ${
                            rangoPrecio === r ? 'bg-purple-600 text-white border-purple-500' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600'
                          }`}>{r}</button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">$ Económico · $$ Moderado · $$$ Elevado · $$$$ Premium</p>
                  </div>
                  {/* Instagram */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                      <Instagram size={14} className="text-pink-400" />Instagram
                    </label>
                    <div className="flex items-center bg-gray-700 border border-gray-600 rounded-lg overflow-hidden">
                      <span className="px-3 text-gray-400 text-sm">@</span>
                      <input type="text" value={instagram.replace('@', '')} onChange={e => setInstagram(e.target.value)}
                        placeholder="tulocal"
                        className="flex-1 bg-transparent py-3 pr-4 text-white placeholder-gray-500" />
                    </div>
                  </div>
                  {/* Facebook */}
                  <div>
                    <label className="block text-sm text-gray-300 mb-2 flex items-center gap-2">
                      <Facebook size={14} className="text-blue-400" />Facebook
                    </label>
                    <input type="text" value={facebook} onChange={e => setFacebook(e.target.value)}
                      placeholder="facebook.com/tulocal"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500" />
                  </div>
                  <p className="text-xs text-gray-400 pt-2">
                    💾 Recuerda presionar <strong>Guardar</strong> para aplicar los cambios.
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-white font-bold mb-2">Completa tu perfil con el plan Profesional</p>
                  <p className="text-gray-400 text-sm mb-4">Agrega teléfono, descripción, rango de precios, Instagram y Facebook para que más clientes te encuentren.</p>
                  <button onClick={() => setTabActiva('plan')}
                    className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded-lg font-bold text-sm transition-colors">
                    Ver Plan Profesional →
                  </button>
                </div>
              )}
            </div>

            {/* Fotos — Pro/Premium */}
            {(() => {
              const limitesFotos = { basico: 0, profesional: 5, premium: 15 };
              const limite = limitesFotos[plan];
              return (
                <div className={`rounded-xl p-5 border ${puedeStats ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-800/20 border-gray-700/40'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      🖼️ Fotos del Local
                      {puedeStats && <span className="text-xs text-gray-400 font-normal">{fotos.length}/{limite}</span>}
                    </h3>
                    {!puedeStats && (
                      <span className="text-xs bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full flex items-center gap-1">
                        <Lock size={10} />Plan Profesional
                      </span>
                    )}
                  </div>

                  {puedeStats ? (
                    <div>
                      {/* Grid de fotos */}
                      {fotos.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {fotos.map((url, i) => (
                            <div key={i} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-700">
                              <img src={url} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => handleEliminarFoto(url)} disabled={eliminandoFoto === url}
                                  className="bg-red-600 hover:bg-red-500 text-white text-xs px-3 py-1 rounded-lg font-bold">
                                  {eliminandoFoto === url ? '...' : 'Eliminar'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Botón subir */}
                      {fotos.length < limite ? (
                        <label className={`flex items-center justify-center gap-3 border-2 border-dashed border-gray-600 rounded-xl py-6 cursor-pointer transition-colors ${subiendoFoto ? 'opacity-50 cursor-not-allowed' : 'hover:border-purple-500 hover:bg-purple-900/10'}`}>
                          <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleSubirFoto} disabled={subiendoFoto} className="hidden" />
                          {subiendoFoto
                            ? (
                              <div className="flex flex-col items-center gap-2 w-full px-4">
                                <div className="flex items-center gap-2">
                                  <Loader size={16} className="animate-spin text-purple-400" />
                                  <span className="text-gray-300 text-sm">
                                    {uploadProgreso < 100 ? `Subiendo... ${uploadProgreso}%` : 'Registrando...'}
                                  </span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-1.5">
                                  <div
                                    className="bg-purple-500 h-1.5 rounded-full transition-all duration-150"
                                    style={{ width: `${uploadProgreso}%` }}
                                  />
                                </div>
                              </div>
                            )
                            : <><span className="text-2xl">📷</span><div className="text-center"><p className="text-gray-300 text-sm">Subir foto ({fotos.length}/{limite})</p><p className="text-gray-500 text-xs mt-1">JPG, PNG o WebP · máx 5MB</p></div></>
                          }
                        </label>
                      ) : (
                        <p className="text-center text-gray-500 text-sm py-3">
                          Límite de {limite} fotos alcanzado
                          {plan === 'profesional' && <> — <button onClick={() => setTabActiva('plan')} className="text-yellow-400 hover:underline">Premium permite 15 fotos</button></>}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-gray-400 text-sm mb-3">Muestra hasta 5 fotos de tu local para atraer más clientes</p>
                      <button onClick={() => setTabActiva('plan')} className="text-sm bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold transition-colors">
                        Ver Plan Profesional →
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── TAB ESTADÍSTICAS ── */}
        {tabActiva === 'estadisticas' && (
          <div>
            {puedeStats ? (
              <div className="space-y-5">
                <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-green-400" />Esta Semana
                  </h3>
                  <div className="space-y-4">
                    {[
                      { icon: <Eye size={16} className="text-blue-400" />, label: 'Vistas al perfil', valor: '--' },
                      { icon: <MapPin size={16} className="text-green-400" />, label: 'Solicitudes de dirección', valor: '--' },
                      { icon: <Phone size={16} className="text-yellow-400" />, label: 'Llamadas', valor: '--' },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <div className="flex items-center gap-2">
                          {stat.icon}
                          <span className="text-sm text-gray-300">{stat.label}</span>
                        </div>
                        <span className="font-bold text-gray-400">{stat.valor}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-4 text-center">📊 Analytics detallado próximamente</p>
                </div>
              </div>
            ) : (
              /* PANTALLA BLOQUEADA - CTA para subir de plan */
              <div className="relative">
                {/* Preview borroso */}
                <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700 mb-4 blur-sm pointer-events-none select-none">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-green-400" />Esta Semana
                  </h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Vistas al perfil', valor: '247' },
                      { label: 'Solicitudes de dirección', valor: '38' },
                      { label: 'Llamadas recibidas', valor: '12' },
                    ].map((stat, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-700/50">
                        <span className="text-sm text-gray-300">{stat.label}</span>
                        <span className="font-bold text-white">{stat.valor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Overlay CTA */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-gray-900/95 rounded-2xl p-8 border border-blue-500/40 text-center max-w-sm mx-4 shadow-2xl">
                    <div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BarChart2 size={32} className="text-blue-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">¿Cuánta gente te visita?</h3>
                    <p className="text-gray-300 text-sm mb-2">
                      Con el plan <span className="text-blue-400 font-bold">Profesional</span> puedes ver exactamente cuántas personas ven tu local, piden dirección o te llaman cada semana.
                    </p>
                    <div className="bg-gray-800 rounded-xl p-4 mb-5 text-left space-y-2">
                      {['👁️ Vistas semanales', '📍 Solicitudes de dirección', '📞 Llamadas recibidas', '📈 Tendencias del mes'].map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-200">
                          <Star size={12} className="text-blue-400 shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-600/20 border border-blue-500/30 rounded-lg p-3 mb-5">
                      <p className="text-blue-300 text-sm font-bold">⭐ Plan Profesional — Bs. 120/mes</p>
                      <p className="text-gray-400 text-xs mt-1">También incluye fotos, badge destacado y más</p>
                    </div>
                    <button onClick={() => setTabActiva('plan')}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2">
                      <ChevronRight size={18} />Ver todos los planes
                    </button>
                    <p className="text-gray-500 text-xs mt-3">Habla con tu administrador de Nightly para activarlo</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB PLAN ── */}
        {tabActiva === 'plan' && (
          <div>
            <div className="flex items-center gap-3 mb-5">
              <Crown size={22} className="text-yellow-400" />
              <h2 className="text-xl font-bold">Tu Plan</h2>
              {!planVigente(planVenceEn) && (
                <span className="px-3 py-1 bg-red-900/50 text-red-300 rounded-full text-sm font-bold">⚠️ Vencido</span>
              )}
            </div>
            <div className="mb-5">
              <TarjetaPlan planActual={plan} planVenceEn={planVenceEn} modoCompacto />
            </div>
            {plan !== 'premium' && (
              <p className="text-gray-400 text-sm mb-5">
                Contacta a tu administrador de Nightly para hacer upgrade y desbloquear más funcionalidades.
              </p>
            )}
            <TarjetaPlan planActual={plan} planVenceEn={planVenceEn} modoComparacion />
            {esPremium && (
              <div className="mt-5 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border border-yellow-500/30 rounded-xl p-5 text-center">
                <p className="text-2xl mb-2">👑</p>
                <p className="font-bold text-white">¡Tienes el mejor plan!</p>
                <p className="text-gray-300 text-sm mt-1">Tu local aparece primero en Nightly. Gracias por confiar en nosotros.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
