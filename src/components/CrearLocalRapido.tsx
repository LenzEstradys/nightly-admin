/**
 * admin/src/components/CrearLocalRapido.tsx
 * Modal para crear un local nuevo y generar su código de invitación
 * Sprint 3: Sin @nightly/shared, usa backendService, validaciones inline
 */

import { useState } from 'react';
import { MapPin, Building2, Check, Loader, Link as LinkIcon, Navigation, X, AlertCircle, Copy } from 'lucide-react';
import { supabase } from '../supabase';
import { backendService } from '../services/backendService';

type TipoLocal = 'bar' | 'club' | 'pub' | 'discoteca' | 'restaurante';
type MetodoUbicacion = 'link' | 'gps';

interface CrearLocalRapidoProps {
  onLocalCreado: (localId: string, codigo: string) => void;
  onCancelar: () => void;
}

interface Errores {
  nombre?: string;
  ubicacion?: string;
  telefono?: string;
}

const TELEFONO_BO = /^[2-9]\d{7}$/;

function validarForm(nombre: string, latitud: number | null, telefono: string): Errores {
  const errores: Errores = {};
  if (!nombre.trim()) errores.nombre = 'El nombre es obligatorio';
  else if (nombre.trim().length < 3) errores.nombre = 'Mínimo 3 caracteres';
  else if (nombre.trim().length > 80) errores.nombre = 'Máximo 80 caracteres';

  if (!latitud) errores.ubicacion = 'Debes obtener la ubicación del local';

  const tel = telefono.replace(/[\s\-\(\)]/g, '');
  if (!tel) errores.telefono = 'El teléfono es obligatorio';
  else if (!TELEFONO_BO.test(tel)) errores.telefono = 'Formato inválido. Ej: 76543210 (8 dígitos)';
  return errores;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

// Para links normales (no acortados), extrae coordenadas localmente
function extraerCoordenadasLocal(url: string): { lat: number; lng: number } | null {
  // Soporte para coordenadas pegadas directamente: "-16.4658, -68.1190"
  const coordDirecta = url.trim().match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
  if (coordDirecta) {
    const lat = parseFloat(coordDirecta[1]);
    const lng = parseFloat(coordDirecta[2]);
    if (lat >= -25 && lat <= -8 && lng >= -72 && lng <= -55) return { lat, lng };
  }

  const patrones = [
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /\/place\/[^/]*\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
  ];
  for (const p of patrones) {
    const m = url.match(p);
    if (m) return { lat: parseFloat(m[1]), lng: parseFloat(m[2]) };
  }
  return null;
}

// Para links acortados (goo.gl), pide al backend que los expanda
async function expandirViaBackend(url: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(`${BACKEND_URL}/api/utils/expand-url?url=${encodeURIComponent(url)}`);
  const json = await res.json();
  if (json.success) return { lat: json.lat, lng: json.lng };
  return null;
}

export default function CrearLocalRapido({ onLocalCreado, onCancelar }: CrearLocalRapidoProps) {
  const [paso, setPaso] = useState<'form' | 'exito'>('form');
  const [cargando, setCargando] = useState(false);
  const [usandoGPS, setUsandoGPS] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [tocado, setTocado] = useState<Record<string, boolean>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoLocal>('bar');
  const [telefono, setTelefono] = useState('');
  const [latitud, setLatitud] = useState<number | null>(null);
  const [longitud, setLongitud] = useState<number | null>(null);
  const [direccion, setDireccion] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [metodoUbicacion, setMetodoUbicacion] = useState<MetodoUbicacion>('link');
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  const [codigoGenerado, setCodigoGenerado] = useState('');
  const [localNombreExito, setLocalNombreExito] = useState('');

  const marcarTocado = (campo: string) =>
    setTocado(prev => ({ ...prev, [campo]: true }));

  const [expandiendo, setExpandiendo] = useState(false);

  const handleGoogleMapsLink = async (link: string) => {
    setGoogleMapsLink(link);
    if (!link.trim()) { setLatitud(null); setLongitud(null); setDireccion(''); return; }

    const esAcortado = link.includes('goo.gl') || link.includes('maps.app.goo.gl');

    if (esAcortado) {
      setExpandiendo(true);
      setDireccion('🔄 Expandiendo link...');
      try {
        const coords = await expandirViaBackend(link);
        if (coords) {
          setLatitud(coords.lat);
          setLongitud(coords.lng);
          setDireccion(`Coordenadas: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
          setErrores(prev => ({ ...prev, ubicacion: undefined }));
        } else {
          setLatitud(null); setLongitud(null); setDireccion('');
          setErrores(prev => ({ ...prev, ubicacion: 'Google bloqueó la expansión. En Maps: mantén presionado el pin → copia los números que aparecen (ej: -16.46, -68.11) y pégalos aquí.' }));
        }
      } catch {
        setLatitud(null); setLongitud(null); setDireccion('');
        setErrores(prev => ({ ...prev, ubicacion: 'Error al procesar el link. Verifica tu conexión.' }));
      } finally {
        setExpandiendo(false);
      }
    } else {
      const coords = extraerCoordenadasLocal(link);
      if (coords) {
        setLatitud(coords.lat);
        setLongitud(coords.lng);
        setDireccion(`Coordenadas: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`);
        setErrores(prev => ({ ...prev, ubicacion: undefined }));
      } else {
        setLatitud(null); setLongitud(null); setDireccion('');
        if (tocado.ubicacion) {
          setErrores(prev => ({ ...prev, ubicacion: 'No se pudieron extraer coordenadas del link' }));
        }
      }
    }
  };

  const obtenerGPS = async () => {
    setUsandoGPS(true);
    try {
      if (!navigator.geolocation) {
        setErrores(prev => ({ ...prev, ubicacion: 'Tu dispositivo no soporta geolocalización' }));
        return;
      }
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        })
      );
      setLatitud(pos.coords.latitude);
      setLongitud(pos.coords.longitude);
      setDireccion(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
      setErrores(prev => ({ ...prev, ubicacion: undefined }));
    } catch {
      setErrores(prev => ({ ...prev, ubicacion: 'No se pudo obtener la ubicación. Verifica los permisos.' }));
    } finally {
      setUsandoGPS(false);
    }
  };

  const handleCrear = async () => {
    const nuevosErrores = validarForm(nombre, latitud, telefono);
    setErrores(nuevosErrores);
    setTocado({ nombre: true, ubicacion: true, telefono: true });
    if (Object.keys(nuevosErrores).length > 0) return;

    setCargando(true);
    setErrorGeneral(null);
    try {
      const tel = telefono.replace(/[\s\-\(\)]/g, '');

      // 1. Crear local vía backend (service_key, bypasea RLS)
      const result = await backendService.crearLocal({
        nombre: nombre.trim(),
        tipo,
        direccion: direccion || 'Por confirmar',
        latitud: latitud!,
        longitud: longitud!,
        telefono: `+591${tel}`,
      });

      const nuevoLocalId = result.data.id;

      // 2. Generar código de invitación vía función SQL
      const { data: sessionData } = await supabase.auth.getSession();
      const adminUserId = sessionData.session?.user.id;
      if (!adminUserId) throw new Error('No hay sesión activa');

      const { data: codigo, error: codigoError } = await supabase.rpc(
        'generar_codigo_invitacion',
        { p_local_id: nuevoLocalId, p_admin_id: adminUserId }
      );
      if (codigoError) throw new Error('Error generando código de invitación');

      setCodigoGenerado(codigo);
      setLocalNombreExito(nombre.trim());
      setPaso('exito');
      onLocalCreado(nuevoLocalId, codigo);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error desconocido';
      setErrorGeneral(msg);
    } finally {
      setCargando(false);
    }
  };

  const copiarCodigo = async () => {
    await navigator.clipboard.writeText(codigoGenerado);
    setCodigoCopiado(true);
    setTimeout(() => setCodigoCopiado(false), 2000);
  };

  const compartirWhatsApp = () => {
    const tel = telefono.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `🌙 ¡Bienvenido a Nightly!\n\n` +
      `Tu local "${localNombreExito}" ya está en nuestro mapa.\n\n` +
      `👉 Regístrate aquí: ${window.location.origin}\n\n` +
      `🔑 Código de invitación: ${codigoGenerado}\n\n` +
      `Podrás actualizar capacidad, promociones y más en tiempo real.`
    );
    window.open(`https://wa.me/591${tel}?text=${msg}`, '_blank');
  };

  // ── PANTALLA ÉXITO ──────────────────────────────────────────────
  if (paso === 'exito') {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-green-500/30">
          <div className="flex flex-col items-center mb-6">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <Check size={48} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white text-center">¡Local Creado!</h2>
            <p className="text-gray-400 text-center mt-2">
              {localNombreExito} ya está en el mapa de Nightly
            </p>
          </div>

          <div className="bg-gray-900 rounded-xl p-6 border border-purple-500/30 mb-4">
            <p className="text-sm text-gray-400 text-center mb-2">Código de Invitación</p>
            <div className="text-4xl font-bold text-center text-purple-400 tracking-widest mb-4 font-mono">
              {codigoGenerado}
            </div>
            <button
              onClick={copiarCodigo}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Copy size={16} />
              {codigoCopiado ? '✅ ¡Copiado!' : 'Copiar Código'}
            </button>
          </div>

          <div className="space-y-3">
            <button
              onClick={compartirWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
            >
              💬 Enviar por WhatsApp
            </button>
            <button
              onClick={onCancelar}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition-colors"
            >
              ✅ Listo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORMULARIO ──────────────────────────────────────────────────
  const formularioValido = Object.keys(validarForm(nombre, latitud, telefono)).length === 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6 border border-purple-500/30 my-8">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="text-purple-400" /> Crear Local
          </h2>
          <button onClick={onCancelar} disabled={cargando}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50">
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {errorGeneral && (
          <div className="flex items-start gap-3 bg-red-900/40 border border-red-500/50 rounded-xl p-4 mb-4">
            <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-red-300 font-medium">Error al crear local</p>
              <p className="text-red-400 text-sm mt-1">{errorGeneral}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Nombre del Local *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                if (tocado.nombre) setErrores(prev => ({ ...prev, ...validarForm(e.target.value, latitud, telefono) }));
              }}
              onBlur={() => { marcarTocado('nombre'); setErrores(validarForm(nombre, latitud, telefono)); }}
              placeholder="Ej: La Casona Bar"
              disabled={cargando}
              className={`w-full bg-gray-700 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors disabled:opacity-60 ${
                tocado.nombre && errores.nombre ? 'border-red-500' : 'border-gray-600 focus:border-purple-500'
              }`}
            />
            {tocado.nombre && errores.nombre && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errores.nombre}</p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de Local *</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoLocal)} disabled={cargando}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 disabled:opacity-60">
              <option value="bar">🍺 Bar</option>
              <option value="club">🎵 Club</option>
              <option value="pub">🍻 Pub</option>
              <option value="discoteca">💃 Discoteca</option>
              <option value="restaurante">🍴 Restaurante</option>
            </select>
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Ubicación *</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button type="button" onClick={() => setMetodoUbicacion('link')}
                className={`py-2 px-4 rounded-lg font-medium transition-all ${
                  metodoUbicacion === 'link' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}>
                <LinkIcon size={16} className="inline mr-1" />Link Maps
              </button>
              <button type="button" onClick={() => setMetodoUbicacion('gps')}
                className={`py-2 px-4 rounded-lg font-medium transition-all ${
                  metodoUbicacion === 'gps' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}>
                <Navigation size={16} className="inline mr-1" />GPS Actual
              </button>
            </div>

            {metodoUbicacion === 'link' ? (
              <div>
                <div className="relative">
                  <input type="text" value={googleMapsLink}
                    onChange={(e) => { marcarTocado('ubicacion'); handleGoogleMapsLink(e.target.value); }}
                    placeholder="Link de Google Maps o coordenadas (-16.46, -68.11)"
                    disabled={cargando || expandiendo}
                    className={`w-full bg-gray-700 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors disabled:opacity-60 ${
                      tocado.ubicacion && errores.ubicacion ? 'border-red-500' : 'border-gray-600 focus:border-purple-500'
                    }`}
                  />
                  {expandiendo && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader size={18} className="animate-spin text-purple-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  💡 Opción 1: Google Maps → Compartir → Copiar link. Opción 2: En Maps mantén presionado el pin → copia los números (<span className="text-gray-400">-16.46, -68.11</span>) y pégalos aquí.
                </p>
              </div>
            ) : (
              <button onClick={() => { marcarTocado('ubicacion'); obtenerGPS(); }}
                disabled={cargando || usandoGPS}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                {usandoGPS ? <><Loader size={20} className="animate-spin" />Obteniendo...</>
                  : latitud ? <><Check size={20} />Ubicación obtenida</>
                  : <><MapPin size={20} />Usar Mi Ubicación (GPS)</>}
              </button>
            )}

            {direccion && <p className="text-xs text-green-400 mt-2">✅ {direccion}</p>}
            {tocado.ubicacion && errores.ubicacion && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errores.ubicacion}</p>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Teléfono del Dueño *</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 shrink-0">🇧🇴 +591</span>
              <input type="tel" value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  if (tocado.telefono) setErrores(validarForm(nombre, latitud, e.target.value));
                }}
                onBlur={() => { marcarTocado('telefono'); setErrores(validarForm(nombre, latitud, telefono)); }}
                placeholder="76543210"
                disabled={cargando}
                className={`flex-1 bg-gray-700 border rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors disabled:opacity-60 ${
                  tocado.telefono && errores.telefono ? 'border-red-500' : 'border-gray-600 focus:border-purple-500'
                }`}
              />
            </div>
            {tocado.telefono && errores.telefono && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errores.telefono}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Para enviarle el código por WhatsApp</p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button onClick={onCancelar} disabled={cargando}
              className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-60 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors">
              Cancelar
            </button>
            <button onClick={handleCrear} disabled={cargando || !formularioValido}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
              {cargando ? <><Loader size={20} className="animate-spin" />Creando...</>
                : <><Check size={20} />Crear Local</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
