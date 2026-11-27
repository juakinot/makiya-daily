import type { Candidate, Database, ID, MakiProfile, ServiceRequest, TimeWindow, Weekday } from '@/domain/types';

/**
 * Motor de asignación (informe 8.2, Tabla 19).
 * 1) Filtros de elegibilidad  2) Puntaje ponderado  3) 1–3 opciones con razones.
 * El motor RECOMIENDA. La asignación solo se concreta cuando el Maki acepta.
 */

export interface MakiStats {
  makiId: ID;
  completed: number;
  completedInCategory: number;
  ratingAvg: number | null;
  ratingCount: number;
  bayesRating: number; // 1–5
  reworkCount: number;
  incidentCount: number;
  unauthorizedCharges: number;
  offersReceived: number;
  offersAccepted: number;
  qualityScore: number; // 0–1
}

const PRIOR_MEAN = 4.0;
const PRIOR_WEIGHT = 5;

export function makiStats(db: Database, makiId: ID, categoryId?: ID): MakiStats {
  const done = db.requests.filter((r) => r.assignedMakiId === makiId && r.status === 'completada');
  const ratings = done.map((r) => r.conformity?.quality).filter((x): x is number => typeof x === 'number');
  const sum = ratings.reduce((a, b) => a + b, 0);
  const incidents = db.incidents.filter((i) => i.makiId === makiId);
  const rework = incidents.filter((i) => i.countsAsRework).length;
  const unauthorized = incidents.filter((i) => i.type === 'cobro' && i.status === 'resuelta').length;
  const offers = db.requests.flatMap((r) => r.offers.filter((o) => o.makiId === makiId));
  const n = Math.max(done.length, 1);
  return {
    makiId,
    completed: done.length,
    completedInCategory: categoryId ? done.filter((r) => r.categoryId === categoryId).length : done.length,
    ratingAvg: ratings.length ? sum / ratings.length : null,
    ratingCount: ratings.length,
    bayesRating: (PRIOR_MEAN * PRIOR_WEIGHT + sum) / (PRIOR_WEIGHT + ratings.length),
    reworkCount: rework,
    incidentCount: incidents.length,
    unauthorizedCharges: unauthorized,
    offersReceived: offers.length,
    offersAccepted: offers.filter((o) => o.status === 'aceptada').length,
    qualityScore: done.length === 0 ? 0.8 : Math.max(0, 1 - (rework + incidents.length * 0.5 + unauthorized * 2) / n),
  };
}

export function weekdayOf(dateISO: string): Weekday {
  const [y, m, d] = dateISO.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() as Weekday;
}

export function isSlotTaken(db: Database, makiId: ID, date: string, window: TimeWindow, exceptRequestId?: ID): boolean {
  return db.requests.some(
    (r) =>
      r.id !== exceptRequestId &&
      r.assignedMakiId === makiId &&
      r.preferredDate === date &&
      r.window === window &&
      ['confirmada', 'en_curso'].includes(r.status),
  );
}

export function requiredCategories(db: Database, req: ServiceRequest): ID[] {
  const fromLines = req.lines.map((l) => db.items.find((i) => i.id === l.itemId)?.categoryId).filter((c): c is ID => !!c);
  return [...new Set(fromLines.length ? fromLines : req.categoryId ? [req.categoryId] : [])];
}

export type ExclusionReason = 'no_habilitado' | 'pausado' | 'especialidad' | 'zona' | 'disponibilidad' | 'agenda_ocupada' | 'rechazo_previo';

export interface EligibilityResult {
  makiId: ID;
  eligible: boolean;
  reason?: ExclusionReason;
}

export function checkEligibility(db: Database, req: ServiceRequest, mp: MakiProfile): EligibilityResult {
  const base = { makiId: mp.userId };
  if (mp.status !== 'habilitado') return { ...base, eligible: false, reason: 'no_habilitado' };
  if (mp.paused) return { ...base, eligible: false, reason: 'pausado' };
  // Debe dominar TODAS las categorías del alcance (p. ej. armado + instalación).
  const cats = requiredCategories(db, req);
  if (!cats.length || cats.some((c) => !mp.specialties.includes(c))) return { ...base, eligible: false, reason: 'especialidad' };
  if (!mp.districts.includes(req.district)) return { ...base, eligible: false, reason: 'zona' };
  const wd = weekdayOf(req.preferredDate);
  if (!(mp.availability[wd] ?? []).includes(req.window)) return { ...base, eligible: false, reason: 'disponibilidad' };
  if (isSlotTaken(db, mp.userId, req.preferredDate, req.window, req.id)) return { ...base, eligible: false, reason: 'agenda_ocupada' };
  if (req.offers.some((o) => o.makiId === mp.userId && o.status === 'rechazada')) return { ...base, eligible: false, reason: 'rechazo_previo' };
  return { ...base, eligible: true };
}

export const EXCLUSION_LABEL: Record<ExclusionReason, string> = {
  no_habilitado: 'No habilitado',
  pausado: 'Pausó solicitudes',
  especialidad: 'Sin la especialidad',
  zona: 'Fuera de su zona',
  disponibilidad: 'Sin disponibilidad en la franja',
  agenda_ocupada: 'Agenda ocupada',
  rechazo_previo: 'Rechazó esta solicitud',
};

export function isMyMaki(db: Database, clientId: ID, makiId: ID): boolean {
  const home = db.homeProfiles.find((h) => h.clientId === clientId);
  if (home?.favoriteMakiIds.includes(makiId)) return true;
  return db.requests.some((r) => r.clientId === clientId && r.assignedMakiId === makiId && r.status === 'completada');
}

export function scoreMaki(db: Database, req: ServiceRequest, mp: MakiProfile): Candidate {
  const w = db.settings.matchingWeights;
  const st = makiStats(db, mp.userId, req.categoryId);
  const mine = isMyMaki(db, req.clientId, mp.userId);
  const ratingN = (st.bayesRating - 1) / 4;
  const expN = Math.min(mp.experienceYears / 10, 1) * 0.5 + Math.min(st.completedInCategory / 20, 1) * 0.5;
  const tradeN = (mp.verification.tradeTestScore ?? 0) / 20;
  const totalW = w.quality + w.rating + w.experience + w.tradeTest;
  let score = (w.quality * st.qualityScore + w.rating * ratingN + w.experience * expN + w.tradeTest * tradeN) / (totalW || 1);
  if (mine) score += w.affinity;
  const isNew = st.completed < 3;

  const reasons: string[] = [];
  if (mine) reasons.push('Es tu Maki: ya trabajó en tu hogar');
  if (st.ratingCount > 0) reasons.push(`${st.ratingAvg!.toFixed(1)} ★ en ${st.ratingCount} trabajo${st.ratingCount === 1 ? '' : 's'} evaluado${st.ratingCount === 1 ? '' : 's'}`);
  if (st.completedInCategory > 0) reasons.push(`${st.completedInCategory} servicio${st.completedInCategory === 1 ? '' : 's'} de esta categoría en MakiYa`);
  reasons.push(`Prueba de oficio ${mp.verification.tradeTestScore}/20 · ${mp.experienceYears} años de experiencia`);
  if (st.completed > 0 && st.reworkCount === 0) reasons.push('Sin retrabajos registrados');
  if (isNew) reasons.push('Nuevo en MakiYa: verificado y con prueba de oficio aprobada');
  reasons.push(`Atiende ${req.district} y está disponible en tu franja`);

  return { makiId: mp.userId, score: Math.round(score * 1000) / 1000, reasons, isNewMaki: isNew, isMyMaki: mine };
}

export interface MatchResult {
  candidates: Candidate[];
  evaluated: { makiId: ID; eligible: boolean; reason?: ExclusionReason; score?: number }[];
}

export function recommendMakis(db: Database, req: ServiceRequest): MatchResult {
  const evaluated: MatchResult['evaluated'] = [];
  const scored: Candidate[] = [];
  for (const mp of db.makiProfiles) {
    const el = checkEligibility(db, req, mp);
    if (!el.eligible) {
      evaluated.push(el);
      continue;
    }
    const c = scoreMaki(db, req, mp);
    scored.push(c);
    evaluated.push({ makiId: mp.userId, eligible: true, score: c.score });
  }
  scored.sort((a, b) => b.score - a.score);
  const max = db.settings.maxCandidates;
  let top = scored.slice(0, max);
  // Cupo de oportunidad para Makis nuevos (informe 8.2).
  if (db.settings.newMakiSlot && top.length === max && !top.some((c) => c.isNewMaki)) {
    const newcomer = scored.slice(max).find((c) => c.isNewMaki);
    if (newcomer) top = [...top.slice(0, max - 1), newcomer];
  }
  return { candidates: top, evaluated };
}
