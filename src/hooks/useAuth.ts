/**
 * admin/src/hooks/useAuth.ts
 * Hook de autenticación
 * Sprint 3: Manejo de sesión expirada con mensaje claro al usuario
 */

import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { getUserRole } from '../services/authService';
import type { UserRole } from '../types/auth';

interface UseAuthReturn {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
  sessionExpired: boolean;
  refetch: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  async function loadUserRole(authUser: User) {
    try {
      setLoading(true);
      setError(null);
      const userRole = await getUserRole(authUser.id);
      setUser(authUser);
      setRole(userRole);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar permisos';
      setError(msg);
      setUser(null);
      setRole(null);
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  }

  async function refetch() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await loadUserRole(session.user);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadUserRole(session.user);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setSessionExpired(false);
          await loadUserRole(session.user);

        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setRole(null);
          setLoading(false);

        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token renovado silenciosamente — solo actualizar user
          setUser(session.user);

        } else if (
          event === 'USER_UPDATED' ||
          // Supabase emite SIGNED_OUT sin session cuando el token expira
          (event === 'SIGNED_OUT' && !session)
        ) {
          // No hacer nada extra aquí, lo maneja el bloque SIGNED_OUT de arriba
        }

        // Detectar token expirado: Supabase intenta refresh y falla
        // Esto se manifiesta como error en getSession después de inactividad
      }
    );

    // Verificar expiración al volver a la pestaña (visibilitychange)
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        const currentUser = user;
        if (currentUser) {
          // Había sesión, ahora no hay → expiró
          setSessionExpired(true);
          setUser(null);
          setRole(null);
          await supabase.auth.signOut();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { user, role, loading, error, sessionExpired, refetch };
}
