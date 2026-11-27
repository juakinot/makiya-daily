import { CATEGORIES, ITEMS } from '@/config/catalog';
import { DEFAULT_SETTINGS } from '@/config/defaults';
import { splitPayment } from '@/domain/economics';
import type {
  Availability,
  Database,
  HomeProfile,
  Interpretation,
  MakiProfile,
  Payment,
  QuoteLine,
  ServiceRequest,
  TimeWindow,
  User,
} from '@/domain/types';
import { addDays, addHours, demoPhoto, toDateOnly } from '@/lib/utils';

/**
 * DATOS DE DEMOSTRACIÓN. Todas las personas son ficticias y sus correos terminan en
 * @makiya.demo para ser identificables. Contraseña común de demo: ver DEMO_PASSWORD.
 */
export const DB_VERSION = 4;
export const DEMO_PASSWORD = 'demo1234';

const ALL: TimeWindow[] = ['manana', 'mediodia', 'tarde'];
const avail = (days: number[], windows: TimeWindow[] = ALL): Availability =>
  ({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], ...Object.fromEntries(days.map((d) => [d, windows])) }) as Availability;

function user(id: string, role: User['role'], name: string, email: string, district: string, createdAt: string, phone = '999 000 000'): User {
  return { id, role, name, email, phone, district, createdAt, isDemo: true, dataConsentAt: createdAt };
}

function interp(lines: { itemId: string; qty: number }[], summary: string, extra: Partial<Interpretation> = {}): Interpretation {
  return {
    providerId: 'simulated-rules',
    isSimulated: true,
    categoryId: ITEMS.find((i) => i.id === lines[0]?.itemId)?.categoryId,
    suggestedLines: lines,
    confidence: 0.86,
    missingInfo: [],
    questions: [],
    summary,
    scope: 'mvp',
    needsHumanReview: false,
    reasons: ['Datos de demostración'],
    customWork: false,
    ...extra,
  };
}

function qlines(lines: { itemId: string; qty: number }[]): QuoteLine[] {
  return lines.map((l, i) => {
    const it = ITEMS.find((x) => x.id === l.itemId)!;
    return { id: `ql_${i}_${l.itemId}`, itemId: l.itemId, description: it.name, qty: l.qty, unitPrice: it.price };
  });
}

export function createSeed(now = new Date()): Database {
  const nowIso = now.toISOString();
  const ago = (d: number, h = 0) => addHours(addDays(nowIso, -d), h);
  const dateAgo = (d: number) => toDateOnly(new Date(now.getTime() - d * 86_400_000));
  /** Fecha futura en día hábil (lun–sáb): MakiYa no atiende domingos. */
  const dateAhead = (d: number) => {
    const x = new Date(now.getTime() + d * 86_400_000);
    if (x.getDay() === 0) x.setDate(x.getDate() + 1);
    return toDateOnly(x);
  };

  const users: User[] = [
    user('u_admin', 'admin', 'Equipo MakiYa (Admin demo)', 'admin@makiya.demo', 'San Miguel', ago(120)),
    user('u_valeria', 'client', 'Valeria Rojas', 'valeria@makiya.demo', 'San Miguel', ago(40), '987 111 222'),
    user('u_diego', 'client', 'Diego Salas', 'diego@makiya.demo', 'Pueblo Libre', ago(35), '987 333 444'),
    user('u_camila', 'client', 'Camila Torres', 'camila@makiya.demo', 'Magdalena del Mar', ago(20), '987 555 666'),
    user('u_sofia', 'client', 'Sofía Mendoza', 'sofia@makiya.demo', 'Jesús María', ago(55)),
    user('u_mateo', 'client', 'Mateo Chávez', 'mateo@makiya.demo', 'San Miguel', ago(50)),
    user('u_lucia', 'client', 'Lucía Ramos', 'lucia@makiya.demo', 'Pueblo Libre', ago(45)),
    user('u_renzo', 'client', 'Renzo Aguilar', 'renzo@makiya.demo', 'Lince', ago(30)),
    user('u_rosa', 'maki', 'Rosa Quispe', 'rosa@makiya.demo', 'San Miguel', ago(90), '986 100 200'),
    user('u_luis', 'maki', 'Luis Paredes', 'luis@makiya.demo', 'Jesús María', ago(85), '986 300 400'),
    user('u_carlos', 'maki', 'Carlos Huamán', 'carlos@makiya.demo', 'Pueblo Libre', ago(80), '986 500 600'),
    user('u_jhon', 'maki', 'Jhon Torres', 'jhon@makiya.demo', 'Magdalena del Mar', ago(10), '986 700 800'),
    user('u_martin', 'maki', 'Martín Flores', 'martin@makiya.demo', 'Lince', ago(2), '986 900 100'),
  ];

  const homeProfiles: HomeProfile[] = [
    { clientId: 'u_valeria', district: 'San Miguel', addressRef: 'Av. La Marina, cuadra 25 (referencia demo)', homeType: 'departamento', floor: '5', notes: 'Edificio con ascensor. Avisar en recepción.', favoriteMakiIds: ['u_rosa'] },
    { clientId: 'u_diego', district: 'Pueblo Libre', addressRef: 'Jr. Ayacucho, cuadra 3 (referencia demo)', homeType: 'departamento', floor: '2', notes: 'Paredes de ladrillo.', favoriteMakiIds: [] },
    { clientId: 'u_camila', district: 'Magdalena del Mar', addressRef: 'Av. Brasil, cuadra 40 (referencia demo)', homeType: 'departamento', floor: '8', notes: '', favoriteMakiIds: [] },
    { clientId: 'u_sofia', district: 'Jesús María', addressRef: 'Referencia demo', homeType: 'departamento', notes: '', favoriteMakiIds: ['u_luis'] },
    { clientId: 'u_mateo', district: 'San Miguel', addressRef: 'Referencia demo', homeType: 'casa', notes: '', favoriteMakiIds: [] },
    { clientId: 'u_lucia', district: 'Pueblo Libre', addressRef: 'Referencia demo', homeType: 'departamento', notes: '', favoriteMakiIds: [] },
    { clientId: 'u_renzo', district: 'Lince', addressRef: 'Referencia demo', homeType: 'habitacion', notes: '', favoriteMakiIds: [] },
  ];

  const verified = (score: number, at: string) => ({ identity: true, background: true, references: true, tradeTestScore: score, reviewedBy: 'u_admin', reviewedAt: at });

  const makiProfiles: MakiProfile[] = [
    {
      userId: 'u_rosa', bio: 'Armo muebles y hago instalaciones hace 8 años. Ordenada y puntual; dejo todo limpio.',
      specialties: ['armado', 'instalacion'], experienceYears: 8, districts: ['San Miguel', 'Pueblo Libre', 'Magdalena del Mar'],
      availability: avail([1, 2, 3, 4, 5, 6]), status: 'habilitado', verification: verified(18, ago(88)),
      references: [{ name: 'Referencia demo 1', phone: '900 000 001' }, { name: 'Referencia demo 2', phone: '900 000 002' }], paused: false, joinedAt: ago(90),
    },
    {
      userId: 'u_luis', bio: 'Instalador de soportes de TV, repisas y accesorios. Trabajo con broca para mayólica y concreto.',
      specialties: ['instalacion'], experienceYears: 5, districts: ['San Miguel', 'Jesús María', 'Lince', 'Pueblo Libre'],
      availability: { ...avail([1, 2, 3, 4, 5], ['mediodia', 'tarde']), 6: ['manana'] }, status: 'habilitado', verification: verified(16, ago(83)),
      references: [{ name: 'Referencia demo 3', phone: '900 000 003' }, { name: 'Referencia demo 4', phone: '900 000 004' }], paused: false, joinedAt: ago(85),
    },
    {
      userId: 'u_carlos', bio: 'Carpintero de oficio con 12 años de experiencia. Especialista en roperos y camas.',
      specialties: ['armado'], experienceYears: 12, districts: ['Pueblo Libre', 'San Miguel', 'Magdalena del Mar', 'Jesús María'],
      availability: avail([2, 3, 4, 5, 6], ['manana', 'mediodia']), status: 'habilitado', verification: verified(17, ago(78)),
      references: [{ name: 'Referencia demo 5', phone: '900 000 005' }, { name: 'Referencia demo 6', phone: '900 000 006' }], paused: false, joinedAt: ago(80),
    },
    {
      userId: 'u_jhon', bio: 'Técnico en armado e instalaciones. Recién me uní a MakiYa.',
      specialties: ['armado', 'instalacion'], experienceYears: 3, districts: ['San Miguel', 'Magdalena del Mar', 'Pueblo Libre'],
      availability: avail([1, 2, 3, 4, 5, 6]), status: 'habilitado', verification: verified(15, ago(8)),
      references: [{ name: 'Referencia demo 7', phone: '900 000 007' }, { name: 'Referencia demo 8', phone: '900 000 008' }], paused: false, joinedAt: ago(10),
    },
    {
      userId: 'u_martin', bio: 'Armado de muebles de melamina. Quiero sumarme a MakiYa.',
      specialties: ['armado'], experienceYears: 4, districts: ['Lince', 'Jesús María', 'San Isidro'],
      availability: avail([1, 3, 5], ALL), status: 'postulante',
      verification: { identity: false, background: false, references: false, tradeTestScore: null },
      references: [{ name: 'Referencia demo 9', phone: '900 000 009' }, { name: 'Referencia demo 10', phone: '900 000 010' }], paused: false, joinedAt: ago(2),
    },
  ];

  const requests: ServiceRequest[] = [];
  const payments: Payment[] = [];
  let seq = 1000;

  const baseReq = (o: {
    clientId: string; daysAgo: number; lines: { itemId: string; qty: number }[]; text: string; district: string; window?: TimeWindow;
  }): ServiceRequest => {
    seq += 1;
    const created = ago(o.daysAgo, -2);
    return {
      id: `r_${seq}`, code: `MK-${seq}`, clientId: o.clientId, status: 'propuesta_lista', createdAt: created, startedAt: addHours(created, -0.04),
      description: o.text, photos: [], photoConsent: true, district: o.district, addressRef: 'Referencia demo',
      preferredDate: dateAgo(o.daysAgo - 2), window: o.window ?? 'manana', interpretation: interp(o.lines, `Necesitas: ${o.text.toLowerCase()}`),
      classificationConfirmed: true, answers: {}, categoryId: ITEMS.find((i) => i.id === o.lines[0].itemId)!.categoryId, route: 'tarifario',
      lines: qlines(o.lines), proposalAt: addHours(created, 0.01), candidates: [], offers: [], extras: [],
      timeline: [{ at: created, type: 'creada', label: 'Solicitud creada', by: 'client' }],
    };
  };

  /** Historial completado (para métricas, reputación e ingresos). */
  const done = (o: {
    clientId: string; makiId: string; daysAgo: number; lines: { itemId: string; qty: number }[]; text: string; district: string;
    q?: number; safety?: number; fair?: number; ease?: number; nps?: number; settled?: boolean; material?: number;
  }) => {
    const r = baseReq(o);
    const visitAt = ago(o.daysAgo - 2, 10);
    const prevSame = requests.some((x) => x.clientId === o.clientId && x.assignedMakiId === o.makiId && x.status === 'completada');
    r.selectedMakiId = o.makiId;
    r.assignedMakiId = o.makiId;
    r.scopeApprovedAt = addHours(r.createdAt, 0.2);
    r.offers = [{ makiId: o.makiId, sentAt: r.scopeApprovedAt, status: 'aceptada', respondedAt: addHours(r.createdAt, 1.5) }];
    r.visitCode = '0000';
    r.startedVisitAt = visitAt;
    if (o.material) {
      r.extras.push({ id: `x_${r.id}`, kind: 'material', description: 'Tarugos y tornillos para concreto (boleta)', amount: o.material, receipt: 'Boleta demo', status: 'aprobado', proposedAt: addHours(visitAt, 0.3), decidedAt: addHours(visitAt, 0.4) });
    }
    const item = ITEMS.find((i) => i.id === o.lines[0].itemId)!;
    r.evidence = {
      photos: [demoPhoto(`${item.name} — después`)],
      checklist: item.closingTest.checklist.map((label) => ({ label, ok: true })),
      notes: 'Prueba de cierre realizada frente al cliente.',
      submittedAt: addHours(visitAt, 1.5),
    };
    r.conformity = {
      signedName: users.find((u) => u.id === o.clientId)!.name, signedAt: addHours(visitAt, 1.7),
      quality: o.q ?? 5, safety: o.safety ?? 5, fairPrice: o.fair ?? 4, ease: o.ease ?? 5, nps: o.nps ?? 9, comment: '',
    };
    r.status = 'completada';
    r.approvedTotal = r.lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    r.warrantyUntil = addDays(r.conformity.signedAt, 30);
    const split = splitPayment(r, prevSame, DEFAULT_SETTINGS);
    const pay: Payment = {
      id: `p_${r.id}`, requestId: r.id, clientId: r.clientId, makiId: o.makiId, amount: split.amount, commissionRate: split.rate,
      commission: split.commission, makiNet: split.makiNet, isRepeat: prevSame, method: 'simulado', paidAt: r.conformity.signedAt,
      settlementId: o.settled ? 'pending' : undefined,
    };
    r.paymentId = pay.id;
    r.timeline.push(
      { at: r.scopeApprovedAt, type: 'aprobada', label: 'Alcance y precio aprobados por escrito', by: 'client' },
      { at: r.offers[0].respondedAt!, type: 'aceptada', label: 'El Maki aceptó el trabajo', by: 'maki' },
      { at: visitAt, type: 'en_curso', label: 'Visita iniciada con código verificado', by: 'maki' },
      { at: r.evidence.submittedAt, type: 'evidencia', label: 'Evidencia de cierre enviada', by: 'maki' },
      { at: r.conformity.signedAt, type: 'completada', label: 'Conformidad firmada y pago simulado registrado', by: 'client' },
    );
    requests.push(r);
    payments.push(pay);
    return r;
  };

  done({ clientId: 'u_sofia', makiId: 'u_luis', daysAgo: 52, lines: [{ itemId: 'inst-tv', qty: 1 }], text: 'Instalar soporte de TV de 50 pulgadas', district: 'Jesús María', settled: true, material: 12 });
  done({ clientId: 'u_mateo', makiId: 'u_rosa', daysAgo: 49, lines: [{ itemId: 'armado-cama', qty: 1 }], text: 'Armar cama de 2 plazas', district: 'San Miguel', settled: true });
  done({ clientId: 'u_lucia', makiId: 'u_carlos', daysAgo: 46, lines: [{ itemId: 'armado-ropero', qty: 1 }], text: 'Armar ropero de 3 puertas', district: 'Pueblo Libre', settled: true, q: 4, fair: 4 });
  done({ clientId: 'u_sofia', makiId: 'u_luis', daysAgo: 41, lines: [{ itemId: 'inst-repisa', qty: 3 }], text: 'Instalar 3 repisas', district: 'Jesús María', settled: true, q: 5 });
  done({ clientId: 'u_valeria', makiId: 'u_rosa', daysAgo: 38, lines: [{ itemId: 'armado-cama', qty: 1 }, { itemId: 'armado-almacenamiento', qty: 1 }], text: 'Armar cama y velador', district: 'San Miguel', settled: true });
  done({ clientId: 'u_renzo', makiId: 'u_luis', daysAgo: 33, lines: [{ itemId: 'inst-bano', qty: 2 }], text: 'Instalar toallero y portapapel', district: 'Lince', settled: true, q: 4, safety: 4, fair: 5 });
  const withRework = done({ clientId: 'u_diego', makiId: 'u_carlos', daysAgo: 30, lines: [{ itemId: 'armado-escritorio', qty: 1 }], text: 'Armar escritorio', district: 'Pueblo Libre', settled: true, q: 3, fair: 4, nps: 6 });
  done({ clientId: 'u_mateo', makiId: 'u_rosa', daysAgo: 27, lines: [{ itemId: 'inst-tv', qty: 1 }], text: 'Instalar soporte de TV', district: 'San Miguel', settled: true, material: 15 });
  done({ clientId: 'u_lucia', makiId: 'u_rosa', daysAgo: 22, lines: [{ itemId: 'armado-almacenamiento', qty: 2 }], text: 'Armar zapatera y cómoda', district: 'Pueblo Libre', settled: true, q: 5 });
  done({ clientId: 'u_sofia', makiId: 'u_luis', daysAgo: 18, lines: [{ itemId: 'inst-accesorio', qty: 2 }], text: 'Colgar espejo y perchero', district: 'Jesús María', settled: true });
  done({ clientId: 'u_valeria', makiId: 'u_rosa', daysAgo: 12, lines: [{ itemId: 'inst-repisa', qty: 2 }], text: 'Instalar 2 repisas', district: 'San Miguel', settled: false, q: 5, nps: 10 });
  done({ clientId: 'u_camila', makiId: 'u_carlos', daysAgo: 9, lines: [{ itemId: 'armado-cama', qty: 1 }], text: 'Armar camarote', district: 'Magdalena del Mar', settled: false, q: 5, fair: 5 });
  done({ clientId: 'u_renzo', makiId: 'u_luis', daysAgo: 6, lines: [{ itemId: 'inst-tv', qty: 1 }], text: 'Instalar TV de 43 pulgadas', district: 'Lince', settled: false, q: 4 });
  done({ clientId: 'u_mateo', makiId: 'u_rosa', daysAgo: 4, lines: [{ itemId: 'armado-escritorio', qty: 1 }], text: 'Armar escritorio', district: 'San Miguel', settled: false, q: 5 });

  // Liquidaciones: agrupa los pagos marcados como liquidados por Maki
  const settlements: Database['settlements'] = [];
  for (const makiId of ['u_rosa', 'u_luis', 'u_carlos']) {
    const ps = payments.filter((p) => p.makiId === makiId && p.settlementId === 'pending');
    if (!ps.length) continue;
    const id = `s_${makiId}`;
    ps.forEach((p) => (p.settlementId = id));
    settlements.push({ id, makiId, paymentIds: ps.map((p) => p.id), total: Math.round(ps.reduce((s, p) => s + p.makiNet, 0) * 100) / 100, createdAt: ago(14), createdBy: 'u_admin', method: 'simulado' });
  }

  // Incidencia de garantía resuelta (retrabajo) sobre el escritorio de Diego
  const incidents: Database['incidents'] = [
    {
      id: 'i_1', requestId: withRework.id, clientId: 'u_diego', makiId: 'u_carlos', type: 'garantia',
      description: 'Un cajón del escritorio se descuadró a la semana.', status: 'resuelta', createdAt: ago(23), responseDue: ago(22),
      fixDue: ago(20), resolution: 'El Maki reguló correderas sin costo dentro de 48 h.', resolvedAt: ago(21), countsAsRework: true,
    },
  ];

  // Cancelada
  const cancelled = baseReq({ clientId: 'u_renzo', daysAgo: 15, lines: [{ itemId: 'armado-cama', qty: 1 }], text: 'Armar cama', district: 'Lince' });
  cancelled.status = 'cancelada';
  cancelled.cancellation = { by: 'client', reason: 'El mueble aún no llegó', at: ago(14) };
  cancelled.timeline.push({ at: ago(14), type: 'cancelada', label: 'Cancelada por el cliente: El mueble aún no llegó', by: 'client' });
  requests.push(cancelled);

  // ───── Solicitudes activas para demostrar cada pantalla ─────

  // Valeria: confirmada con Rosa (Mi Maki), visita en 2 días
  const conf = baseReq({ clientId: 'u_valeria', daysAgo: 1, lines: [{ itemId: 'armado-escritorio', qty: 1 }], text: 'Armar un escritorio para home office', district: 'San Miguel' });
  conf.preferredDate = dateAhead(2);
  conf.window = 'tarde';
  conf.selectedMakiId = 'u_rosa';
  conf.assignedMakiId = 'u_rosa';
  conf.scopeApprovedAt = ago(1, -1.8);
  conf.approvedTotal = 60;
  conf.offers = [{ makiId: 'u_rosa', sentAt: conf.scopeApprovedAt, status: 'aceptada', respondedAt: ago(1, -1) }];
  conf.visitCode = '4827';
  conf.status = 'confirmada';
  conf.timeline.push(
    { at: conf.scopeApprovedAt, type: 'aprobada', label: 'Alcance y precio aprobados por escrito', by: 'client' },
    { at: ago(1, -1), type: 'aceptada', label: 'Rosa aceptó el trabajo. Código de visita generado.', by: 'maki' },
  );
  requests.push(conf);

  // Diego: esperando respuesta de Rosa (Rosa ve la oferta en su panel)
  const wait = baseReq({ clientId: 'u_diego', daysAgo: 0, lines: [{ itemId: 'inst-tv', qty: 1 }, { itemId: 'inst-repisa', qty: 2 }], text: 'Instalar soporte de TV de 55" y dos repisas', district: 'Pueblo Libre' });
  wait.preferredDate = dateAhead(3);
  wait.window = 'manana';
  wait.selectedMakiId = 'u_rosa';
  wait.scopeApprovedAt = ago(0, -0.5);
  wait.approvedTotal = 135;
  wait.offers = [{ makiId: 'u_rosa', sentAt: wait.scopeApprovedAt, status: 'pendiente' }];
  wait.status = 'esperando_maki';
  wait.candidates = [
    { makiId: 'u_rosa', score: 0.86, reasons: ['Atiende Pueblo Libre'], isNewMaki: false, isMyMaki: false },
    { makiId: 'u_luis', score: 0.8, reasons: ['Atiende Pueblo Libre'], isNewMaki: false, isMyMaki: false },
    { makiId: 'u_jhon', score: 0.7, reasons: ['Nuevo en MakiYa'], isNewMaki: true, isMyMaki: false },
  ];
  wait.timeline.push({ at: wait.scopeApprovedAt, type: 'aprobada', label: 'Alcance y precio aprobados. Oferta enviada a Rosa.', by: 'client' });
  requests.push(wait);

  // Camila: trabajo a medida en revisión del evaluador (vía 2)
  const rev = baseReq({ clientId: 'u_camila', daysAgo: 0, lines: [{ itemId: 'armado-ropero', qty: 1 }], text: 'Armar un ropero y recortar una repisa a medida', district: 'Magdalena del Mar' });
  rev.status = 'en_revision';
  rev.route = 'evaluador';
  rev.preferredDate = dateAhead(4);
  rev.window = 'mediodia';
  rev.proposalAt = undefined;
  rev.interpretation = interp([{ itemId: 'armado-ropero', qty: 1 }], 'Necesitas: armado de ropero prefabricado + trabajo a medida.', { customWork: true, needsHumanReview: true, confidence: 0.5, reasons: ['El pedido incluye trabajo a medida: requiere presupuesto verificado por un evaluador.'] });
  rev.timeline = [{ at: rev.createdAt, type: 'creada', label: 'Solicitud creada · requiere presupuesto verificado', by: 'client' }];
  requests.push(rev);

  // Diego: evidencia enviada por Carlos (Diego debe dar conformidad)
  const ev = baseReq({ clientId: 'u_diego', daysAgo: 3, lines: [{ itemId: 'armado-ropero', qty: 1 }], text: 'Armar ropero de 2 puertas', district: 'Pueblo Libre' });
  ev.preferredDate = dateAgo(0);
  ev.window = 'manana';
  ev.selectedMakiId = 'u_carlos';
  ev.assignedMakiId = 'u_carlos';
  ev.scopeApprovedAt = ago(3, -1);
  ev.approvedTotal = 95;
  ev.offers = [{ makiId: 'u_carlos', sentAt: ev.scopeApprovedAt, status: 'aceptada', respondedAt: ago(3, 1) }];
  ev.visitCode = '3190';
  ev.startedVisitAt = ago(0, -4);
  const ropero = ITEMS.find((i) => i.id === 'armado-ropero')!;
  ev.extras = [{ id: 'x_ev', kind: 'material', description: 'Juego de anclaje antivuelco adicional (boleta)', amount: 18, receipt: 'Boleta demo 001-234', status: 'aprobado', proposedAt: ago(0, -3.5), decidedAt: ago(0, -3.4) }];
  ev.evidence = { photos: [demoPhoto('Ropero — antes', 'before'), demoPhoto('Ropero armado y anclado')], checklist: ropero.closingTest.checklist.map((label) => ({ label, ok: true })), notes: 'Anclado a pared de ladrillo. Puertas reguladas.', submittedAt: ago(0, -2) };
  ev.status = 'evidencia_enviada';
  ev.timeline.push(
    { at: ev.scopeApprovedAt, type: 'aprobada', label: 'Alcance y precio aprobados por escrito', by: 'client' },
    { at: ago(3, 1), type: 'aceptada', label: 'Carlos aceptó el trabajo', by: 'maki' },
    { at: ago(0, -4), type: 'en_curso', label: 'Visita iniciada con código verificado', by: 'maki' },
    { at: ago(0, -3.4), type: 'adicional', label: 'Material adicional aprobado por el cliente (S/ 18,00)', by: 'client' },
    { at: ago(0, -2), type: 'evidencia', label: 'Evidencia de cierre enviada', by: 'maki' },
  );
  requests.push(ev);

  const events: Database['events'] = [
    ...requests.map((r, i) => ({ id: `e_s${i}`, type: 'request_started' as const, at: r.startedAt, userId: r.clientId, requestId: r.id })),
    ...requests.map((r, i) => ({ id: `e_u${i}`, type: 'request_submitted' as const, at: r.createdAt, userId: r.clientId, requestId: r.id })),
    { id: 'e_a1', type: 'request_started', at: ago(25), userId: 'u_renzo' },
    { id: 'e_a2', type: 'request_abandoned', at: ago(25), userId: 'u_renzo' },
    { id: 'e_a3', type: 'request_started', at: ago(11), userId: 'u_lucia' },
    { id: 'e_a4', type: 'request_abandoned', at: ago(11), userId: 'u_lucia' },
    { id: 'e_c1', type: 'clarification_needed', at: ago(30), userId: 'u_diego', requestId: withRework.id },
    { id: 'e_c2', type: 'clarification_needed', at: ago(0), userId: 'u_camila', requestId: rev.id },
  ];

  return {
    version: DB_VERSION,
    users,
    homeProfiles,
    makiProfiles,
    categories: CATEGORIES.map((c) => ({ ...c })),
    items: ITEMS.map((i) => ({ ...i, includes: [...i.includes], excludes: [...i.excludes] })),
    requests,
    payments,
    settlements,
    incidents,
    interests: [
      { id: 'fi_1', clientId: 'u_valeria', categoryId: 'gasfiteria', description: 'El caño del lavadero gotea', createdAt: ago(16) },
      { id: 'fi_2', clientId: 'u_mateo', categoryId: 'limpieza', description: 'Limpieza profunda después de mudanza', createdAt: ago(8) },
    ],
    events,
    settings: structuredClone(DEFAULT_SETTINGS),
    seq,
  };
}
