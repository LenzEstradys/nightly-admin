/**
 * admin/src/App.tsx
 * Aplicación principal refactorizada con arquitectura limpia
 */

import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { signOut } from './services/authService';
import Login from './Login';
import RegistroPropietario from './RegistroPropietario';
import SuperAdminPanel from './SuperAdminPanel';
import PropietarioPanel from './PropietarioPanel';  // ← AGREGADO
import { Loader, AlertCircle } from 'lucide-react';
import type { Propietario } from './types/auth';

type Vista = 'login' | 'registro';

export default function App() {
  const { user, role, loading, error, sessionExpired } = useAuth();
  const [vista, setVista] = useState<Vista>('login');

  // Estado de carga
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block">
            <Loader size={48} className="text-purple-400 animate-spin" />
          </div>
          <p className="mt-4 text-gray-400 text-lg">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error de autenticación
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-900/30 border border-red-500/50 rounded-2xl p-8 text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error de Acceso</h2>
          <p className="text-red-200 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Sesión expirada - mostrar mensaje específico antes del login genérico
  if (sessionExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/80 border border-yellow-500/40 rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">⏱️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Sesión Expirada</h2>
          <p className="text-gray-300 mb-6">
            Tu sesión cerró por inactividad. Inicia sesión nuevamente para continuar.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-semibold transition-colors text-white"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  // No autenticado - Mostrar login o registro
  if (!user || !role) {
    if (vista === 'registro') {
      return (
        <RegistroPropietario
          onVolverALogin={() => setVista('login')}
          onRegistroExitoso={() => {
            setVista('login');
            // El login automático lo manejará el componente RegistroPropietario
          }}
        />
      );
    }

    return (
      <Login
        onLoginSuccess={() => {
          // El hook useAuth detectará el cambio y cargará el rol automáticamente
        }}
        onIrARegistro={() => setVista('registro')}
      />
    );
  }

  // Autenticado - Renderizar según rol
  switch (role.type) {
    case 'super_admin':
      return (
        <SuperAdminPanel
          onVolver={async () => {
            await signOut();
            // Solo limpiar claves de Supabase, no todo localStorage
            Object.keys(localStorage)
              .filter(k => k.startsWith('sb-'))
              .forEach(k => localStorage.removeItem(k));
            window.location.href = '/';
          }}
        />
      );

    case 'propietario': {
      const propietarioData = role.data as Propietario;
      
      // Verificar que tenga local asignado
      if (!propietarioData.local_asignado_id) {
        return (
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-red-900/30 border border-red-500/50 rounded-2xl p-8 text-center">
              <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Sin Local Asignado</h2>
              <p className="text-red-200 mb-6">
                No tienes un local asignado. Contacta al administrador.
              </p>
              <button
                onClick={async () => {
                  await signOut();
                  window.location.reload();
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        );
      }

      // Renderizar PropietarioPanel
      return (
        <PropietarioPanel
          onVolver={async () => {
            await signOut();
            Object.keys(localStorage)
              .filter(k => k.startsWith('sb-'))
              .forEach(k => localStorage.removeItem(k));
            window.location.href = '/';
          }}
          propietarioData={{
            id: propietarioData.id,
            nombre_completo: propietarioData.nombre_completo || 'Propietario',
            local_asignado_id: propietarioData.local_asignado_id
          }}
        />
      );
    }

    default:
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-4">Rol no reconocido</h1>
            <button
              onClick={async () => {
                await signOut();
                window.location.reload();
              }}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Volver al login
            </button>
          </div>
        </div>
      );
  }
}
