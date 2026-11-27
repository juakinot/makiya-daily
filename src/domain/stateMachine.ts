import type { RequestStatus, Role } from './types';

/** Transiciones válidas de una solicitud y qué rol puede ejecutarlas. */
export const TRANSITIONS: Record<RequestStatus, Partial<Record<RequestStatus, Role[]>>> = {
  en_revision: { propuesta_lista: ['admin'], cancelada: ['client', 'admin'] },
  propuesta_lista: { esperando_maki: ['client', 'admin'], en_revision: ['admin'], cancelada: ['client', 'admin'] },
  esperando_maki: { confirmada: ['maki'], propuesta_lista: ['maki', 'admin'], cancelada: ['client', 'admin'] },
  confirmada: { en_curso: ['maki'], propuesta_lista: ['admin'], cancelada: ['client', 'admin'] },
  en_curso: { evidencia_enviada: ['maki'], cancelada: ['admin'] },
  evidencia_enviada: { completada: ['client'], con_incidencia: ['client'], en_curso: ['admin'] },
  // Incidencia en la conformidad: el admin envía a corrección (en_curso) o determina que no procede
  // (vuelve a evidencia_enviada para que el cliente firme).
  con_incidencia: { en_curso: ['admin'], evidencia_enviada: ['admin'], cancelada: ['admin'] },
  completada: {},
  cancelada: {},
};

export function canTransition(from: RequestStatus, to: RequestStatus, role: Role): boolean {
  return TRANSITIONS[from]?.[to]?.includes(role) ?? false;
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  en_revision: 'En revisión',
  propuesta_lista: 'Propuesta lista',
  esperando_maki: 'Esperando al Maki',
  confirmada: 'Confirmada',
  en_curso: 'En curso',
  evidencia_enviada: 'Por confirmar',
  con_incidencia: 'Con incidencia',
  completada: 'Completada',
  cancelada: 'Cancelada',
};

export const ACTIVE_STATUSES: RequestStatus[] = [
  'en_revision',
  'propuesta_lista',
  'esperando_maki',
  'confirmada',
  'en_curso',
  'evidencia_enviada',
  'con_incidencia',
];

/** Paso visible en el seguimiento del cliente (0–5). */
export function progressStep(status: RequestStatus): number {
  switch (status) {
    case 'en_revision':
    case 'propuesta_lista':
      return 0;
    case 'esperando_maki':
      return 1;
    case 'confirmada':
      return 2;
    case 'en_curso':
      return 3;
    case 'evidencia_enviada':
    case 'con_incidencia':
      return 4;
    case 'completada':
      return 5;
    default:
      return 0;
  }
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
