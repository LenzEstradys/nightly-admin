/**
 * admin/src/hooks/usePermisos.ts
 * Hook para verificar permisos sobre locales.
 *
 * CRITERIO DE ADMIN PRINCIPAL:
 *   Se basa en superAdmin.nivel === 'admin' (campo en BD),
 *   NO en email hardcodeado. Ver migración:
 *   migrations/001_add_nivel_to_super_admins.sql
 */

import { useMemo } from 'react';
import type { UserRole, SuperAdmin } from '../types/auth';

interface Local {
  id: string;
  creado_por_id?: string;
  [key: string]: unknown;
}

export function usePermisos(role: UserRole | null) {
  return useMemo(() => {
    if (!role) {
      return {
        puedeCrearLocal: false,
        puedeEditarLocal: (_local: Local) => false,
        puedeEliminarLocal: (_local: Local) => false,
        puedeVerTodos: false,
        esAdmin: false,
        esPasante: false,
        userId: null as string | null,
      };
    }

    const esAdmin = role.type === 'super_admin';

    // Obtener userId según el tipo de rol
    const userId = esAdmin
      ? (role.data as SuperAdmin).user_id
      : (role.data as { id: string }).id;

    // Admin principal: nivel === 'admin' (viene de la BD, no hardcodeado)
    const esAdminPrincipal = esAdmin
      && (role.data as SuperAdmin).nivel === 'admin';

    return {
      /** ¿Puede crear nuevos locales? Solo super_admins. */
      puedeCrearLocal: esAdmin,

      /** ¿Puede editar este local? Admin principal puede todos; pasante solo los suyos. */
      puedeEditarLocal: (local: Local): boolean => {
        if (!esAdmin) return false;
        if (esAdminPrincipal) return true;
        return local.creado_por_id === userId;
      },

      /** ¿Puede eliminar locales? Solo admin principal. */
      puedeEliminarLocal: (_local: Local): boolean => esAdminPrincipal,

      /** ¿Puede ver todos los locales? Solo admin principal ve todos sin filtro. */
      puedeVerTodos: esAdmin,

      /** ¿Es el admin principal (nivel='admin')? */
      esAdmin: esAdminPrincipal,

      /** ¿Es un pasante (super_admin con nivel='pasante')? */
      esPasante: esAdmin && !esAdminPrincipal,

      /** ID del usuario autenticado. */
      userId,
    };
  }, [role]);
}

/**
 * Separa locales entre los creados por el usuario actual y los del resto.
 */
export function separarLocalesPorCreador(
  locales: Local[],
  userId: string | null
): { misLocales: Local[]; otrosLocales: Local[] } {
  if (!userId) return { misLocales: [], otrosLocales: locales };

  return {
    misLocales: locales.filter(l => l.creado_por_id === userId),
    otrosLocales: locales.filter(l => l.creado_por_id !== userId),
  };
}
