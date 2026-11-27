import type { Role, ServiceRequest, User } from '@/domain/types';

/**
 * Política de acceso por rol (espejo de las políticas RLS de supabase/schema.sql).
 * Los servicios de dominio la consultan antes de cada operación; la UI la usa para
 * proteger rutas. En producción, la autoridad final es la base de datos (RLS).
 */
export type Action =
  | 'request:create'
  | 'request:view'
  | 'request:approve_scope'
  | 'request:cancel'
  | 'request:decide_extra'
  | 'request:confirm'
  | 'request:report_issue'
  | 'offer:respond'
  | 'visit:start'
  | 'extra:propose'
  | 'evidence:submit'
  | 'quote:verify'
  | 'request:reassign'
  | 'maki:evaluate'
  | 'maki:set_status'
  | 'incident:resolve'
  | 'settlement:create'
  | 'catalog:edit'
  | 'settings:edit'
  | 'analytics:view'
  | 'users:list';

const ROLE_ACTIONS: Record<Role, Action[]> = {
  client: ['request:create', 'request:view', 'request:approve_scope', 'request:cancel', 'request:decide_extra', 'request:confirm', 'request:report_issue'],
  maki: ['request:view', 'offer:respond', 'visit:start', 'extra:propose', 'evidence:submit'],
  admin: [
    'request:view', 'request:cancel', 'quote:verify', 'request:reassign', 'maki:evaluate', 'maki:set_status', 'incident:resolve',
    'settlement:create', 'catalog:edit', 'settings:edit', 'analytics:view', 'users:list',
  ],
};

export function roleCan(role: Role, action: Action): boolean {
  return ROLE_ACTIONS[role].includes(action);
}

/** Pertenencia: el cliente solo ve lo suyo; el Maki solo lo que le ofrecieron o le asignaron. */
export function canAccessRequest(user: User, req: ServiceRequest): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'client') return req.clientId === user.id;
  return req.assignedMakiId === user.id || req.offers.some((o) => o.makiId === user.id);
}

export function can(user: User | null | undefined, action: Action, req?: ServiceRequest): boolean {
  if (!user) return false;
  if (!roleCan(user.role, action)) return false;
  if (req && !canAccessRequest(user, req)) return false;
  if (req && user.role === 'maki' && ['visit:start', 'extra:propose', 'evidence:submit'].includes(action)) {
    return req.assignedMakiId === user.id;
  }
  return true;
}

export const HOME_BY_ROLE: Record<Role, string> = { client: '/app', maki: '/maki', admin: '/admin' };
