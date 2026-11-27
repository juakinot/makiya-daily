import { can, type Action } from '@/auth/permissions';
import { canTransition, DomainError, STATUS_LABEL } from '@/domain/stateMachine';
import type { Database, ID, RequestStatus, Role, ServiceRequest, User } from '@/domain/types';
import { nowISO } from '@/lib/utils';
import { recommendMakis } from '@/matching/engine';

export function getRequest(db: Database, id: ID): ServiceRequest {
  const r = db.requests.find((x) => x.id === id);
  if (!r) throw new DomainError('La solicitud no existe.');
  return r;
}

export function getUser(db: Database, id: ID): User {
  const u = db.users.find((x) => x.id === id);
  if (!u) throw new DomainError('El usuario no existe.');
  return u;
}

export function assertCan(actor: User, action: Action, req?: ServiceRequest) {
  if (!can(actor, action, req)) throw new DomainError('No tienes permiso para realizar esta acción.');
}

export function transition(req: ServiceRequest, to: RequestStatus, actor: User, label: string) {
  if (!canTransition(req.status, to, actor.role)) {
    throw new DomainError(`No se puede pasar de «${STATUS_LABEL[req.status]}» a «${STATUS_LABEL[to]}».`);
  }
  req.status = to;
  log(req, to, label, actor.role);
}

export function log(req: ServiceRequest, type: string, label: string, by: Role | 'sistema') {
  req.timeline.push({ at: nowISO(), type, label, by });
}

export function refreshCandidates(db: Database, req: ServiceRequest) {
  req.candidates = recommendMakis(db, req).candidates;
  return req.candidates;
}

export function nextCode(db: Database): string {
  db.seq += 1;
  return `MK-${db.seq}`;
}
