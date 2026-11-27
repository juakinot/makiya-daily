/**
 * FASE 8 — Recorrido obligatorio de integración (12 pasos del prompt maestro).
 * Usa los mismos servicios de dominio que la interfaz.
 */
import { interpretRequest } from '@/ai';
import { SimulatedRulesProvider } from '@/ai/simulatedProvider';
import { businessMetrics, makiMetrics, northStar } from '@/analytics/metrics';
import { can } from '@/auth/permissions';
import { recommendMakis } from '@/matching/engine';
import { createSettlement } from '@/services/adminService';
import {
  approveAndSendOffer,
  confirmConformity,
  createRequest,
  respondOffer,
  startVisit,
  submitEvidence,
} from '@/services/requestService';
import { freshDb, futureWorkday, userBy } from './helpers';

describe('Recorrido obligatorio cliente → admin → Maki → cliente → métricas', () => {
  it('completa los 12 pasos con datos compartidos', async () => {
    const db = freshDb();
    const valeria = userBy(db, 'valeria@makiya.demo');
    const admin = userBy(db, 'admin@makiya.demo');
    const rosa = userBy(db, 'rosa@makiya.demo');
    const before = { ns: northStar(db).total, pays: db.payments.length, revenue: businessMetrics(db).revenue.value! };

    // 1. Cliente crea solicitud (con el asistente)
    const ai = await interpretRequest(
      { text: 'Necesito que me armen una cama de 2 plazas que compré', photoCount: 0 },
      { categories: db.categories, items: db.items, confidenceThreshold: db.settings.aiConfidenceThreshold },
      new SimulatedRulesProvider(0),
    );
    expect(ai.scope).toBe('mvp');
    expect(ai.suggestedLines[0].itemId).toBe('armado-cama');
    expect(ai.needsHumanReview).toBe(false);
    const req = createRequest(db, valeria, {
      description: 'Necesito que me armen una cama de 2 plazas que compré',
      photos: [],
      photoConsent: false,
      interpretation: ai,
      classificationConfirmed: true,
      answers: {},
      lines: ai.suggestedLines,
      district: 'San Miguel',
      addressRef: 'Referencia demo',
      preferredDate: futureWorkday(3),
      window: 'manana',
      startedAt: new Date(Date.now() - 120_000).toISOString(),
    });

    // 2. Solicitud registrada con precio cerrado
    expect(db.requests.find((r) => r.id === req.id)).toBeTruthy();
    expect(req.status).toBe('propuesta_lista');
    const camaPrice = db.items.find((i) => i.id === 'armado-cama')!.price;
    expect(req.lines[0].unitPrice).toBe(camaPrice);

    // 3. Administrador puede verla
    expect(can(admin, 'request:view', req)).toBe(true);
    // …y otro cliente no
    expect(can(userBy(db, 'diego@makiya.demo'), 'request:view', req)).toBe(false);

    // 4. Sistema identifica Makis compatibles (1–3), con Rosa como «Mi Maki»
    const match = recommendMakis(db, req);
    expect(match.candidates.length).toBeGreaterThan(0);
    expect(match.candidates.length).toBeLessThanOrEqual(3);
    const rosaCand = req.candidates.find((c) => c.makiId === rosa.id);
    expect(rosaCand?.isMyMaki).toBe(true);
    expect(match.evaluated.find((e) => e.makiId === 'u_martin')?.reason).toBe('no_habilitado');

    // 5. Maki recibe la solicitud (tras aprobación escrita del cliente)
    approveAndSendOffer(db, valeria, req.id, rosa.id);
    expect(req.status).toBe('esperando_maki');
    expect(req.scopeApprovedAt).toBeTruthy();
    expect(req.offers.some((o) => o.makiId === rosa.id && o.status === 'pendiente')).toBe(true);

    // 6. Maki acepta
    respondOffer(db, rosa, req.id, true);

    // 7. Cliente recibe confirmación con código de Visita Segura
    expect(req.status).toBe('confirmada');
    expect(req.assignedMakiId).toBe(rosa.id);
    expect(req.visitCode).toMatch(/^\d{4}$/);

    // 8. Maki ejecuta el servicio (inicia con el código)
    expect(() => startVisit(db, rosa, req.id, '0000' === req.visitCode ? '1111' : '0000')).toThrow(/código no coincide/);
    startVisit(db, rosa, req.id, req.visitCode!);
    expect(req.status).toBe('en_curso');

    // 9. Maki adjunta evidencia
    const checklist = db.items.find((i) => i.id === 'armado-cama')!.closingTest.checklist.map((label) => ({ label, ok: true }));
    submitEvidence(db, rosa, req.id, { photos: ['data:image/png;base64,AAA'], checklist, notes: 'OK' });
    expect(req.status).toBe('evidencia_enviada');

    // 10–11. Cliente confirma conformidad → pago simulado
    const pay = confirmConformity(db, valeria, req.id, { signedName: 'Valeria Rojas', quality: 5, safety: 5, fairPrice: 5, ease: 5, nps: 10, comment: '' });
    expect(req.status).toBe('completada');
    expect(pay.method).toBe('simulado');
    expect(pay.amount).toBe(camaPrice);
    expect(pay.isRepeat).toBe(true); // ya trabajó antes con Rosa → comisión Mi Maki
    expect(pay.commissionRate).toBe(db.settings.commissionRepeat);
    const expectedCommission = Math.round(camaPrice * db.settings.commissionRepeat * 100) / 100;
    expect(pay.commission).toBe(expectedCommission);
    expect(pay.makiNet).toBe(camaPrice - expectedCommission);
    expect(req.warrantyUntil).toBeTruthy();

    // 12. Métricas e historial actualizados
    expect(northStar(db).total).toBe(before.ns + 1);
    expect(db.payments.length).toBe(before.pays + 1);
    expect(businessMetrics(db).revenue.value).toBeCloseTo(before.revenue + expectedCommission, 2);
    expect(db.requests.filter((r) => r.clientId === valeria.id && r.status === 'completada').map((r) => r.id)).toContain(req.id);
    expect(makiMetrics(db, rosa.id).pendingIncome.value).toBeGreaterThanOrEqual(pay.makiNet);

    // Liquidación al Maki (simulada)
    const s = createSettlement(db, admin, rosa.id);
    expect(s.paymentIds).toContain(pay.id);
  });
});
