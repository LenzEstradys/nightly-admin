import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  Building2, MapPin, Clock, DollarSign, Phone, 
  Instagram, Facebook, Image, Save, X, Plus,
  AlertCircle, CheckCircle, ArrowLeft
} from 'lucide-react';

interface ConfiguracionLocalProps {
  localId: string;
  onGuardar: () => void;
  onCancelar: () => void;
}

interface LocalData {
  nombre: string;
  direccion: string;
  descripcion: string;
  telefono: string;
  instagram: string;
  facebook: string;
  horario_apertura: string;
  horario_cierre: string;
  rango_precio: string;
  tags: string[];
  fotos: string[];
}

const TAGS_DISPONIBLES = [
  '🎵 Techno', '💃 Reggaeton', '🎸 Rock', '🎺 Salsa',
  '🎹 Electrónica', '🎤 Karaoke', '🍺 Cerveza Artesanal',
  '🍸 Cócteles', '🌮 Comida', '🎭 Shows en vivo',
  '🎉 Fiestas', '🏳️‍🌈 LGBT Friendly', '👔 Dress Code',
  '🎓 Universitario', '💼 After Office'
];

const RANGOS_PRECIO = [
  { value: '$', label: '$ - Económico (hasta 50 Bs)' },
  { value: '$$', label: '$$ - Moderado (50-100 Bs)' },
  { value: '$$$', label: '$$$ - Elevado (100-200 Bs)' },
  { value: '$$$$', label: '$$$$ - Premium (200+ Bs)' }
];

export default function ConfiguracionLocal({ localId, onGuardar, onCancelar }: ConfiguracionLocalProps) {
  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error', texto: string } | null>(null);
  
  const [datos, setDatos] = useState<LocalData>({
    nombre: '',
    direccion: '',
    descripcion: '',
    telefono: '',
    instagram: '',
    facebook: '',
    horario_apertura: '18:00',
    horario_cierre: '04:00',
    rango_precio: '$$',
    tags: [],
    fotos: []
  });

  useEffect(() => {
    cargarDatos();
  }, [localId]);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('locales')
        .select('*')
        .eq('id', localId)
        .single();

      if (error) throw error;

      if (data) {
        setDatos({
          nombre: data.nombre || '',
          direccion: data.direccion || '',
          descripcion: data.descripcion || '',
          telefono: data.telefono || '',
          instagram: data.instagram || '',
          facebook: data.facebook || '',
          horario_apertura: data.horario_apertura || '18:00',
          horario_cierre: data.horario_cierre || '04:00',
          rango_precio: data.rango_precio || '$$',
          tags: data.tags || [],
          fotos: data.fotos || []
        });
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setCargando(false);
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    setMensaje(null);

    try {
      const { error } = await supabase
        .from('locales')
        .update({
          direccion: datos.direccion,
          descripcion: datos.descripcion,
          telefono: datos.telefono,
          instagram: datos.instagram,
          facebook: datos.facebook,
          horario_apertura: datos.horario_apertura,
          horario_cierre: datos.horario_cierre,
          rango_precio: datos.rango_precio,
          tags: datos.tags,
          fotos: datos.fotos
        })
        .eq('id', localId);

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: '¡Perfil actualizado exitosamente!' });
      setTimeout(() => onGuardar(), 1500);
    } catch (error: any) {
      console.error('Error guardando:', error);
      setMensaje({ tipo: 'error', texto: 'Error al guardar. Intenta de nuevo.' });
    } finally {
      setGuardando(false);
    }
  };

  const toggleTag = (tag: string) => {
    setDatos(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onCancelar}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft size={20} />
            Volver al Panel
          </button>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
            Configura tu Local
          </h1>
          <p className="text-gray-400 text-lg">
            Completa la información para atraer más clientes 🚀
          </p>
        </div>

        {/* Mensaje */}
        {mensaje && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
            mensaje.tipo === 'exito' 
              ? 'bg-green-900/30 border border-green-500/50' 
              : 'bg-red-900/30 border border-red-500/50'
          }`}>
            {mensaje.tipo === 'exito' ? (
              <CheckCircle size={24} className="text-green-400" />
            ) : (
              <AlertCircle size={24} className="text-red-400" />
            )}
            <p className={mensaje.tipo === 'exito' ? 'text-green-200' : 'text-red-200'}>
              {mensaje.texto}
            </p>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6">
          {/* Información Básica */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Building2 className="text-purple-400" size={24} />
              Información Básica
            </h2>
            
            <div className="space-y-4">
              {/* Nombre (Solo lectura) */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Nombre del Local
                </label>
                <input
                  type="text"
                  value={datos.nombre}
                  disabled
                  className="w-full bg-gray-700/30 border border-gray-600 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  El nombre no se puede cambiar. Contacta a soporte si necesitas modificarlo.
                </p>
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin size={16} className="text-pink-400" />
                  Dirección Completa
                </label>
                <input
                  type="text"
                  value={datos.direccion}
                  onChange={(e) => setDatos({ ...datos, direccion: e.target.value })}
                  placeholder="Ej: Av. 6 de Agosto #1234, Sopocachi"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-500"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Descripción del Local
                </label>
                <textarea
                  value={datos.descripcion}
                  onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })}
                  placeholder="Describe tu local: ambiente, especialidad, lo que te hace único..."
                  rows={4}
                  maxLength={200}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-500 resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {datos.descripcion.length}/200 caracteres
                </p>
              </div>
            </div>
          </div>

          {/* Contacto */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Phone className="text-green-400" size={24} />
              Información de Contacto
            </h2>
            
            <div className="space-y-4">
              {/* Teléfono */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Teléfono / WhatsApp
                </label>
                <input
                  type="tel"
                  value={datos.telefono}
                  onChange={(e) => setDatos({ ...datos, telefono: e.target.value })}
                  placeholder="Ej: +591 7XXXXXXX"
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-500"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Instagram */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <Instagram size={16} className="text-pink-400" />
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={datos.instagram}
                    onChange={(e) => setDatos({ ...datos, instagram: e.target.value })}
                    placeholder="@tulocal"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-500"
                  />
                </div>

                {/* Facebook */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                    <Facebook size={16} className="text-blue-400" />
                    Facebook
                  </label>
                  <input
                    type="text"
                    value={datos.facebook}
                    onChange={(e) => setDatos({ ...datos, facebook: e.target.value })}
                    placeholder="Tu Local"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder:text-gray-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Horarios y Precios */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Clock className="text-yellow-400" size={24} />
              Horarios y Precios
            </h2>
            
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Horario Apertura */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Hora de Apertura
                  </label>
                  <input
                    type="time"
                    value={datos.horario_apertura}
                    onChange={(e) => setDatos({ ...datos, horario_apertura: e.target.value })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {/* Horario Cierre */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Hora de Cierre
                  </label>
                  <input
                    type="time"
                    value={datos.horario_cierre}
                    onChange={(e) => setDatos({ ...datos, horario_cierre: e.target.value })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Rango de Precio */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <DollarSign size={16} className="text-green-400" />
                  Rango de Precios
                </label>
                <div className="grid md:grid-cols-2 gap-3">
                  {RANGOS_PRECIO.map((rango) => (
                    <button
                      key={rango.value}
                      onClick={() => setDatos({ ...datos, rango_precio: rango.value })}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        datos.rango_precio === rango.value
                          ? 'border-purple-500 bg-purple-900/30'
                          : 'border-gray-600 bg-gray-700/30 hover:border-gray-500'
                      }`}
                    >
                      <div className="font-bold text-lg mb-1">{rango.value}</div>
                      <div className="text-sm text-gray-400">{rango.label.split(' - ')[1]}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
            <h2 className="text-2xl font-bold mb-4">
              🏷️ Categorías y Ambiente
            </h2>
            <p className="text-gray-400 mb-4">
              Selecciona las características que mejor describen tu local (máximo 5)
            </p>
            
            <div className="flex flex-wrap gap-2">
              {TAGS_DISPONIBLES.map((tag) => (
                <button
                  key={tag}
                  onClick={() => datos.tags.length < 5 || datos.tags.includes(tag) ? toggleTag(tag) : null}
                  disabled={datos.tags.length >= 5 && !datos.tags.includes(tag)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    datos.tags.includes(tag)
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : datos.tags.length >= 5
                      ? 'bg-gray-700/30 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              {datos.tags.length}/5 seleccionados
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-4">
            <button
              onClick={onCancelar}
              className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
            >
              <X size={20} />
              Cancelar
            </button>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 active:scale-95 py-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30"
            >
              {guardando ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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
    </div>
  );
}