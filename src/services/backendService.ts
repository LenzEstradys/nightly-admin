/**
 * admin/src/services/backendService.ts
 * Servicio para llamadas al backend Express (operaciones que requieren service_key)
 */

import { supabase } from '../supabase';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3000';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('No hay sesión activa');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function handleResponse(res: Response) {
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error ?? `Error HTTP ${res.status}`);
  }
  return json;
}

export const backendService = {

  async crearLocal(datos: {
    nombre: string;
    tipo: string;
    direccion: string;
    latitud: number;
    longitud: number;
    telefono?: string;
  }) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/admin/locales`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...datos,
        estado: 'vacio',
        capacidad_actual: 0,
        activo: true,
        verificado: false,
        tiene_musica_en_vivo: false,
        es_zona_segura: true,
      }),
    });
    return handleResponse(res);
  },

  async actualizarLocal(id: string, campos: Record<string, unknown>) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/admin/locales/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(campos),
    });
    return handleResponse(res);
  },

  async eliminarLocal(id: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/admin/locales/${id}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },

  async asignarPlan(propietarioId: string, plan: string, planVenceEn: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/admin/propietarios/${propietarioId}/plan`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ plan, plan_vence_en: planVenceEn }),
    });
    return handleResponse(res);
  },

  // ── Rutas de propietario ──────────────────────────────────────

  async actualizarMiLocal(campos: Record<string, unknown>) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/local`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(campos),
    });
    return handleResponse(res);
  },

  async presignFoto(extension: string): Promise<{
    success: boolean;
    signedUrl: string;
    path: string;
    publicUrl: string;
    fotosActuales: number;
    limite: number;
  }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/local/fotos/presign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ extension }),
    });
    return handleResponse(res);
  },

  async confirmFotoLocal(path: string): Promise<{
    success: boolean;
    url: string;
    fotos: string[];
    mensaje: string;
  }> {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/local/fotos/confirm`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ path }),
    });
    return handleResponse(res);
  },

  async eliminarFotoLocal(url: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BACKEND_URL}/api/owner/local/fotos`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ url }),
    });
    return handleResponse(res);
  },

};
