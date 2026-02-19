/**
 * admin/src/types/auth.ts
 * Tipos de autenticación y roles
 */

export type UserRoleType = 'super_admin' | 'propietario';

export interface SuperAdmin {
  user_id: string;
  nombre: string;
  email: string;
  created_at: string;
  /** 'admin' = superadmin principal con todos los permisos.
   *  'pasante' = acceso limitado a sus propios locales. */
  nivel: 'admin' | 'pasante';
}

export interface Propietario {
  id: string;
  email: string;
  nombre_completo: string | null;
  rol: 'propietario';
  local_asignado_id: string | null;
  plan?: string;
  plan_vence_en?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  type: UserRoleType;
  data: SuperAdmin | Propietario;
  permissions: Permission[];
}

export type Permission = 
  | 'create_local'
  | 'read_all_locales'
  | 'update_all_locales'
  | 'delete_local'
  | 'manage_users'
  | 'generate_codes'
  | 'update_own_local'
  | 'read_own_local';

export const PERMISSIONS: Record<UserRoleType, Permission[]> = {
  super_admin: [
    'create_local',
    'read_all_locales',
    'update_all_locales',
    'delete_local',
    'manage_users',
    'generate_codes',
  ],
  propietario: [
    'read_own_local',
    'update_own_local',
  ],
};
