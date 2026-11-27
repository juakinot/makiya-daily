import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Bot, ClipboardCheck, Plus, ShieldAlert, ShieldCheck, Trash2, Users, Wallet } from 'lucide-react';
import { businessMetrics, northStar, weeklyCompleted } from '@/analytics/metrics';
import { MakiCard, RequestRow, ScopeCard } from '@/components/domain';
import { Avatar, Badge, Button, Card, CardHeader, Checkbox, ChipGroup, EmptyState, Field, Input, Modal, Money, Notice, PageHeader, PhotoStrip, Select, SimulatedTag, Stat, StatusBadge, Tabs, Textarea, Timeline } from '@/components/ui';
import { WINDOW_SHORT } from '@/config/catalog';
import { linesTotal, pct } from '@/domain/economics';
import { STATUS_LABEL } from '@/domain/stateMachine';
import type { Incident, IncidentStatus, MakiProfile, RequestStatus, ServiceRequest } from '@/domain/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { EXCLUSION_LABEL, makiStats, recommendMakis } from '@/matching/engine';
import { createSettlement, evaluateMaki, reassignOffer, resolveIncident, returnToReview, setMakiStatus, verifyQuote } from '@/services/adminService';
import { cancelRequest } from '@/services/requestService';
import { useApp } from '@/store/AppStore';

export function DemoDataNote() {
  return <SimulatedTag>Datos de demostración — no son resultados experimentales</SimulatedTag>;
}

export function Bars({ data, format = (v: number) => String(v) }: { data: { label: string; value: number }[]; format?: (v: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="grid grid-cols-[minmax(110px,180px)_1fr_auto] items-center gap-3 text-sm">
          <span className="truncate text-ink-600">{d.label}</span>
          <div className="h-2.5 rounded-full bg-surface"><div className="h-2.5 rounded-full bg-turq-500" style={{ width: `${(d.value / max) * 100}%` }} /></div>
          <span className="w-16 text-right font-semibold tabular-nums">{format(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ColumnChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((d, i) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-xs font-semibold tabular-nums text-ink-700">{d.value}</span>
          <div className={`w-full rounded-t-md ${i === data.length - 1 ? 'bg-petrol-700' : 'bg-turq-500/70'}`} style={{ height: `${Math.max(4, (d.value / max) * 96)}px` }} />
          <span className="text-[10px] text-ink-400">{i === data.length - 1 ? 'Esta sem.' : d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ═════════ Dashboard ═════════ */
export function AdminDashboard() {
  const { db } = useApp();
  const ns = northStar(db);
  const bm = businessMetrics(db);
  const review = db.requests.filter((r) => r.status === 'en_revision');
  const noCandidates = db.requests.filter((r) => r.status === 'propuesta_lista' && r.candidates.length === 0);
  const rejected = db.requests.filter((r) => r.status === 'propuesta_lista' && r.offers.some((o) => o.status === 'rechazada'));
  const incidents = db.incidents.filter((i) => ['abierta', 'en_correccion'].includes(i.status));
  const applicants = db.makiProfiles.filter((m) => ['postulante', 'en_evaluacion'].includes(m.status));
  const alerts = [
    ...review.map((r) => ({ to: `/admin/solicitudes/${r.id}`, tone: 'warn' as const, text: `${r.code}: presupuesto por verificar`, icon: <ClipboardCheck className="h-4 w-4" /> })),
    ...noCandidates.map((r) => ({ to: `/admin/solicitudes/${r.id}`, tone: 'accent' as const, text: `${r.code}: sin Makis compatibles en la franja`, icon: <AlertTriangle className="h-4 w-4" /> })),
    ...rejected.map((r) => ({ to: `/admin/solicitudes/${r.id}`, tone: 'warn' as const, text: `${r.code}: el Maki rechazó, el cliente debe elegir otro`, icon: <Users className="h-4 w-4" /> })),
    ...incidents.map((i) => ({ to: '/admin/incidencias', tone: new Date(i.responseDue) < new Date() ? ('accent' as const) : ('warn' as const), text: `Incidencia (${i.type}) · responder antes de ${formatDateTime(i.responseDue)}`, icon: <ShieldAlert className="h-4 w-4" /> })),
    ...applicants.map((m) => ({ to: `/admin/makis/${m.userId}`, tone: 'mint' as const, text: `${db.users.find((u) => u.id === m.userId)?.name}: postulante por evaluar`, icon: <ShieldCheck className="h-4 w-4" /> })),
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Operación de MakiYa en un vistazo." action={<DemoDataNote />} />
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-5">
          <p className="text-sm font-semibold text-ink-600">North Star · servicios completados con conformidad y sin retrabajo</p>
          <div className="mt-2 flex items-end gap-4">
            <p className="text-5xl font-extrabold tracking-tight text-petrol-700">{ns.total}</p>
            <p className="pb-1.5 text-sm text-ink-600">de {ns.completed} completados · {ns.matured} ya superaron 30 días · {ns.inWarranty} en garantía</p>
          </div>
          <div className="mt-5"><ColumnChart data={weeklyCompleted(db)} /></div>
        </Card>
        <Card>
          <CardHeader title="Requiere atención" subtitle={`${alerts.length} pendientes`} />
          {alerts.length ? (
            <ul className="max-h-[260px] divide-y divide-line overflow-y-auto">
              {alerts.map((a, i) => (
                <li key={i}>
                  <Link to={a.to} className="flex items-center gap-2.5 px-5 py-3 text-sm hover:bg-surface">
                    <span className={a.tone === 'accent' ? 'text-accent-700' : a.tone === 'warn' ? 'text-warn-700' : 'text-turq-600'}>{a.icon}</span>
                    {a.text}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-ink-600">Todo al día.</p>
          )}
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Conversión (H1)" value={bm.conversion.value !== null ? pct(bm.conversion.value) : '—'} hint={`${bm.conversion.fraction} · meta ≥ 40 %`} />
        <Stat label="Ticket promedio" value={bm.avgTicket.value !== null ? <Money value={bm.avgTicket.value} /> : '—'} />
        <Stat label="Ingresos MakiYa" value={<Money value={bm.revenue.value ?? 0} />} hint={<>Valor transado <Money value={bm.gmv.value ?? 0} /></>} tone="petrol" />
        <Stat label="Margen de contribución" value={bm.avgContributionMargin.value !== null ? <Money value={bm.avgContributionMargin.value} /> : '—'} hint="Por servicio · supuestos configurables" />
      </div>
      <Card className="p-5">
        <p className="mb-4 font-bold">Embudo</p>
        <Bars data={bm.funnel} />
      </Card>
    </div>
  );
}

/* ═════════ Solicitudes ═════════ */
export function AdminRequests() {
  const { db } = useApp();
  const [tab, setTab] = useState<'activas' | RequestStatus | 'todas'>('activas');
  const [q, setQ] = useState('');
  const list = db.requests
    .filter((r) => (tab === 'todas' ? true : tab === 'activas' ? !['completada', 'cancelada'].includes(r.status) : r.status === tab))
    .filter((r) => !q || `${r.code} ${r.description} ${db.users.find((u) => u.id === r.clientId)?.name}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const c = (s: RequestStatus) => db.requests.filter((r) => r.status === s).length;
  return (
    <div>
      <PageHeader title="Solicitudes" subtitle="Todas las solicitudes, con la interpretación del asistente y los candidatos del motor." />
      <Tabs
        tabs={[
          { value: 'activas', label: 'Activas' },
          { value: 'en_revision', label: 'En revisión', count: c('en_revision') },
          { value: 'esperando_maki', label: 'Esperando Maki', count: c('esperando_maki') },
          { value: 'con_incidencia', label: 'Con incidencia', count: c('con_incidencia') },
          { value: 'completada', label: 'Completadas' },
          { value: 'todas', label: 'Todas' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <Input className="mb-4 max-w-sm" placeholder="Buscar por código, cliente o texto…" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length ? <div className="space-y-2">{list.map((r) => <RequestRow key={r.id} db={db} req={r} to={`/admin/solicitudes/${r.id}`} perspective="admin" />)}</div> : <EmptyState title="No hay solicitudes con este filtro" />}
    </div>
  );
}

export function AdminRequestDetail() {
  const { id } = useParams();
  const { db, run } = useApp();
  const req = db.requests.find((r) => r.id === id);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const match = useMemo(() => (req ? recommendMakis(db, req) : null), [db, req]);
  if (!req || !match) return <EmptyState title="Solicitud no encontrada" />;
  const client = db.users.find((u) => u.id === req.clientId)!;
  const ai = req.interpretation;
  const canReassign = ['propuesta_lista', 'confirmada'].includes(req.status) && !!req.scopeApprovedAt;

  return (
    <div>
      <Link to="/admin/solicitudes" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-petrol-700"><ArrowLeft className="h-4 w-4" />Solicitudes</Link>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{req.code} <StatusBadge status={req.status} /></span>}
        subtitle={`${client.name} · ${req.district} · ${formatDate(req.preferredDate)} ${WINDOW_SHORT[req.window]} · ${req.route === 'tarifario' ? 'Vía 1: precio cerrado' : 'Vía 2: evaluador'}`}
        action={!['completada', 'cancelada'].includes(req.status) && <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>Cancelar solicitud</Button>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card>
            <CardHeader icon={<Bot className="h-5 w-5" />} title="Interpretación del asistente" subtitle={`${ai.providerId} · confianza ${Math.round(ai.confidence * 100)} %`} action={ai.isSimulated ? <SimulatedTag /> : <Badge tone="turq">IA real</Badge>} />
            <div className="space-y-3 p-5 text-sm">
              <p><span className="font-semibold">Texto del cliente:</span> {req.description}</p>
              <p><span className="font-semibold">Resumen:</span> {ai.summary}</p>
              {Object.keys(req.answers).length > 0 && <p><span className="font-semibold">Respuestas:</span> {Object.values(req.answers).join(' · ')}</p>}
              <ul className="list-disc pl-5 text-ink-600">{ai.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              <p className="text-ink-600">Clasificación confirmada por el cliente: {req.classificationConfirmed ? 'sí' : 'no'} · Revisión humana: {ai.needsHumanReview || ai.customWork ? 'sí' : 'no'}</p>
              {req.photos.length > 0 && <PhotoStrip photos={req.photos} />}
            </div>
          </Card>

          {req.status === 'en_revision' && <QuoteEditor req={req} />}
          {req.lines.length > 0 && req.status !== 'en_revision' && <ScopeCard db={db} lines={req.lines} route={req.route} verifiedAt={req.quoteVerifiedAt} compact />}
          {req.status === 'propuesta_lista' && !req.scopeApprovedAt && (
            <Button variant="ghost" size="sm" onClick={() => run((d, a) => returnToReview(d, a, req.id, 'Ajuste de alcance por MakiYa'), 'Devuelta a revisión.')}>Devolver a revisión de presupuesto</Button>
          )}

          {req.extras.length > 0 && (
            <Card>
              <CardHeader title="Adicionales" subtitle="Registro de Cero Sorpresas" />
              <ul className="divide-y divide-line text-sm">
                {req.extras.map((e) => <li key={e.id} className="flex justify-between px-5 py-2.5"><span>{e.description} ({e.kind}{e.receipt ? `, boleta ${e.receipt}` : ''})</span><span className="flex items-center gap-2"><Money value={e.amount} /><Badge tone={e.status === 'aprobado' ? 'mint' : e.status === 'rechazado' ? 'muted' : 'warn'}>{e.status}</Badge></span></li>)}
              </ul>
            </Card>
          )}
          {req.evidence && <Card className="p-5"><p className="mb-2 font-bold">Evidencia de cierre</p><PhotoStrip photos={req.evidence.photos} /><p className="mt-2 text-sm text-ink-600">{req.evidence.checklist.filter((c) => c.ok).length}/{req.evidence.checklist.length} ítems de la prueba de cierre · {req.evidence.notes}</p></Card>}
          {req.conformity && (
            <Card className="p-5 text-sm">
              <p className="font-bold">Conformidad</p>
              <p className="mt-1 text-ink-700">Firmada por «{req.conformity.signedName}» el {formatDateTime(req.conformity.signedAt)} · calidad {req.conformity.quality}/5 · seguridad {req.conformity.safety}/5 · precio justo {req.conformity.fairPrice}/5 · facilidad {req.conformity.ease}/5 · NPS {req.conformity.nps}</p>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Motor de asignación" subtitle="Filtros → puntaje → 1–3 opciones" />
            <div className="space-y-3 p-4">
              {req.assignedMakiId && <div><p className="mb-1 text-xs font-semibold text-ink-600">Maki asignado</p><MakiCard db={db} makiId={req.assignedMakiId} categoryId={req.categoryId} /></div>}
              {req.offers.length > 0 && (
                <ul className="space-y-1 text-xs">
                  {req.offers.map((o, i) => <li key={i} className="flex justify-between"><span>Oferta a {db.users.find((u) => u.id === o.makiId)?.name}</span><Badge tone={o.status === 'aceptada' ? 'mint' : o.status === 'pendiente' ? 'warn' : 'muted'}>{o.status}{o.reason ? `: ${o.reason}` : ''}</Badge></li>)}
                </ul>
              )}
              <ul className="divide-y divide-line rounded-xl border border-line text-sm">
                {match.evaluated
                  .slice()
                  .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
                  .map((e) => {
                    const u = db.users.find((x) => x.id === e.makiId)!;
                    const inTop = match.candidates.some((c) => c.makiId === e.makiId);
                    return (
                      <li key={e.makiId} className="flex items-center justify-between gap-2 px-3 py-2">
                        <span className={e.eligible ? 'font-medium' : 'text-ink-400'}>{u.name}</span>
                        {e.eligible ? (
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums text-ink-600">{e.score?.toFixed(2)}</span>
                            {inTop && <Badge tone="mint">Top</Badge>}
                            {canReassign && req.assignedMakiId !== e.makiId && <Button size="sm" variant="ghost" onClick={() => run((d, a) => reassignOffer(d, a, req.id, e.makiId), `Oferta enviada a ${u.name}. Debe aceptarla.`)}>Ofrecer</Button>}
                          </span>
                        ) : (
                          <span className="text-xs text-ink-400">{EXCLUSION_LABEL[e.reason!]}</span>
                        )}
                      </li>
                    );
                  })}
              </ul>
              {!canReassign && <p className="text-xs text-ink-600">MakiYa solo puede reenviar ofertas después de que el cliente aprobó por escrito el alcance y el precio. El Maki siempre debe aceptar.</p>}
            </div>
          </Card>
          <Card><CardHeader title="Línea de tiempo" /><div className="px-5 py-4"><Timeline items={req.timeline} /></div></Card>
        </aside>
      </div>
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancelar solicitud" footer={<><Button variant="secondary" onClick={() => setCancelOpen(false)}>Volver</Button><Button variant="danger" disabled={!reason.trim()} onClick={() => { if (run((d, a) => cancelRequest(d, a, req.id, reason), 'Solicitud cancelada.')) setCancelOpen(false); }}>Cancelar</Button></>}>
        <Field label="Motivo (visible para el cliente)"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}

function QuoteEditor({ req }: { req: ServiceRequest }) {
  const { db, run } = useApp();
  const active = db.categories.filter((c) => c.status === 'activo');
  const [categoryId, setCategoryId] = useState(req.categoryId && active.some((c) => c.id === req.categoryId) ? req.categoryId : active[0].id);
  const init = req.lines.length ? req.lines : req.interpretation.suggestedLines.map((l) => { const it = db.items.find((i) => i.id === l.itemId)!; return { id: l.itemId, itemId: l.itemId, description: it.name, qty: l.qty, unitPrice: it.price }; });
  const [lines, setLines] = useState(init.map((l) => ({ itemId: l.itemId, description: l.description, qty: l.qty, unitPrice: l.unitPrice })));
  const [note, setNote] = useState('');
  const set = (i: number, patch: Partial<(typeof lines)[number]>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const total = linesTotal(lines.map((l, i) => ({ ...l, id: String(i) })));
  return (
    <Card>
      <CardHeader icon={<ClipboardCheck className="h-5 w-5" />} title="Verificar presupuesto (evaluador)" subtitle="Define el alcance contra el tarifario. Las líneas a medida deben justificarse." />
      <div className="space-y-4 p-5">
        <Field label="Categoría">
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>{active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        </Field>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[1fr_70px_100px_36px] items-end gap-2">
              <Field label={i === 0 ? 'Descripción' : ''}>
                {l.itemId ? <Select value={l.itemId} onChange={(e) => { const it = db.items.find((x) => x.id === e.target.value)!; set(i, { itemId: it.id, description: it.name, unitPrice: it.price }); }}>{db.items.filter((x) => x.active).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</Select> : <Input value={l.description} onChange={(e) => set(i, { description: e.target.value })} placeholder="Trabajo a medida" />}
              </Field>
              <Field label={i === 0 ? 'Cant.' : ''}><Input type="number" min={1} max={10} value={l.qty} onChange={(e) => set(i, { qty: Number(e.target.value) })} /></Field>
              <Field label={i === 0 ? 'Precio S/' : ''}><Input type="number" min={1} step="0.5" value={l.unitPrice} onChange={(e) => set(i, { unitPrice: Number(e.target.value) })} /></Field>
              <button className="mb-2 rounded-lg p-2 text-ink-400 hover:text-accent-700" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Quitar línea"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => { const it = db.items.find((x) => x.categoryId === categoryId && x.active)!; setLines([...lines, { itemId: it.id, description: it.name, qty: 1, unitPrice: it.price }]); }}>Línea del tarifario</Button>
          <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setLines([...lines, { itemId: undefined as unknown as string, description: '', qty: 1, unitPrice: 20 }])}>Línea a medida</Button>
        </div>
        <Field label="Nota para el cliente" optional><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: incluye recorte de una repisa" /></Field>
        <div className="flex items-center justify-between rounded-xl bg-mint-50 px-4 py-3"><span className="font-semibold">Total verificado</span><Money value={total} className="text-lg font-extrabold text-petrol-700" /></div>
        <Notice tone="neutral">Regla de precios: tope de +10 % sobre la referencia del tarifario. El cliente verá este presupuesto y deberá aprobarlo por escrito.</Notice>
        <Button block onClick={() => run((d, a) => verifyQuote(d, a, req.id, { categoryId, lines: lines.map((l) => ({ ...l, itemId: l.itemId || undefined })), note }), 'Presupuesto verificado y enviado al cliente.')}>Verificar y enviar propuesta</Button>
      </div>
    </Card>
  );
}

/* ═════════ Makis ═════════ */
const MAKI_STATUS_TONE: Record<MakiProfile['status'], 'warn' | 'mint' | 'accent' | 'muted'> = { postulante: 'warn', en_evaluacion: 'warn', habilitado: 'mint', rechazado: 'muted', suspendido: 'accent' };

export function AdminMakis() {
  const { db } = useApp();
  const [tab, setTab] = useState<'todos' | MakiProfile['status']>('todos');
  const list = db.makiProfiles.filter((m) => tab === 'todos' || m.status === tab || (tab === 'postulante' && m.status === 'en_evaluacion'));
  return (
    <div>
      <PageHeader title="Makis" subtitle="Red de prestadores, evaluación en 4 capas y desempeño." />
      <Tabs
        tabs={[
          { value: 'todos', label: 'Todos' },
          { value: 'postulante', label: 'Por evaluar', count: db.makiProfiles.filter((m) => ['postulante', 'en_evaluacion'].includes(m.status)).length },
          { value: 'habilitado', label: 'Habilitados' },
          { value: 'suspendido', label: 'Suspendidos' },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((m) => {
          const u = db.users.find((x) => x.id === m.userId)!;
          const st = makiStats(db, m.userId);
          return (
            <Link key={m.userId} to={`/admin/makis/${m.userId}`} className="rounded-2xl border border-line bg-white p-4 transition hover:border-turq-500">
              <div className="flex items-center gap-3">
                <Avatar name={u.name} />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{u.name}</p>
                  <p className="text-sm text-ink-600">{m.specialties.map((s) => db.categories.find((c) => c.id === s)?.name).join(', ')}</p>
                </div>
                <Badge tone={MAKI_STATUS_TONE[m.status]}>{m.status.replace('_', ' ')}</Badge>
              </div>
              <p className="mt-3 flex flex-wrap gap-x-4 text-xs text-ink-600">
                <span>{st.completed} servicios</span><span>{st.ratingAvg ? `${st.ratingAvg.toFixed(1)} ★` : 'sin notas'}</span><span>prueba {m.verification.tradeTestScore ?? '—'}/20</span><span>{st.reworkCount} retrabajos</span><span>{m.districts.length} distritos</span>
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AdminMakiDetail() {
  const { id } = useParams();
  const { db, run } = useApp();
  const mp = db.makiProfiles.find((m) => m.userId === id);
  const [v, setV] = useState(() => ({ identity: mp?.verification.identity ?? false, background: mp?.verification.background ?? false, references: mp?.verification.references ?? false, tradeTestScore: mp?.verification.tradeTestScore ?? null, notes: mp?.verification.notes ?? '' }));
  const [reason, setReason] = useState('');
  if (!mp) return <EmptyState title="Maki no encontrado" />;
  const u = db.users.find((x) => x.id === mp.userId)!;
  const st = makiStats(db, mp.userId);
  const jobs = db.requests.filter((r) => r.assignedMakiId === mp.userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <Link to="/admin/makis" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-petrol-700"><ArrowLeft className="h-4 w-4" />Makis</Link>
      <PageHeader title={<span className="flex items-center gap-2">{u.name} <Badge tone={MAKI_STATUS_TONE[mp.status]}>{mp.status.replace('_', ' ')}</Badge></span>} subtitle={`${u.email} · ${u.phone} · ${mp.experienceYears} años · desde ${formatDate(mp.joinedAt)}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card className="p-5 text-sm">
            <p className="font-bold">Perfil</p>
            <p className="mt-1 text-ink-700">{mp.bio || 'Sin presentación.'}</p>
            <p className="mt-2"><span className="font-semibold">Especialidades:</span> {mp.specialties.map((s) => db.categories.find((c) => c.id === s)?.name).join(', ')}</p>
            <p><span className="font-semibold">Zonas:</span> {mp.districts.join(', ')}</p>
            <p><span className="font-semibold">Referencias:</span> {mp.references.map((r) => `${r.name} (${r.phone})`).join(' · ')}</p>
          </Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Servicios" value={st.completed} />
            <Stat label="Calificación" value={st.ratingAvg ? st.ratingAvg.toFixed(1) : '—'} hint={`ajustada ${st.bayesRating.toFixed(2)}`} />
            <Stat label="Calidad" value={pct(st.qualityScore)} hint={`${st.reworkCount} retrabajos`} />
            <Stat label="Aceptación" value={st.offersReceived ? pct(st.offersAccepted / st.offersReceived) : '—'} hint={`${st.offersAccepted} de ${st.offersReceived}`} />
          </div>
          <section>
            <h2 className="mb-2 font-bold">Trabajos</h2>
            {jobs.length ? <div className="space-y-2">{jobs.slice(0, 8).map((r) => <RequestRow key={r.id} db={db} req={r} to={`/admin/solicitudes/${r.id}`} perspective="admin" />)}</div> : <EmptyState title="Sin trabajos todavía" />}
          </section>
        </div>
        <aside className="space-y-4">
          <Card>
            <CardHeader icon={<ShieldCheck className="h-5 w-5" />} title="Evaluación en 4 capas" subtitle={mp.verification.reviewedAt ? `Última revisión ${formatDate(mp.verification.reviewedAt)}` : 'Sin revisar'} />
            <div className="space-y-3 p-5">
              <Checkbox checked={v.identity} onChange={(x) => setV({ ...v, identity: x })} label="Identidad verificada" description="DNI + comparación con foto actual." />
              <Checkbox checked={v.background} onChange={(x) => setV({ ...v, background: x })} label="Antecedentes" description="Certificado tramitado por el postulante." />
              <Checkbox checked={v.references} onChange={(x) => setV({ ...v, references: x })} label="Referencias" description="Dos clientes previos favorables." />
              <Field label={`Prueba de oficio (0–20, mínimo ${db.settings.tradeTestMin})`}>
                <Input type="number" min={0} max={20} value={v.tradeTestScore ?? ''} onChange={(e) => setV({ ...v, tradeTestScore: e.target.value === '' ? null : Number(e.target.value) })} className="max-w-[120px]" />
              </Field>
              <Field label="Notas" optional><Textarea value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} className="min-h-[60px]" /></Field>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="secondary" onClick={() => run((d, a) => evaluateMaki(d, a, mp.userId, v, 'guardar'), 'Evaluación guardada.')}>Guardar</Button>
                {mp.status !== 'habilitado' && mp.status !== 'suspendido' && <Button size="sm" onClick={() => run((d, a) => evaluateMaki(d, a, mp.userId, v, 'habilitar'), `${u.name} quedó habilitado como Maki Probado.`)}>Habilitar</Button>}
                {['postulante', 'en_evaluacion'].includes(mp.status) && <Button size="sm" variant="danger" onClick={() => run((d, a) => evaluateMaki(d, a, mp.userId, v, 'rechazar'), 'Postulación rechazada.')}>Rechazar</Button>}
              </div>
            </div>
          </Card>
          {['habilitado', 'suspendido'].includes(mp.status) && (
            <Card className="space-y-3 p-5">
              <p className="font-bold">{mp.status === 'habilitado' ? 'Suspender' : 'Reactivar'}</p>
              {mp.status === 'habilitado' && <Field label="Motivo"><Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: cobro fuera de la plataforma" /></Field>}
              <Button size="sm" variant={mp.status === 'habilitado' ? 'danger' : 'primary'} onClick={() => run((d, a) => setMakiStatus(d, a, mp.userId, mp.status === 'habilitado' ? 'suspendido' : 'habilitado', reason), mp.status === 'habilitado' ? 'Maki suspendido.' : 'Maki reactivado.')}>
                {mp.status === 'habilitado' ? 'Suspender Maki' : 'Reactivar Maki'}
              </Button>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ═════════ Clientes ═════════ */
export function AdminClients() {
  const { db } = useApp();
  const [q, setQ] = useState('');
  const clients = db.users.filter((u) => u.role === 'client' && (!q || `${u.name} ${u.email} ${u.district}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <PageHeader title="Clientes" subtitle="Clientes, su Perfil del Hogar y su historial." />
      <Input className="mb-4 max-w-sm" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface text-left text-xs font-semibold text-ink-600">
            <tr><th className="px-5 py-2.5">Cliente</th><th className="px-3">Distrito</th><th className="px-3 text-right">Solicitudes</th><th className="px-3 text-right">Completados</th><th className="px-3 text-right">Gasto</th><th className="px-3">Mi Maki</th><th className="px-5">Alta</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {clients.map((c) => {
              const reqs = db.requests.filter((r) => r.clientId === c.id);
              const pays = db.payments.filter((p) => p.clientId === c.id);
              const home = db.homeProfiles.find((h) => h.clientId === c.id);
              return (
                <tr key={c.id}>
                  <td className="px-5 py-3"><p className="font-semibold">{c.name}</p><p className="text-xs text-ink-600">{c.email}</p></td>
                  <td className="px-3">{home?.district ?? c.district}</td>
                  <td className="px-3 text-right tabular-nums">{reqs.length}</td>
                  <td className="px-3 text-right tabular-nums">{reqs.filter((r) => r.status === 'completada').length}</td>
                  <td className="px-3 text-right"><Money value={pays.reduce((a, p) => a + p.amount, 0)} /></td>
                  <td className="px-3">{home?.favoriteMakiIds.map((id) => db.users.find((u) => u.id === id)?.name.split(' ')[0]).join(', ') || '—'}</td>
                  <td className="px-5 text-ink-600">{formatDate(c.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <Card className="mt-6">
        <CardHeader title="Interés en categorías futuras" subtitle="Demanda registrada para la escalera de confianza." />
        <ul className="divide-y divide-line text-sm">
          {db.interests.map((i) => <li key={i.id} className="flex justify-between gap-2 px-5 py-2.5"><span>{i.description} · {db.users.find((u) => u.id === i.clientId)?.name}</span><Badge tone="muted">{db.categories.find((c) => c.id === i.categoryId)?.name}</Badge></li>)}
        </ul>
      </Card>
    </div>
  );
}

/* ═════════ Incidencias y garantías ═════════ */
export function AdminIncidents() {
  const { db } = useApp();
  const [tab, setTab] = useState<'abiertas' | 'cerradas' | 'garantias'>('abiertas');
  const open = db.incidents.filter((i) => ['abierta', 'en_correccion'].includes(i.status));
  const closed = db.incidents.filter((i) => !['abierta', 'en_correccion'].includes(i.status));
  const warranties = db.requests.filter((r) => r.status === 'completada' && r.warrantyUntil).sort((a, b) => b.warrantyUntil!.localeCompare(a.warrantyUntil!));
  return (
    <div>
      <PageHeader title="Incidencias y garantías" subtitle="Respuesta ≤ 24 h · corrección por garantía ≤ 72 h." />
      <Tabs tabs={[{ value: 'abiertas', label: 'Abiertas', count: open.length }, { value: 'cerradas', label: 'Cerradas' }, { value: 'garantias', label: 'Garantías' }]} value={tab} onChange={setTab} />
      {tab !== 'garantias' ? (
        (tab === 'abiertas' ? open : closed).length ? (
          <div className="space-y-3">{(tab === 'abiertas' ? open : closed).map((i) => <IncidentCard key={i.id} inc={i} />)}</div>
        ) : (
          <EmptyState title={tab === 'abiertas' ? 'Sin incidencias abiertas' : 'Sin incidencias cerradas'} />
        )
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface text-left text-xs font-semibold text-ink-600"><tr><th className="px-5 py-2.5">Servicio</th><th className="px-3">Cliente</th><th className="px-3">Maki</th><th className="px-3">Vence</th><th className="px-5">Estado</th></tr></thead>
            <tbody className="divide-y divide-line">
              {warranties.map((r) => {
                const vigente = new Date(r.warrantyUntil!) > new Date();
                const claims = db.incidents.filter((i) => i.requestId === r.id && i.type === 'garantia');
                return (
                  <tr key={r.id}>
                    <td className="px-5 py-2.5"><Link to={`/admin/solicitudes/${r.id}`} className="font-medium hover:text-petrol-700">{r.code} · {r.lines[0]?.description}</Link></td>
                    <td className="px-3">{db.users.find((u) => u.id === r.clientId)?.name}</td>
                    <td className="px-3">{db.users.find((u) => u.id === r.assignedMakiId)?.name}</td>
                    <td className="px-3">{formatDate(r.warrantyUntil!)}</td>
                    <td className="px-5"><Badge tone={vigente ? 'mint' : 'muted'}>{vigente ? 'Vigente' : 'Vencida'}</Badge>{claims.length > 0 && <Badge tone="warn" className="ml-1">{claims.length} reclamo</Badge>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function IncidentCard({ inc }: { inc: Incident }) {
  const { db, run } = useApp();
  const req = db.requests.find((r) => r.id === inc.requestId)!;
  const [status, setStatus] = useState<IncidentStatus>(inc.type === 'garantia' || req.status === 'con_incidencia' ? 'en_correccion' : 'resuelta');
  const [resolution, setResolution] = useState('');
  const [rework, setRework] = useState(inc.type === 'garantia' || inc.type === 'conformidad');
  const overdue = ['abierta', 'en_correccion'].includes(inc.status) && new Date(inc.responseDue) < new Date();
  const closed = !['abierta', 'en_correccion'].includes(inc.status);
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={inc.type === 'seguridad' || inc.type === 'cobro' ? 'accent' : 'warn'}>{inc.type}</Badge>
          <Link to={`/admin/solicitudes/${req.id}`} className="font-semibold hover:text-petrol-700">{req.code}</Link>
          <StatusBadge status={req.status} />
        </div>
        <Badge tone={closed ? 'mint' : overdue ? 'accent' : 'muted'}>{closed ? inc.status.replace('_', ' ') : overdue ? 'SLA vencido' : `Responder antes de ${formatDateTime(inc.responseDue)}`}</Badge>
      </div>
      <p className="mt-2 text-sm">{inc.description}</p>
      <p className="mt-1 text-xs text-ink-600">Cliente: {db.users.find((u) => u.id === inc.clientId)?.name} · Maki: {db.users.find((u) => u.id === inc.makiId)?.name ?? '—'} · {formatDateTime(inc.createdAt)}{inc.fixDue && ` · corrección antes de ${formatDateTime(inc.fixDue)}`}</p>
      {inc.resolution && <p className="mt-2 rounded-lg bg-surface px-3 py-2 text-sm">Resolución: {inc.resolution}{inc.countsAsRework && ' · cuenta como retrabajo'}</p>}
      {!closed && (
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <ChipGroup
            options={[
              { value: 'en_correccion', label: 'Enviar a corrección (sin costo)' },
              { value: 'resuelta', label: 'Resuelta' },
              { value: 'no_procede', label: 'No procede' },
            ]}
            value={status}
            onChange={(v) => setStatus(v as IncidentStatus)}
          />
          <Input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="Decisión o acción tomada (visible para cliente y Maki)" />
          <Checkbox checked={rework} onChange={setRework} label="Cuenta como retrabajo (afecta North Star y calidad del Maki)" />
          <Button size="sm" onClick={() => run((d, a) => resolveIncident(d, a, inc.id, { status, resolution, countsAsRework: rework }), 'Incidencia actualizada.')}>Registrar decisión</Button>
        </div>
      )}
    </Card>
  );
}

/* ═════════ Liquidaciones ═════════ */
export function AdminSettlements() {
  const { db, run } = useApp();
  const makis = db.makiProfiles.filter((m) => db.payments.some((p) => p.makiId === m.userId));
  return (
    <div className="space-y-6">
      <PageHeader title="Liquidaciones" subtitle="Pagos registrados tras la conformidad, agrupados por Maki. Todo es simulado." action={<SimulatedTag>Sin pasarela real</SimulatedTag>} />
      <div className="grid gap-3 md:grid-cols-2">
        {makis.map((m) => {
          const u = db.users.find((x) => x.id === m.userId)!;
          const pending = db.payments.filter((p) => p.makiId === m.userId && !p.settlementId);
          const total = pending.reduce((a, p) => a + p.makiNet, 0);
          return (
            <Card key={m.userId} className="flex items-center gap-3 p-4">
              <Avatar name={u.name} />
              <div className="flex-1">
                <p className="font-bold">{u.name}</p>
                <p className="text-sm text-ink-600">{pending.length} pagos por liquidar · <Money value={total} className="font-semibold text-ink-900" /></p>
              </div>
              <Button size="sm" disabled={!pending.length} icon={<Wallet className="h-4 w-4" />} onClick={() => run((d, a) => createSettlement(d, a, m.userId), `Liquidación simulada registrada para ${u.name}.`)}>Liquidar</Button>
            </Card>
          );
        })}
      </div>
      <Card className="overflow-x-auto">
        <CardHeader title="Historial de liquidaciones" />
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface text-left text-xs font-semibold text-ink-600"><tr><th className="px-5 py-2.5">Fecha</th><th className="px-3">Maki</th><th className="px-3 text-right">Servicios</th><th className="px-5 text-right">Total</th></tr></thead>
          <tbody className="divide-y divide-line">
            {db.settlements.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((s) => (
              <tr key={s.id}><td className="px-5 py-2.5">{formatDateTime(s.createdAt)}</td><td className="px-3">{db.users.find((u) => u.id === s.makiId)?.name}</td><td className="px-3 text-right">{s.paymentIds.length}</td><td className="px-5 text-right font-semibold"><Money value={s.total} /></td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export { STATUS_LABEL };
