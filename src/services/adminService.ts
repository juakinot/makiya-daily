import { DomainError } from '@/domain/stateMachine';
import type { Database, ID, IncidentStatus, MakiStatus, QuoteLine, ServiceItem, Settings, User, Verification } from '@/domain/types';
import { linesTotal, round2 } from '@/domain/economics';
import { priceCap } from '@/domain/pricing';
import { nowISO, uid } from '@/lib/utils';
import { checkEligibility } from '@/matching/engine';
import { assertCan, getRequest, log, refreshCandidates, transition } from './common';

/** Evaluador: fija/verifica el presupuesto (vía 2) o reclasifica una solicitud en revisión. */
export function verifyQuote(db: Database, actor: User, requestId: ID, input: { categoryId: ID; lines: Omit<QuoteLine, 'id'>[]; note?: string }) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'quote:verify', req);
  if (req.status !== 'en_revision') throw new DomainError('Solo se verifican solicitudes en revisión.');
  const cat = db.categories.find((c) => c.id === input.categoryId);
  if (!cat || cat.status !== 'activo') throw new DomainError('La categoría debe estar activa en el MVP.');
  if (!input.lines.length) throw new DomainError('Agrega al menos una línea al presupuesto.');
  for (const l of input.lines) {
    if (!l.description.trim()) throw new DomainError('Cada línea necesita una descripción.');
    if (!(l.qty >= 1 && l.qty <= 10)) throw new DomainError('Cantidad inválida.');
    if (!(l.unitPrice > 0)) throw new DomainError('Precio inválido.');
    if (l.itemId) {
      const it = db.items.find((i) => i.id === l.itemId);
      if (!it) throw new DomainError('Servicio inexistente.');
    }
  }
  req.categoryId = input.categoryId;
  req.lines = input.lines.map((l) => ({ ...l, id: uid('ql'), description: l.description.trim(), unitPrice: round2(l.unitPrice) }));
  req.route = req.lines.some((l) => !l.itemId) || req.interpretation.customWork ? 'evaluador' : 'tarifario';
  req.quoteVerifiedBy = actor.id;
  req.quoteVerifiedAt = nowISO();
  req.proposalAt = nowISO();
  req.classificationConfirmed = true;
  refreshCandidates(db, req);
  transition(
    req,
    'propuesta_lista',
    actor,
    `Presupuesto verificado por MakiYa: S/ ${linesTotal(req.lines).toFixed(2)}${input.note?.trim() ? ` · ${input.note.trim()}` : ''}`,
  );
  return req;
}

/**
 * Reenvía la oferta a otro Maki compatible. Requiere que el cliente YA haya aprobado
 * alcance y precio, y el Maki igual debe aceptar (nunca se asigna sin consentimiento).
 */
export function reassignOffer(db: Database, actor: User, requestId: ID, makiId: ID) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'request:reassign', req);
  if (!['propuesta_lista', 'confirmada'].includes(req.status)) throw new DomainError('Solo se reasigna una propuesta sin Maki o una visita confirmada.');
  if (!req.scopeApprovedAt) throw new DomainError('El cliente aún no aprobó el alcance y el precio.');
  const mp = db.makiProfiles.find((m) => m.userId === makiId);
  if (!mp) throw new DomainError('Maki inexistente.');
  if (req.status === 'confirmada') {
    // Libera al Maki anterior
    const prev = req.offers.find((o) => o.makiId === req.assignedMakiId && o.status === 'aceptada');
    if (prev) {
      prev.status = 'rechazada';
      prev.reason = 'Reasignado por MakiYa';
    }
    req.assignedMakiId = undefined;
    req.visitCode = undefined;
    transition(req, 'propuesta_lista', actor, 'MakiYa liberó la asignación anterior');
  }
  const el = checkEligibility(db, req, mp);
  if (!el.eligible) throw new DomainError('Ese Maki no es compatible con la solicitud (especialidad, zona, disponibilidad o estado).');
  req.selectedMakiId = makiId;
  req.offers.push({ makiId, sentAt: nowISO(), status: 'pendiente' });
  const u = db.users.find((x) => x.id === makiId);
  transition(req, 'esperando_maki', actor, `MakiYa envió la oferta a ${u?.name}. Debe aceptarla.`);
  return req;
}

export function returnToReview(db: Database, actor: User, requestId: ID, reason: string) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'quote:verify', req);
  if (req.status !== 'propuesta_lista') throw new DomainError('Solo se devuelven a revisión propuestas no aprobadas.');
  req.route = 'evaluador';
  transition(req, 'en_revision', actor, `Devuelta a revisión: ${reason || 'ajuste de alcance'}`);
  return req;
}

export function evaluateMaki(db: Database, actor: User, makiId: ID, v: Omit<Verification, 'reviewedBy' | 'reviewedAt'>, decision: 'habilitar' | 'rechazar' | 'guardar') {
  assertCan(actor, 'maki:evaluate');
  const mp = db.makiProfiles.find((m) => m.userId === makiId);
  if (!mp) throw new DomainError('Maki inexistente.');
  if (v.tradeTestScore !== null && !(v.tradeTestScore >= 0 && v.tradeTestScore <= 20)) throw new DomainError('El puntaje de la prueba de oficio va de 0 a 20.');
  mp.verification = { ...v, reviewedBy: actor.id, reviewedAt: nowISO() };
  if (decision === 'habilitar') {
    if (!v.identity || !v.background || !v.references) throw new DomainError('Para habilitar se requieren las 4 capas: identidad, antecedentes, referencias y prueba de oficio.');
    if ((v.tradeTestScore ?? 0) < db.settings.tradeTestMin) throw new DomainError(`La prueba de oficio requiere al menos ${db.settings.tradeTestMin}/20.`);
    mp.status = 'habilitado';
  } else if (decision === 'rechazar') {
    mp.status = 'rechazado';
  } else if (mp.status === 'postulante') {
    mp.status = 'en_evaluacion';
  }
  return mp;
}

export function setMakiStatus(db: Database, actor: User, makiId: ID, status: Extract<MakiStatus, 'suspendido' | 'habilitado'>, reason: string) {
  assertCan(actor, 'maki:set_status');
  const mp = db.makiProfiles.find((m) => m.userId === makiId);
  if (!mp) throw new DomainError('Maki inexistente.');
  if (status === 'habilitado' && mp.status !== 'suspendido') throw new DomainError('Solo se reactiva a un Maki suspendido.');
  if (status === 'suspendido' && !reason.trim()) throw new DomainError('Indica el motivo de la suspensión.');
  mp.status = status;
  mp.verification.notes = reason.trim() || mp.verification.notes;
  return mp;
}

export function resolveIncident(db: Database, actor: User, incidentId: ID, input: { status: IncidentStatus; resolution: string; countsAsRework: boolean }) {
  assertCan(actor, 'incident:resolve');
  const inc = db.incidents.find((i) => i.id === incidentId);
  if (!inc) throw new DomainError('Incidencia inexistente.');
  if (['resuelta', 'no_procede'].includes(inc.status)) throw new DomainError('La incidencia ya está cerrada.');
  if (!input.resolution.trim()) throw new DomainError('Registra la decisión o acción tomada.');
  const req = getRequest(db, inc.requestId);
  inc.resolution = input.resolution.trim();
  inc.countsAsRework = input.countsAsRework;
  inc.status = input.status;
  if (input.status === 'resuelta' || input.status === 'no_procede') inc.resolvedAt = nowISO();

  if (req.status === 'con_incidencia') {
    if (input.status === 'en_correccion') {
      req.evidence = undefined;
      transition(req, 'en_curso', actor, `MakiYa envió el trabajo a corrección: ${inc.resolution}`);
    } else if (input.status === 'no_procede' || input.status === 'resuelta') {
      transition(req, 'evidencia_enviada', actor, `Incidencia revisada (${input.status === 'no_procede' ? 'no procede' : 'resuelta'}): ${inc.resolution}. Puedes firmar la conformidad.`);
    }
  } else {
    log(req, 'incidencia', `Incidencia ${input.status.replace('_', ' ')}: ${inc.resolution}`, 'admin');
  }
  return inc;
}

export function createSettlement(db: Database, actor: User, makiId: ID) {
  assertCan(actor, 'settlement:create');
  const pending = db.payments.filter((p) => p.makiId === makiId && !p.settlementId);
  if (!pending.length) throw new DomainError('Este Maki no tiene pagos pendientes de liquidar.');
  const s = {
    id: uid('s'),
    makiId,
    paymentIds: pending.map((p) => p.id),
    total: round2(pending.reduce((a, p) => a + p.makiNet, 0)),
    createdAt: nowISO(),
    createdBy: actor.id,
    method: 'simulado' as const,
  };
  pending.forEach((p) => (p.settlementId = s.id));
  db.settlements.push(s);
  return s;
}

export function updateItem(db: Database, actor: User, itemId: ID, patch: Partial<Pick<ServiceItem, 'price' | 'durationMin' | 'includes' | 'excludes' | 'active' | 'name'>>) {
  assertCan(actor, 'catalog:edit');
  const it = db.items.find((i) => i.id === itemId);
  if (!it) throw new DomainError('Servicio inexistente.');
  if (patch.price !== undefined && !(patch.price > 0 && patch.price < 5000)) throw new DomainError('Precio inválido.');
  if (patch.price !== undefined) {
    const cap = priceCap(it, db.settings);
    if (cap !== null && patch.price > cap) {
      throw new DomainError(`El precio supera el tope de +${Math.round(db.settings.priceCapOverReference * 100)} % sobre la referencia de mercado (máximo S/ ${cap.toFixed(2)}).`);
    }
  }
  if (patch.durationMin !== undefined && !(patch.durationMin >= 15)) throw new DomainError('Duración mínima: 15 minutos.');
  if (patch.active) {
    const cat = db.categories.find((c) => c.id === it.categoryId);
    if (cat?.status !== 'activo') throw new DomainError('No se puede activar un servicio de una categoría futura.');
  }
  Object.assign(it, patch);
  return it;
}

export function updateSettings(db: Database, actor: User, patch: Partial<Settings>) {
  assertCan(actor, 'settings:edit');
  const next = {
    ...db.settings,
    ...patch,
    costs: { ...db.settings.costs, ...(patch.costs ?? {}) },
    matchingWeights: { ...db.settings.matchingWeights, ...(patch.matchingWeights ?? {}) },
    ladder: { ...db.settings.ladder, ...(patch.ladder ?? {}), minCompletedByStep: { ...db.settings.ladder.minCompletedByStep, ...(patch.ladder?.minCompletedByStep ?? {}) } },
  };
  for (const r of [next.commissionFirst, next.commissionRepeat]) {
    if (!(r >= 0 && r <= 0.5)) throw new DomainError('La comisión debe estar entre 0 % y 50 %.');
  }
  if (!(next.aiConfidenceThreshold > 0 && next.aiConfidenceThreshold < 1)) throw new DomainError('El umbral de confianza debe estar entre 0 y 1.');
  if (!(next.maxCandidates >= 1 && next.maxCandidates <= 3)) throw new DomainError('Se muestran entre 1 y 3 Makis.');
  if (!(next.priceCapOverReference >= 0 && next.priceCapOverReference <= 0.5)) throw new DomainError('El tope sobre la referencia debe estar entre 0 % y 50 %.');
  const steps = next.ladder.minCompletedByStep;
  if (!(steps[2] > 0 && steps[2] <= steps[3] && steps[3] <= steps[4] && steps[4] <= steps[5])) throw new DomainError('Los umbrales de la escalera deben ser positivos y crecientes.');
  db.settings = next;
  return next;
}
