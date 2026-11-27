import { contributionMargin, round2 } from '@/domain/economics';
import type { Database, ID } from '@/domain/types';
import { hoursBetween } from '@/lib/utils';

/**
 * Métricas de MakiYa (informe cap. 11 + prompt §15).
 * IMPORTANTE: se calculan sobre DATOS DE DEMOSTRACIÓN. No son resultados experimentales.
 */

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const ratio = (a: number, b: number) => (b ? a / b : null);

export interface Metric {
  value: number | null;
  /** fracción legible, p. ej. «11 de 15» (informe 5.2: reportar como fracciones) */
  fraction?: string;
  target?: string;
}

export function northStar(db: Database, now = new Date()) {
  const completed = db.requests.filter((r) => r.status === 'completada');
  const reworkReqIds = new Set(db.incidents.filter((i) => i.countsAsRework || (i.type === 'garantia' && i.status !== 'no_procede')).map((i) => i.requestId));
  const ok = completed.filter((r) => !reworkReqIds.has(r.id));
  const matured = ok.filter((r) => r.warrantyUntil && new Date(r.warrantyUntil) <= now);
  return {
    total: ok.length,
    completed: completed.length,
    matured: matured.length,
    inWarranty: ok.length - matured.length,
    rate: ratio(ok.length, completed.length),
  };
}

export function clientMetrics(db: Database) {
  const submitted = db.requests;
  const durMin = submitted.map((r) => hoursBetween(r.startedAt, r.createdAt) * 60).filter((m) => m >= 0 && m < 120);
  const started = db.events.filter((e) => e.type === 'request_started').length;
  const abandoned = db.events.filter((e) => e.type === 'request_abandoned').length;
  const toProposal = submitted.filter((r) => r.proposalAt).map((r) => hoursBetween(r.createdAt, r.proposalAt!));
  const clarif = new Set(db.events.filter((e) => e.type === 'clarification_needed').map((e) => e.requestId)).size;
  const conf = submitted.map((r) => r.conformity).filter(Boolean) as NonNullable<(typeof submitted)[number]['conformity']>[];
  return {
    requestTimeMin: { value: avg(durMin), target: '≤ 3 min' } as Metric,
    abandonment: { value: ratio(abandoned, started), fraction: `${abandoned} de ${started}` } as Metric,
    timeToProposalH: { value: avg(toProposal), target: '≤ 2 h hábiles' } as Metric,
    clarificationRate: { value: ratio(clarif, submitted.length), fraction: `${clarif} de ${submitted.length}` } as Metric,
    satisfaction: { value: avg(conf.map((c) => c.quality)), target: '≥ 4,0' } as Metric,
    safety: { value: avg(conf.map((c) => c.safety)), target: '≥ 4,0 (H2)' } as Metric,
    fairPrice: { value: avg(conf.map((c) => c.fairPrice)), target: '≥ 4,0 (H3)' } as Metric,
    ease: { value: avg(conf.map((c) => c.ease)), target: '≥ 4,0' } as Metric,
    nps: (() => {
      if (!conf.length) return { value: null } as Metric;
      const p = conf.filter((c) => c.nps >= 9).length;
      const d = conf.filter((c) => c.nps <= 6).length;
      return { value: Math.round(((p - d) / conf.length) * 100), fraction: `${p} promotores, ${d} detractores de ${conf.length}`, target: '≥ +30' } as Metric;
    })(),
  };
}

export function makiMetrics(db: Database, makiId?: ID) {
  const offers = db.requests.flatMap((r) => r.offers.filter((o) => !makiId || o.makiId === makiId).map((o) => ({ ...o, r })));
  const decided = offers.filter((o) => o.status !== 'pendiente');
  const accepted = offers.filter((o) => o.status === 'aceptada');
  const assigned = db.requests.filter((r) => r.assignedMakiId && (!makiId || r.assignedMakiId === makiId));
  const completed = assigned.filter((r) => r.status === 'completada');
  const finished = assigned.filter((r) => ['completada', 'cancelada'].includes(r.status));
  const pays = db.payments.filter((p) => !makiId || p.makiId === makiId);
  const settled = pays.filter((p) => p.settlementId);
  const daysToPay = settled
    .map((p) => {
      const s = db.settlements.find((x) => x.id === p.settlementId);
      return s ? hoursBetween(p.paidAt, s.createdAt) / 24 : null;
    })
    .filter((x): x is number => x !== null && x >= 0);
  const incidents = db.incidents.filter((i) => !makiId || i.makiId === makiId);
  const makis = db.makiProfiles;
  const started = makis.filter((m) => ['habilitado', 'suspendido'].includes(m.status));
  const active = makis.filter((m) => m.status === 'habilitado' && !m.paused);
  const ratings = completed.map((r) => r.conformity?.quality).filter((x): x is number => !!x);
  return {
    acceptanceRate: { value: ratio(accepted.length, decided.length), fraction: `${accepted.length} de ${decided.length}` } as Metric,
    completionRate: { value: ratio(completed.length, finished.length), fraction: `${completed.length} de ${finished.length}` } as Metric,
    netIncome: { value: round2(pays.reduce((a, p) => a + p.makiNet, 0)) } as Metric,
    pendingIncome: { value: round2(pays.filter((p) => !p.settlementId).reduce((a, p) => a + p.makiNet, 0)) } as Metric,
    daysToPayment: { value: avg(daysToPay), target: 'Liquidación semanal' } as Metric,
    incidents: { value: incidents.length, fraction: `${incidents.filter((i) => i.countsAsRework).length} con retrabajo` } as Metric,
    retention: { value: ratio(active.length, started.length), fraction: `${active.length} de ${started.length}`, target: '≥ 75 % (H4)' } as Metric,
    satisfaction: { value: avg(ratings), fraction: `${ratings.length} evaluaciones` } as Metric,
  };
}

export function businessMetrics(db: Database) {
  const s = db.settings;
  const responded = db.requests.filter((r) => r.proposalAt);
  const booked = db.requests.filter((r) => r.scopeApprovedAt);
  const pays = db.payments;
  const revenue = round2(pays.reduce((a, p) => a + p.commission, 0));
  const gmv = round2(pays.reduce((a, p) => a + p.amount, 0));
  const margins = pays.map((p) => {
    const r = db.requests.find((x) => x.id === p.requestId);
    return contributionMargin(p, r?.route === 'evaluador', s);
  });
  const totalMargin = round2(margins.reduce((a, b) => a + b, 0));
  const clientsWithService = new Set(pays.map((p) => p.clientId));
  const repeatClients = [...clientsWithService].filter((c) => pays.filter((p) => p.clientId === c).length >= 2);
  const firstServices = pays.filter((p) => !p.isRepeat).length;
  const avgMargin = avg(margins);

  const byCategory = db.categories
    .filter((c) => c.status === 'activo')
    .map((c) => {
      const ps = pays.filter((p) => db.requests.find((r) => r.id === p.requestId)?.categoryId === c.id);
      const m = ps.map((p) => contributionMargin(p, db.requests.find((r) => r.id === p.requestId)?.route === 'evaluador', s));
      return {
        categoryId: c.id,
        name: c.name,
        services: ps.length,
        gmv: round2(ps.reduce((a, p) => a + p.amount, 0)),
        revenue: round2(ps.reduce((a, p) => a + p.commission, 0)),
        margin: round2(m.reduce((a, b) => a + b, 0)),
        avgMargin: avg(m),
      };
    });

  // Embudo (informe cap. 11): solicitudes → respondidas → reservas → completadas
  const funnel = [
    { label: 'Solicitudes', value: db.requests.length },
    { label: 'Respondidas con Maki y precio', value: responded.length },
    { label: 'Reservas confirmadas', value: booked.length },
    { label: 'Completadas con conformidad', value: db.requests.filter((r) => r.status === 'completada').length },
  ];

  return {
    conversion: { value: ratio(booked.length, responded.length), fraction: `${booked.length} de ${responded.length}`, target: '≥ 40 % (H1)' } as Metric,
    avgTicket: { value: avg(pays.map((p) => p.amount)) } as Metric,
    gmv: { value: gmv } as Metric,
    revenue: { value: revenue } as Metric,
    contributionMargin: { value: totalMargin } as Metric,
    avgContributionMargin: { value: avgMargin, target: '> S/ 0 (H5)' } as Metric,
    cac: { value: firstServices ? s.costs.acquisitionCostFirst : null, target: '≤ S/ 8 (supuesto configurable)' } as Metric,
    clientRetention: { value: ratio(repeatClients.length, clientsWithService.size), fraction: `${repeatClients.length} de ${clientsWithService.size}`, target: '≥ 25 %' } as Metric,
    quoteApproval: (() => {
      const quoted = db.requests.filter((r) => r.quoteVerifiedAt);
      const ok = quoted.filter((r) => r.scopeApprovedAt);
      return { value: ratio(ok.length, quoted.length), fraction: `${ok.length} de ${quoted.length}`, target: '≥ 70 % (H3)' } as Metric;
    })(),
    unauthorizedCharges: { value: db.incidents.filter((i) => i.type === 'cobro' && i.status === 'resuelta').length, target: '0' } as Metric,
    breakEven: { value: avgMargin && avgMargin > 0 ? Math.ceil(s.costs.monthlyFixedCosts / avgMargin) : null } as Metric,
    byCategory,
    funnel,
  };
}

/** Serie semanal de servicios completados (North Star) para gráficos. */
export function weeklyCompleted(db: Database, weeks = 8, now = new Date()) {
  const out: { label: string; value: number }[] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = new Date(now.getTime() - w * 7 * 86_400_000);
    const start = new Date(end.getTime() - 7 * 86_400_000);
    const v = db.requests.filter((r) => r.status === 'completada' && r.conformity && new Date(r.conformity.signedAt) > start && new Date(r.conformity.signedAt) <= end).length;
    out.push({ label: `S-${w}`, value: v });
  }
  return out;
}
