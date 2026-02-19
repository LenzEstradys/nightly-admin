/**
 * admin/src/services/authService.ts
 * Servicio centralizado de autenticación
 * Maneja toda la lógica de verificación de roles
 */

import { supabase } from '../supabase';
import type { UserRole, SuperAdmin, Propietario } from '../types/auth';
import { PERMISSIONS } from '../types/auth';

/**
 * Obtiene el rol y permisos de un usuario.
 * @param userId - ID del usuario autenticado
 * @returns UserRole con tipo, datos y permisos
 * @throws Error si el usuario no tiene permisos de acceso
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  // 1. Verificar si es super admin
  const { data: superAdmin, error: superAdminError } = await supabase
    .from('super_admins')
    .select('user_id, nombre, email, created_at, nivel')
    .eq('user_id', userId)
    .maybeSingle();

  if (superAdminError && superAdminError.code !== 'PGRST116') {
    console.error('[authService] Error consultando super_admins:', superAdminError);
    throw new Error('Error al verificar permisos de administrador');
  }

  if (superAdmin) {
    // Garantizar que nivel tenga un valor válido aunque la migración no se haya corrido aún
    const adminConNivel: SuperAdmin = {
      ...superAdmin,
      nivel: (superAdmin.nivel as 'admin' | 'pasante') ?? 'pasante',
    };
    return {
      type: 'super_admin',
      data: adminConNivel,
      permissions: PERMISSIONS.super_admin,
    };
  }

  // 2. Verificar si es propietario
  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('id, nombre_usuario, nombre_completo, puntos, es_vip, rol, local_asignado_id, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (perfilError && perfilError.code !== 'PGRST116') {
    console.error('[authService] Error consultando perfiles:', perfilError);
    throw new Error('Error al verificar perfil de propietario');
  }

  if (perfil && perfil.rol === 'propietario') {
    // CRÍTICO #4: Verificar que tenga local asignado.
    // Si no tiene, retornamos el rol igual pero App.tsx
    // mostrará el mensaje "Sin local asignado" sin crashear.
    return {
      type: 'propietario',
      data: perfil as Propietario,
      permissions: PERMISSIONS.propietario,
    };
  }

  // 3. Sin rol reconocido
  throw new Error('Usuario sin permisos de acceso al panel');
}

/**
 * Verifica si el usuario tiene un permiso específico.
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  return role.permissions.includes(permission as Permission);
}

import type { Permission } from '../types/auth';

/**
 * Cierra la sesión del usuario de forma segura.
 * Solo limpia la sesión de Supabase — no toca localStorage global.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[authService] Error al cerrar sesión:', error);
    throw error;
  }
}
