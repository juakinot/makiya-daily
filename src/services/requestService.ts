import { DISTRICTS } from '@/config/catalog';
import { finalAmount, linesTotal, splitPayment } from '@/domain/economics';
import { DomainError } from '@/domain/stateMachine';
import type {
  Conformity,
  Database,
  ID,
  IncidentType,
  Interpretation,
  Payment,
  QuoteLine,
  ServiceRequest,
  SuggestedLine,
  TimeWindow,
  User,
} from '@/domain/types';
import { addDays, addHours, nowISO, slotStart, uid } from '@/lib/utils';
import { isMyMaki } from '@/matching/engine';
import { assertCan, getRequest, log, nextCode, refreshCandidates, transition } from './common';

/* ═════════════════════ CLIENTE ═════════════════════ */

export interface CreateRequestInput {
  description: string;
  photos: string[];
  photoConsent: boolean;
  interpretation: Interpretation;
  classificationConfirmed: boolean;
  answers: Record<string, string>;
  lines: SuggestedLine[];
  district: string;
  addressRef: string;
  preferredDate: string;
  window: TimeWindow;
  startedAt: string;
}

export function validateSchedule(db: Database, date: string, window: TimeWindow, now = new Date()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Elige una fecha.';
  const start = slotStart(date, window);
  if (start.getTime() - now.getTime() < db.settings.minLeadHours * 3_600_000) {
    return `Solo atendemos trabajos programados con al menos ${db.settings.minLeadHours} h de anticipación.`;
  }
  if (start.getDay() === 0) return 'Atendemos de lunes a sábado.';
  return null;
}

export function buildLines(db: Database, lines: SuggestedLine[]): QuoteLine[] {
  return lines.map((l) => {
    const item = db.items.find((i) => i.id === l.itemId);
    if (!item || !item.active) throw new DomainError('El servicio seleccionado no está disponible.');
    const cat = db.categories.find((c) => c.id === item.categoryId);
    if (cat?.status !== 'activo') throw new DomainError(`«${cat?.name}» aún no está disponible para contratar.`);
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > 10) throw new DomainError('La cantidad debe estar entre 1 y 10.');
    return { id: uid('ql'), itemId: item.id, description: item.name, qty: l.qty, unitPrice: item.price };
  });
}

export function createRequest(db: Database, actor: User, input: CreateRequestInput, now = new Date()): ServiceRequest {
  assertCan(actor, 'request:create');
  const desc = input.description.trim();
  if (desc.length < 8) throw new DomainError('Describe tu necesidad con al menos 8 caracteres.');
  if (input.photos.length > 3) throw new DomainError('Puedes adjuntar hasta 3 fotos.');
  if (input.photos.length > 0 && !input.photoConsent) throw new DomainError('Necesitamos tu consentimiento para usar las fotos.');
  if (!DISTRICTS.includes(input.district)) throw new DomainError('Por ahora atendemos solo en los distritos piloto.');
  if (input.interpretation.scope === 'prohibido') throw new DomainError('Este pedido está fuera de nuestras reglas de seguridad.');
  if (input.interpretation.scope === 'futuro') throw new DomainError('Esta categoría aún no está disponible para contratar.');
  const scheduleErr = validateSchedule(db, input.preferredDate, input.window, now);
  if (scheduleErr) throw new DomainError(scheduleErr);

  const human = input.interpretation.needsHumanReview || input.interpretation.customWork || input.lines.length === 0 || !input.classificationConfirmed;
  const lines = input.lines.length ? buildLines(db, input.lines) : [];
  const categoryId = lines[0] ? db.items.find((i) => i.id === lines[0].itemId)!.categoryId : input.interpretation.categoryId;
  const created = now.toISOString();

  const req: ServiceRequest = {
    id: uid('r'),
    code: nextCode(db),
    clientId: actor.id,
    status: human ? 'en_revision' : 'propuesta_lista',
    createdAt: created,
    startedAt: input.startedAt,
    description: desc,
    photos: input.photos,
    photoConsent: input.photoConsent,
    district: input.district,
    addressRef: input.addressRef.trim(),
    preferredDate: input.preferredDate,
    window: input.window,
    interpretation: input.interpretation,
    classificationConfirmed: input.classificationConfirmed,
    answers: input.answers,
    categoryId,
    route: human ? 'evaluador' : 'tarifario',
    lines,
    proposalAt: human ? undefined : created,
    candidates: [],
    offers: [],
    extras: [],
    timeline: [
      {
        at: created,
        type: 'creada',
        label: human ? 'Solicitud creada · un especialista revisará el alcance y el presupuesto' : 'Solicitud creada · precio cerrado del tarifario',
        by: 'client',
      },
    ],
  };
  if (!human) refreshCandidates(db, req);
  db.requests.push(req);
  db.events.push({ id: uid('e'), type: 'request_submitted', at: created, userId: actor.id, requestId: req.id });
  if (input.interpretation.questions.length > 0 || Object.keys(input.answers).length > 0 || human) {
    db.events.push({ id: uid('e'), type: 'clarification_needed', at: created, userId: actor.id, requestId: req.id });
  }
  return req;
}

/** El cliente cambia la fecha/franja (p. ej. cuando no hay Makis disponibles). */
export function reschedule(db: Database, actor: User, requestId: ID, date: string, window: TimeWindow, now = new Date()) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'request:approve_scope', req);
  if (req.status !== 'propuesta_lista') throw new DomainError('Solo puedes cambiar la fecha antes de enviar la oferta.');
  const err = validateSchedule(db, date, window, now);
  if (err) throw new DomainError(err);
  req.preferredDate = date;
  req.window = window;
  log(req, 'reprogramada', 'Fecha o franja actualizada por el cliente', 'client');
  refreshCandidates(db, req);
  return req;
}

/** Aprobación escrita del alcance y precio + elección del Maki → oferta al Maki. */
export function approveAndSendOffer(db: Database, actor: User, requestId: ID, makiId: ID) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'request:approve_scope', req);
  if (req.status !== 'propuesta_lista') throw new DomainError('La propuesta ya no está disponible para aprobar.');
  if (!req.lines.length) throw new DomainError('La propuesta no tiene un alcance definido.');
  const candidates = refreshCandidates(db, req);
  if (!candidates.some((c) => c.makiId === makiId)) {
    throw new DomainError('Ese Maki ya no está disponible en tu franja. Elige otra opción.');
  }
  req.scopeApprovedAt = nowISO();
  req.approvedTotal = linesTotal(req.lines);
  req.selectedMakiId = makiId;
  req.offers.push({ makiId, sentAt: nowISO(), status: 'pendiente' });
  const maki = db.users.find((u) => u.id === makiId);
  transition(req, 'esperando_maki', actor, `Alcance y precio aprobados por escrito (S/ ${req.approvedTotal.toFixed(2)}). Oferta enviada a ${maki?.name ?? 'el Maki'}.`);
  return req;
}

export function cancelRequest(db: Database, actor: User, requestId: ID, reason: string) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'request:cancel', req);
  if (!reason.trim()) throw new DomainError('Indica el motivo de la cancelación.');
  req.offers.forEach((o) => {
    if (o.status === 'pendiente') {
      o.status = 'rechazada';
      o.reason = 'Solicitud cancelada';
      o.respondedAt = nowISO();
    }
  });
  transition(req, 'cancelada', actor, `Cancelada por ${actor.role === 'admin' ? 'MakiYa' : 'el cliente'}: ${reason.trim()}`);
  req.cancellation = { by: actor.role, reason: reason.trim(), at: nowISO() };
  return req;
}

export function decideExtra(db: Database, actor: User, requestId: ID, extraId: ID, approve: boolean) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'request:decide_extra', req);
  if (req.status !== 'en_curso') throw new DomainError('Solo se deciden adicionales durante la visita.');
  const ex = req.extras.find((e) => e.id === extraId);
  if (!ex || ex.status !== 'propuesto') throw new DomainError('Este adicional ya fue decidido.');
  ex.status = approve ? 'aprobado' : 'rechazado';
  ex.decidedAt = nowISO();
  log(
    req,
    'adicional',
    approve
      ? `Adicional aprobado por escrito: ${ex.description} (S/ ${ex.amount.toFixed(2)})`
      : `Adicional rechazado: ${ex.description}. Se mantiene el alcance original.`,
    'client',
  );
  return req;
}

export interface ConformityInput extends Omit<Conformity, 'signedAt'> {}

/** Conformidad del cliente → pago simulado + garantía. El pago SOLO se registra aquí. */
export function confirmConformity(db: Database, actor: User, requestId: ID, input: ConformityInput): Payment {
  const req = getRequest(db, requestId);
  assertCan(actor, 'request:confirm', req);
  if (req.status !== 'evidencia_enviada') throw new DomainError('Aún no hay evidencia de cierre para confirmar.');
  if (!req.evidence) throw new DomainError('Falta la evidencia de cierre.');
  if (input.signedName.trim().length < 3) throw new DomainError('Escribe tu nombre para firmar la conformidad.');
  for (const k of ['quality', 'safety', 'fairPrice', 'ease'] as const) {
    if (!(input[k] >= 1 && input[k] <= 5)) throw new DomainError('Completa todas las evaluaciones (1 a 5).');
  }
  if (!(input.nps >= 0 && input.nps <= 10)) throw new DomainError('Indica qué tan probable es que nos recomiendes (0 a 10).');
  if (req.extras.some((e) => e.status === 'propuesto')) throw new DomainError('Hay un adicional pendiente de decisión.');
  const makiId = req.assignedMakiId!;
  const isRepeat = db.requests.some((r) => r.id !== req.id && r.clientId === req.clientId && r.assignedMakiId === makiId && r.status === 'completada');
  const signedAt = nowISO();
  req.conformity = { ...input, signedName: input.signedName.trim(), comment: input.comment.trim(), signedAt };
  transition(req, 'completada', actor, 'Conformidad firmada por el cliente');

  const split = splitPayment(req, isRepeat, db.settings);
  const payment: Payment = {
    id: uid('p'),
    requestId: req.id,
    clientId: req.clientId,
    makiId,
    amount: split.amount,
    commissionRate: split.rate,
    commission: split.commission,
    makiNet: split.makiNet,
    isRepeat,
    method: 'simulado',
    paidAt: signedAt,
  };
  db.payments.push(payment);
  req.paymentId = payment.id;
  req.warrantyUntil = addDays(signedAt, db.settings.warrantyDays);
  log(req, 'pago', `Pago simulado registrado: S/ ${split.amount.toFixed(2)} · garantía activa ${db.settings.warrantyDays} días`, 'sistema');
  return payment;
}

export function reportIssue(db: Database, actor: User, requestId: ID, type: IncidentType, description: string) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'request:report_issue', req);
  if (description.trim().length < 10) throw new DomainError('Describe el problema con al menos 10 caracteres.');
  const now = nowISO();
  let incType: IncidentType = type;
  if (req.status === 'evidencia_enviada') {
    transition(req, 'con_incidencia', actor, `Problema reportado en la conformidad: ${description.trim()}`);
    incType = type === 'garantia' ? 'conformidad' : type;
  } else if (req.status === 'completada') {
    if (!req.warrantyUntil || new Date(req.warrantyUntil) < new Date()) throw new DomainError('La garantía de este servicio ya venció.');
    incType = type === 'conformidad' ? 'garantia' : type;
    log(req, 'garantia', `Reclamo de garantía registrado: ${description.trim()}`, 'client');
  } else if (['confirmada', 'en_curso'].includes(req.status) && (type === 'seguridad' || type === 'cobro')) {
    log(req, 'incidencia', `Incidencia de ${type} reportada`, 'client');
  } else {
    throw new DomainError('En esta etapa no se pueden reportar problemas.');
  }
  const inc = {
    id: uid('i'),
    requestId: req.id,
    clientId: req.clientId,
    makiId: req.assignedMakiId,
    type: incType,
    description: description.trim(),
    status: 'abierta' as const,
    createdAt: now,
    responseDue: addHours(now, 24),
    fixDue: incType === 'garantia' ? addHours(now, 72) : undefined,
    countsAsRework: false,
  };
  db.incidents.push(inc);
  return inc;
}

export function toggleFavoriteMaki(db: Database, actor: User, makiId: ID) {
  if (actor.role !== 'client') throw new DomainError('Solo los clientes tienen Mi Maki.');
  const home = db.homeProfiles.find((h) => h.clientId === actor.id);
  if (!home) throw new DomainError('Completa tu Perfil del Hogar.');
  const i = home.favoriteMakiIds.indexOf(makiId);
  if (i >= 0) home.favoriteMakiIds.splice(i, 1);
  else home.favoriteMakiIds.push(makiId);
  return home;
}

export function registerInterest(db: Database, actor: User, categoryId: ID, description: string) {
  if (actor.role !== 'client') throw new DomainError('Solo los clientes pueden registrar interés.');
  const it = { id: uid('fi'), clientId: actor.id, categoryId, description: description.trim(), createdAt: nowISO() };
  db.interests.push(it);
  return it;
}

/* ═════════════════════ MAKI ═════════════════════ */

export function respondOffer(db: Database, actor: User, requestId: ID, accept: boolean, reason = '') {
  const req = getRequest(db, requestId);
  assertCan(actor, 'offer:respond', req);
  const offer = req.offers.find((o) => o.makiId === actor.id && o.status === 'pendiente');
  if (!offer || req.status !== 'esperando_maki') throw new DomainError('Esta oferta ya no está disponible.');
  const mp = db.makiProfiles.find((m) => m.userId === actor.id);
  if (!mp || mp.status !== 'habilitado') throw new DomainError('Tu perfil no está habilitado para aceptar trabajos.');
  offer.respondedAt = nowISO();
  if (accept) {
    const clash = db.requests.some(
      (r) => r.id !== req.id && r.assignedMakiId === actor.id && r.preferredDate === req.preferredDate && r.window === req.window && ['confirmada', 'en_curso'].includes(r.status),
    );
    if (clash) throw new DomainError('Ya tienes un trabajo confirmado en esa franja.');
    offer.status = 'aceptada';
    req.assignedMakiId = actor.id;
    req.visitCode = String(Math.floor(1000 + Math.random() * 9000));
    transition(req, 'confirmada', actor, `${actor.name} aceptó el trabajo. Código de Visita Segura generado.`);
  } else {
    if (!reason.trim()) throw new DomainError('Cuéntanos brevemente por qué rechazas (nos ayuda a enviarte mejores oportunidades).');
    offer.status = 'rechazada';
    offer.reason = reason.trim();
    req.selectedMakiId = undefined;
    transition(req, 'propuesta_lista', actor, `${actor.name} no puede tomar el trabajo (${reason.trim()}). Elige otra opción.`);
    refreshCandidates(db, req);
  }
  return req;
}

export function startVisit(db: Database, actor: User, requestId: ID, code: string) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'visit:start', req);
  if (req.status !== 'confirmada') throw new DomainError('Este trabajo no está listo para iniciar.');
  if (code.trim() !== req.visitCode) throw new DomainError('El código no coincide. Pide al cliente que te dicte el código de 4 dígitos de su app.');
  req.startedVisitAt = nowISO();
  transition(req, 'en_curso', actor, 'Visita iniciada · código verificado por el cliente');
  return req;
}

export function proposeExtra(db: Database, actor: User, requestId: ID, input: { kind: 'trabajo' | 'material'; description: string; amount: number; receipt?: string }) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'extra:propose', req);
  if (req.status !== 'en_curso') throw new DomainError('Solo puedes proponer adicionales durante la visita.');
  if (input.description.trim().length < 5) throw new DomainError('Describe el adicional.');
  if (!(input.amount > 0 && input.amount <= 2000)) throw new DomainError('Indica un monto válido.');
  if (input.kind === 'material' && !input.receipt?.trim()) throw new DomainError('Los materiales se cobran al costo con boleta: indica el número de boleta.');
  if (req.extras.some((e) => e.status === 'propuesto')) throw new DomainError('Ya hay un adicional esperando la decisión del cliente.');
  const ex = {
    id: uid('x'),
    kind: input.kind,
    description: input.description.trim(),
    amount: Math.round(input.amount * 100) / 100,
    receipt: input.receipt?.trim(),
    status: 'propuesto' as const,
    proposedAt: nowISO(),
  };
  req.extras.push(ex);
  log(req, 'adicional', `Adicional propuesto (requiere tu aprobación): ${ex.description} · S/ ${ex.amount.toFixed(2)}`, 'maki');
  return ex;
}

export function submitEvidence(db: Database, actor: User, requestId: ID, input: { photos: string[]; checklist: { label: string; ok: boolean }[]; notes: string }) {
  const req = getRequest(db, requestId);
  assertCan(actor, 'evidence:submit', req);
  if (req.status !== 'en_curso') throw new DomainError('Inicia la visita antes de enviar evidencia.');
  if (input.photos.length < 1) throw new DomainError('Adjunta al menos una foto del trabajo terminado (solo la zona de trabajo).');
  if (input.photos.length > 4) throw new DomainError('Máximo 4 fotos.');
  if (!input.checklist.length || input.checklist.some((c) => !c.ok)) throw new DomainError('Completa toda la prueba de cierre antes de enviar.');
  if (req.extras.some((e) => e.status === 'propuesto')) throw new DomainError('Hay un adicional esperando la decisión del cliente.');
  req.evidence = { photos: input.photos, checklist: input.checklist, notes: input.notes.trim(), submittedAt: nowISO() };
  // Si había una incidencia en corrección, queda resuelta con la nueva evidencia.
  db.incidents
    .filter((i) => i.requestId === req.id && i.status === 'en_correccion' && i.type !== 'garantia')
    .forEach((i) => {
      i.status = 'resuelta';
      i.resolvedAt = nowISO();
      i.resolution = (i.resolution ? i.resolution + ' · ' : '') + 'Corrección realizada y nueva evidencia enviada.';
    });
  transition(req, 'evidencia_enviada', actor, `Evidencia de cierre enviada (${input.photos.length} foto/s, prueba de cierre completa). Total a confirmar: S/ ${finalAmount(req).toFixed(2)}`);
  return req;
}

export function isRepeatFor(db: Database, req: ServiceRequest, makiId: ID) {
  return isMyMaki(db, req.clientId, makiId) && db.requests.some((r) => r.id !== req.id && r.clientId === req.clientId && r.assignedMakiId === makiId && r.status === 'completada');
}
