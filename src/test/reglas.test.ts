import { interpretRequest } from '@/ai';
import { SimulatedRulesProvider } from '@/ai/simulatedProvider';
import { contributionMargin, splitPayment } from '@/domain/economics';
import { canTransition } from '@/domain/stateMachine';
import type { Database, ServiceRequest, User } from '@/domain/types';
import { checkEligibility, recommendMakis } from '@/matching/engine';
import { evaluateMaki, reassignOffer, resolveIncident, updateItem, updateSettings, verifyQuote } from '@/services/adminService';
import { registerUser } from '@/services/accountService';
import {
  approveAndSendOffer,
  cancelRequest,
  confirmConformity,
  createRequest,
  decideExtra,
  proposeExtra,
  reportIssue,
  respondOffer,
  startVisit,
  submitEvidence,
} from '@/services/requestService';
import { dateOnlyPlus } from '@/lib/utils';
import { freshDb, futureWorkday, userBy } from './helpers';

const sim = new SimulatedRulesProvider(0);
const ctx = (db: Database) => ({ categories: db.categories, items: db.items, confidenceThreshold: db.settings.aiConfidenceThreshold });

async function newRequest(db: Database, client: User, text: string, district = 'San Miguel', window: 'manana' | 'mediodia' | 'tarde' = 'manana') {
  const ai = await interpretRequest({ text, photoCount: 0 }, ctx(db), sim);
  return createRequest(db, client, {
    description: text, photos: [], photoConsent: false, interpretation: ai, classificationConfirmed: true, answers: {},
    lines: ai.suggestedLines, district, addressRef: '', preferredDate: futureWorkday(3), window, startedAt: new Date().toISOString(),
  });
}

async function toInProgress(db: Database): Promise<{ req: ServiceRequest; client: User; maki: User }> {
  const client = userBy(db, 'valeria@makiya.demo');
  const req = await newRequest(db, client, 'Armar un escritorio');
  const maki = userBy(db, 'rosa@makiya.demo');
  approveAndSendOffer(db, client, req.id, maki.id);
  respondOffer(db, maki, req.id, true);
  startVisit(db, maki, req.id, req.visitCode!);
  return { req, client, maki };
}

describe('IA simulada (adaptador + guardrails)', () => {
  it('clasifica y extrae cantidades', async () => {
    const db = freshDb();
    const r = await interpretRequest({ text: 'Quiero instalar dos repisas y un toallero en el baño', photoCount: 1 }, ctx(db), sim);
    expect(r.isSimulated).toBe(true);
    const ids = r.suggestedLines.map((l) => l.itemId);
    expect(ids).toContain('inst-repisa');
    expect(ids).toContain('inst-bano');
    expect(r.suggestedLines.find((l) => l.itemId === 'inst-repisa')!.qty).toBe(2);
    expect(r.questions.length).toBeLessThanOrEqual(2);
  });
  it('pregunta información faltante (máx. 2)', async () => {
    const db = freshDb();
    const r = await interpretRequest({ text: 'Instalar mi televisor en la pared', photoCount: 0 }, ctx(db), sim);
    expect(r.questions.map((q) => q.id)).toEqual(['tv_pulgadas', 'pared']);
  });
  it('detecta categorías futuras sin habilitarlas', async () => {
    const db = freshDb();
    const r = await interpretRequest({ text: 'El caño de la cocina gotea mucho', photoCount: 0 }, ctx(db), sim);
    expect(r.scope).toBe('futuro');
    expect(r.futureCategoryId).toBe('gasfiteria');
    expect(r.suggestedLines).toHaveLength(0);
  });
  it('rechaza pedidos prohibidos por seguridad', async () => {
    const db = freshDb();
    const r = await interpretRequest({ text: 'Necesito cambiar el tablero eléctrico', photoCount: 0 }, ctx(db), sim);
    expect(r.scope).toBe('prohibido');
  });
  it('trabajo a medida → revisión humana', async () => {
    const db = freshDb();
    const r = await interpretRequest({ text: 'Armar un ropero y cortar una pieza a medida', photoCount: 0 }, ctx(db), sim);
    expect(r.needsHumanReview).toBe(true);
  });
  it('orientación honesta: autoservicio', async () => {
    const db = freshDb();
    const r = await interpretRequest({ text: 'Tengo un tornillo suelto en la cómoda', photoCount: 0 }, ctx(db), sim);
    expect(r.scope).toBe('autoservicio');
    expect(r.selfHelpTip).toBeTruthy();
  });
  it('si el proveedor falla, deriva a humano', async () => {
    const db = freshDb();
    const broken = { id: 'x', label: 'x', isSimulated: false, interpret: async () => { throw new Error('down'); } };
    const r = await interpretRequest({ text: 'Armar cama', photoCount: 0 }, ctx(db), broken);
    expect(r.needsHumanReview).toBe(true);
  });
  it('la IA no puede sugerir servicios inactivos', async () => {
    const db = freshDb();
    const fake = { id: 'f', label: 'f', isSimulated: false, interpret: async () => ({ ...(await sim.interpret({ text: 'Armar cama', photoCount: 0 }, ctx(db))), suggestedLines: [{ itemId: 'gasfiteria-grifo', qty: 1 }] }) };
    const r = await interpretRequest({ text: 'Armar cama', photoCount: 0 }, ctx(db), fake);
    expect(r.suggestedLines).toHaveLength(0);
    expect(r.needsHumanReview).toBe(true);
  });
});

describe('Motor de asignación', () => {
  it('filtra por especialidad, zona, habilitación y disponibilidad', async () => {
    const db = freshDb();
    const req = await newRequest(db, userBy(db, 'valeria@makiya.demo'), 'Armar un ropero de 2 puertas');
    const luis = db.makiProfiles.find((m) => m.userId === 'u_luis')!;
    expect(checkEligibility(db, req, luis).reason).toBe('especialidad');
    const martin = db.makiProfiles.find((m) => m.userId === 'u_martin')!;
    expect(checkEligibility(db, req, martin).reason).toBe('no_habilitado');
    req.district = 'Lince';
    const rosa = db.makiProfiles.find((m) => m.userId === 'u_rosa')!;
    expect(checkEligibility(db, req, rosa).reason).toBe('zona');
  });
  it('excluye Makis con la franja ya ocupada', async () => {
    const db = freshDb();
    const conf = db.requests.find((r) => r.status === 'confirmada' && r.assignedMakiId === 'u_rosa')!;
    const req = await newRequest(db, userBy(db, 'mateo@makiya.demo'), 'Armar una cama');
    req.preferredDate = conf.preferredDate;
    req.window = conf.window;
    const rosa = db.makiProfiles.find((m) => m.userId === 'u_rosa')!;
    expect(checkEligibility(db, req, rosa).reason).toBe('agenda_ocupada');
  });
  it('reserva un cupo para Makis nuevos y muestra razones', async () => {
    const db = freshDb();
    const req = await newRequest(db, userBy(db, 'mateo@makiya.demo'), 'Armar una cama');
    const { candidates } = recommendMakis(db, req);
    expect(candidates.some((c) => c.isNewMaki)).toBe(true);
    expect(candidates.every((c) => c.reasons.length > 0)).toBe(true);
  });
  it('el rechazo del Maki vuelve a propuesta y lo excluye', async () => {
    const db = freshDb();
    const client = userBy(db, 'mateo@makiya.demo');
    const req = await newRequest(db, client, 'Armar una cama');
    const first = req.candidates[0].makiId;
    approveAndSendOffer(db, client, req.id, first);
    expect(() => respondOffer(db, userBy(db, 'jhon@makiya.demo'), req.id, true)).toThrow();
    respondOffer(db, db.users.find((u) => u.id === first)!, req.id, false, 'Tengo otro compromiso');
    expect(req.status).toBe('propuesta_lista');
    expect(req.candidates.some((c) => c.makiId === first)).toBe(false);
  });
});

describe('Cero Sorpresas', () => {
  it('no se ofrece al Maki sin aprobación del cliente; el Maki no puede autoasignarse', async () => {
    const db = freshDb();
    const req = await newRequest(db, userBy(db, 'valeria@makiya.demo'), 'Armar una cama');
    expect(() => respondOffer(db, userBy(db, 'rosa@makiya.demo'), req.id, true)).toThrow();
    expect(canTransition('propuesta_lista', 'confirmada', 'maki')).toBe(false);
  });
  it('un adicional no aprobado no se cobra; uno aprobado sí (material sin comisión)', async () => {
    const db = freshDb();
    const { req, client, maki } = await toInProgress(db);
    const ex1 = proposeExtra(db, maki, req.id, { kind: 'trabajo', description: 'Instalar repisa extra', amount: 35 });
    expect(() => proposeExtra(db, maki, req.id, { kind: 'trabajo', description: 'Otra cosa', amount: 10 })).toThrow(/esperando/);
    decideExtra(db, client, req.id, ex1.id, false);
    const ex2 = proposeExtra(db, maki, req.id, { kind: 'material', description: 'Tarugos para concreto', amount: 10, receipt: 'B001' });
    decideExtra(db, client, req.id, ex2.id, true);
    const checklist = db.items.find((i) => i.id === 'armado-escritorio')!.closingTest.checklist.map((label) => ({ label, ok: true }));
    submitEvidence(db, maki, req.id, { photos: ['x'], checklist, notes: '' });
    const pay = confirmConformity(db, client, req.id, { signedName: 'Valeria R', quality: 5, safety: 5, fairPrice: 5, ease: 5, nps: 9, comment: '' });
    const desk = db.items.find((i) => i.id === 'armado-escritorio')!.price;
    expect(pay.amount).toBe(desk + 10); // precio + 10 de material; el adicional rechazado no suma
    expect(pay.commission).toBe(Math.round(desk * db.settings.commissionRepeat * 100) / 100); // el material se reembolsa al costo, sin comisión
    expect(pay.makiNet).toBe(pay.amount - pay.commission);
  });
  it('material sin boleta no se acepta', async () => {
    const db = freshDb();
    const { req, maki } = await toInProgress(db);
    expect(() => proposeExtra(db, maki, req.id, { kind: 'material', description: 'Tornillos', amount: 5 })).toThrow(/boleta/);
  });
  it('evidencia requiere fotos y checklist completo; no se paga sin conformidad', async () => {
    const db = freshDb();
    const { req, client, maki } = await toInProgress(db);
    expect(() => submitEvidence(db, maki, req.id, { photos: [], checklist: [{ label: 'a', ok: true }], notes: '' })).toThrow(/foto/);
    expect(() => submitEvidence(db, maki, req.id, { photos: ['x'], checklist: [{ label: 'a', ok: false }], notes: '' })).toThrow(/prueba de cierre/);
    expect(() => confirmConformity(db, client, req.id, { signedName: 'Valeria', quality: 5, safety: 5, fairPrice: 5, ease: 5, nps: 9, comment: '' })).toThrow();
    expect(db.payments.some((p) => p.requestId === req.id)).toBe(false);
  });
  it('solo trabajos programados con ≥ 24 h', async () => {
    const db = freshDb();
    const c = userBy(db, 'valeria@makiya.demo');
    const ai = await interpretRequest({ text: 'Armar cama', photoCount: 0 }, ctx(db), sim);
    expect(() =>
      createRequest(db, c, { description: 'Armar cama ya', photos: [], photoConsent: false, interpretation: ai, classificationConfirmed: true, answers: {}, lines: ai.suggestedLines, district: 'San Miguel', addressRef: '', preferredDate: dateOnlyPlus(0), window: 'manana', startedAt: new Date().toISOString() }),
    ).toThrow(/24 h/);
  });
  it('fotos requieren consentimiento', async () => {
    const db = freshDb();
    const c = userBy(db, 'valeria@makiya.demo');
    const ai = await interpretRequest({ text: 'Armar cama', photoCount: 1 }, ctx(db), sim);
    expect(() =>
      createRequest(db, c, { description: 'Armar una cama', photos: ['x'], photoConsent: false, interpretation: ai, classificationConfirmed: true, answers: {}, lines: ai.suggestedLines, district: 'San Miguel', addressRef: '', preferredDate: futureWorkday(3), window: 'manana', startedAt: new Date().toISOString() }),
    ).toThrow(/consentimiento/);
  });
});

describe('Incidencias y garantía', () => {
  it('problema en conformidad → corrección → nueva evidencia → resuelta', async () => {
    const db = freshDb();
    const admin = userBy(db, 'admin@makiya.demo');
    const { req, client, maki } = await toInProgress(db);
    const checklist = db.items.find((i) => i.id === 'armado-escritorio')!.closingTest.checklist.map((label) => ({ label, ok: true }));
    submitEvidence(db, maki, req.id, { photos: ['x'], checklist, notes: '' });
    const inc = reportIssue(db, client, req.id, 'conformidad', 'Un cajón no cierra bien');
    expect(req.status).toBe('con_incidencia');
    resolveIncident(db, admin, inc.id, { status: 'en_correccion', resolution: 'Regular correderas', countsAsRework: true });
    expect(req.status).toBe('en_curso');
    submitEvidence(db, maki, req.id, { photos: ['y'], checklist, notes: 'Corregido' });
    expect(db.incidents.find((i) => i.id === inc.id)!.status).toBe('resuelta');
    expect(req.status).toBe('evidencia_enviada');
  });
  it('reclamo de garantía dentro de 30 días con SLA de 72 h', () => {
    const db = freshDb();
    const r = db.requests.find((x) => x.status === 'completada' && x.clientId === 'u_valeria' && new Date(x.warrantyUntil!) > new Date())!;
    const inc = reportIssue(db, userBy(db, 'valeria@makiya.demo'), r.id, 'garantia', 'Una repisa se inclinó');
    expect(inc.type).toBe('garantia');
    expect(inc.fixDue).toBeTruthy();
    expect(r.status).toBe('completada');
  });
});

describe('Admin', () => {
  it('evaluador verifica presupuesto a medida (vía 2)', () => {
    const db = freshDb();
    const admin = userBy(db, 'admin@makiya.demo');
    const r = db.requests.find((x) => x.status === 'en_revision')!;
    expect(() => verifyQuote(db, userBy(db, 'camila@makiya.demo'), r.id, { categoryId: 'armado', lines: [] })).toThrow(/permiso/);
    verifyQuote(db, admin, r.id, { categoryId: 'armado', lines: [{ itemId: 'armado-ropero', description: 'Armado de ropero', qty: 1, unitPrice: 95 }, { description: 'Recorte de repisa a medida', qty: 1, unitPrice: 25 }] });
    expect(r.status).toBe('propuesta_lista');
    expect(r.route).toBe('evaluador');
    expect(r.quoteVerifiedBy).toBe(admin.id);
  });
  it('habilitación exige 4 capas y prueba ≥ 14/20', () => {
    const db = freshDb();
    const admin = userBy(db, 'admin@makiya.demo');
    expect(() => evaluateMaki(db, admin, 'u_martin', { identity: true, background: true, references: true, tradeTestScore: 12 }, 'habilitar')).toThrow(/14/);
    expect(() => evaluateMaki(db, admin, 'u_martin', { identity: true, background: false, references: true, tradeTestScore: 16 }, 'habilitar')).toThrow(/4 capas/);
    evaluateMaki(db, admin, 'u_martin', { identity: true, background: true, references: true, tradeTestScore: 16 }, 'habilitar');
    expect(db.makiProfiles.find((m) => m.userId === 'u_martin')!.status).toBe('habilitado');
  });
  it('no se puede activar un servicio futuro ni comisiones fuera de rango', () => {
    const db = freshDb();
    const admin = userBy(db, 'admin@makiya.demo');
    db.items.push({ ...db.items[0], id: 'g1', categoryId: 'gasfiteria', active: false });
    expect(() => updateItem(db, admin, 'g1', { active: true })).toThrow(/futura/);
    expect(() => updateSettings(db, admin, { commissionFirst: 0.9 })).toThrow();
    updateSettings(db, admin, { commissionFirst: 0.22 });
    expect(db.settings.commissionFirst).toBe(0.22);
  });
  it('reasignar exige aprobación previa del cliente y aceptación del Maki', async () => {
    const db = freshDb();
    const admin = userBy(db, 'admin@makiya.demo');
    const req = await newRequest(db, userBy(db, 'mateo@makiya.demo'), 'Armar una cama');
    expect(() => reassignOffer(db, admin, req.id, 'u_jhon')).toThrow(/aprobó/);
  });
  it('cancelación libera ofertas pendientes', async () => {
    const db = freshDb();
    const c = userBy(db, 'mateo@makiya.demo');
    const req = await newRequest(db, c, 'Armar una cama');
    approveAndSendOffer(db, c, req.id, req.candidates[0].makiId);
    cancelRequest(db, c, req.id, 'Cambio de planes');
    expect(req.status).toBe('cancelada');
    expect(req.offers.every((o) => o.status !== 'pendiente')).toBe(true);
  });
});

describe('Cuentas', () => {
  it('registro de Maki queda como postulante y no recibe ofertas', () => {
    const db = freshDb();
    const u = registerUser(db, {
      role: 'maki', name: 'Nuevo Maki', email: 'nuevo@test.pe', phone: '999888777', district: 'Lince', passwordHash: 'h', consent: true,
      maki: { specialties: ['armado'], experienceYears: 2, districts: ['San Miguel'], availability: { 0: [], 1: ['manana'], 2: [], 3: [], 4: [], 5: [], 6: [] }, bio: '', references: [{ name: 'a', phone: '1' }, { name: 'b', phone: '2' }] },
    });
    expect(db.makiProfiles.find((m) => m.userId === u.id)!.status).toBe('postulante');
    expect(() => registerUser(db, { role: 'client', name: 'X', email: 'nuevo@test.pe', phone: '1', district: 'Lima', passwordHash: 'h', consent: false })).toThrow();
  });
});

describe('Economía (informe cap. 10)', () => {
  it('reproduce el margen de la vía 1 del informe (S/ 7,30 antes de coordinación)', () => {
    const db = freshDb();
    db.settings.costs.coordinationHours = 0;
    const split = splitPayment({ lines: [{ id: 'a', description: 'x', qty: 1, unitPrice: 85 }], extras: [] }, false, db.settings);
    expect(split.commission).toBe(21.25);
    expect(split.makiNet).toBe(63.75);
    expect(contributionMargin({ amount: 85, commission: 21.25, isRepeat: false }, false, db.settings)).toBe(7.3);
    expect(contributionMargin({ amount: 150, commission: 37.5, isRepeat: false }, true, db.settings)).toBe(11);
  });
});

describe('Mejoras: catálogo, precios y elección del Maki', () => {
  it('todos los precios del tarifario respetan el tope de +10 % sobre la referencia de mercado', async () => {
    const { priceStatus } = await import('@/domain/pricing');
    const db = freshDb();
    for (const it of db.items) {
      expect(it.marketRef, it.id).toBeTruthy();
      expect(priceStatus(it, db.settings), it.id).not.toBe('sobre_tope');
    }
  });
  it('el admin no puede fijar un precio sobre el tope', () => {
    const db = freshDb();
    const admin = userBy(db, 'admin@makiya.demo');
    expect(() => updateItem(db, admin, 'inst-repisa', { price: 60 })).toThrow(/tope/);
    updateItem(db, admin, 'inst-repisa', { price: 35 });
    expect(db.items.find((i) => i.id === 'inst-repisa')!.price).toBe(35);
  });
  it('los paquetes sugeridos se interpretan como sus servicios', async () => {
    const { PACKS } = await import('@/config/catalog');
    const db = freshDb();
    for (const p of PACKS) {
      const r = await interpretRequest({ text: p.text, photoCount: 0 }, ctx(db), sim);
      const got = Object.fromEntries(r.suggestedLines.map((l) => [l.itemId, l.qty]));
      expect(got, p.id).toEqual(Object.fromEntries(p.lines.map((l) => [l.itemId, l.qty])));
    }
  });
  it('distingue ropero pequeño de ropero grande', async () => {
    const db = freshDb();
    const a = await interpretRequest({ text: 'Armar un ropero de 6 puertas', photoCount: 0 }, ctx(db), sim);
    expect(a.suggestedLines.map((l) => l.itemId)).toEqual(['armado-ropero-grande']);
    const b = await interpretRequest({ text: 'Armar un ropero', photoCount: 0, answers: { ropero_puertas: '2 o 3 puertas' } }, ctx(db), sim);
    expect(b.suggestedLines.map((l) => l.itemId)).toEqual(['armado-ropero']);
  });
  it('el cliente puede elegir a cualquier Maki compatible, no solo a los recomendados', async () => {
    const db = freshDb();
    const c = userBy(db, 'mateo@makiya.demo');
    const req = await newRequest(db, c, 'Armar una cama');
    const all = recommendMakis(db, req).eligible;
    expect(all.length).toBeGreaterThanOrEqual(req.candidates.length);
    const last = all[all.length - 1].makiId;
    approveAndSendOffer(db, c, req.id, last);
    expect(req.selectedMakiId).toBe(last);
    // …pero no a uno incompatible
    const req2 = await newRequest(db, c, 'Armar una cama');
    expect(() => approveAndSendOffer(db, c, req2.id, 'u_luis')).toThrow(/disponible/);
  });
  it('si el Maki rechaza, la oferta pasa sola a la opción de respaldo del cliente', async () => {
    const db = freshDb();
    const c = userBy(db, 'mateo@makiya.demo');
    const req = await newRequest(db, c, 'Armar una cama');
    const [first, second] = req.candidates.map((x) => x.makiId);
    approveAndSendOffer(db, c, req.id, first, [second]);
    respondOffer(db, db.users.find((u) => u.id === first)!, req.id, false, 'Tengo otro compromiso');
    expect(req.status).toBe('esperando_maki');
    expect(req.selectedMakiId).toBe(second);
    expect(req.offers.find((o) => o.makiId === second)?.status).toBe('pendiente');
  });
});
