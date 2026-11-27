import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Heart, Hourglass, MapPin, ReceiptText, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { MakiCard, MakiProfileModal, ScopeCard, VisitCodeCard } from '@/components/domain';
import { Badge, Button, Card, CardHeader, Checkbox, ChipGroup, EmptyState, Field, Input, Modal, Money, Notice, PhotoStrip, Rating, Select, Stepper, StatusBadge, Textarea, Timeline } from '@/components/ui';
import { WINDOW_LABEL, WINDOW_SHORT } from '@/config/catalog';
import { approvedExtrasTotal, finalAmount, linesTotal, pct } from '@/domain/economics';
import { progressStep } from '@/domain/stateMachine';
import type { IncidentType, ServiceRequest, TimeWindow } from '@/domain/types';
import { dateOnlyPlus, formatDate, formatDateTime } from '@/lib/utils';
import { makiStats, recommendMakis } from '@/matching/engine';
import { approveAndSendOffer, cancelRequest, confirmConformity, decideExtra, reportIssue, reschedule, toggleFavoriteMaki } from '@/services/requestService';
import { useActor, useApp } from '@/store/AppStore';

const STEPS = ['Propuesta', 'Maki acepta', 'Confirmada', 'En curso', 'Conformidad', 'Pagado'];

export default function RequestDetail() {
  const { id } = useParams();
  const { db } = useApp();
  const me = useActor();
  const req = db.requests.find((r) => r.id === id && r.clientId === me.id);
  if (!req) return <EmptyState title="Solicitud no encontrada" description="Puede que no exista o que no te pertenezca." action={<Link to="/app"><Button size="sm">Volver al inicio</Button></Link>} />;
  return <Detail req={req} />;
}

function Detail({ req }: { req: ServiceRequest }) {
  const { db, run } = useApp();
  const me = useActor();
  const [params] = useSearchParams();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const maki = req.assignedMakiId ? db.users.find((u) => u.id === req.assignedMakiId) : undefined;
  const selected = req.selectedMakiId ? db.users.find((u) => u.id === req.selectedMakiId) : undefined;
  const payment = req.paymentId ? db.payments.find((p) => p.id === req.paymentId) : undefined;
  const canCancel = ['en_revision', 'propuesta_lista', 'esperando_maki', 'confirmada'].includes(req.status);
  const inWarranty = req.status === 'completada' && req.warrantyUntil && new Date(req.warrantyUntil) > new Date();
  const home = db.homeProfiles.find((h) => h.clientId === me.id);
  const openIncidents = db.incidents.filter((i) => i.requestId === req.id && ['abierta', 'en_correccion'].includes(i.status));

  return (
    <div>
      <Link to="/app" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-petrol-700"><ArrowLeft className="h-4 w-4" />Inicio</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><span className="text-sm font-semibold text-ink-400">{req.code}</span><StatusBadge status={req.status} /></div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{req.lines.length ? req.lines.map((l) => l.description).join(' + ') : 'Solicitud en revisión'}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-ink-600">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(req.preferredDate, { weekday: 'long', day: 'numeric', month: 'long' })} · {WINDOW_SHORT[req.window]}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{req.district}</span>
          </p>
        </div>
      </div>
      {req.status !== 'cancelada' && <div className="mb-6"><Stepper steps={STEPS} current={progressStep(req.status)} /></div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {req.status === 'en_revision' && (
            <Card className="p-5">
              <Notice tone="warn" icon={<Hourglass className="h-4 w-4" />} title="Un especialista está verificando tu pedido">
                Definirá el alcance y el precio contra nuestro tarifario. Te avisaremos en ≤ 2 horas hábiles. No pagas nada hasta aprobarlo.
              </Notice>
              <p className="mt-4 text-sm font-semibold text-ink-600">Lo que nos contaste</p>
              <p className="mt-1">{req.description}</p>
              <p className="mt-2 text-sm text-ink-600">Orientación inicial: {req.interpretation.summary}</p>
            </Card>
          )}

          {req.status === 'propuesta_lista' && <Proposal req={req} preferMakiId={params.get('maki') ?? undefined} />}

          {req.status === 'esperando_maki' && selected && (
            <>
              <Notice icon={<Clock className="h-4 w-4" />} title={`Esperando que ${selected.name.split(' ')[0]} acepte`}>
                Le enviamos tu solicitud con el alcance y precio que aprobaste. El Maki decide si puede tomarla.{' '}
                {req.backupMakiIds?.length
                  ? `Si no puede, la enviaremos a tu siguiente opción: ${req.backupMakiIds.map((id) => db.users.find((u) => u.id === id)?.name.split(' ')[0]).join(' y luego ')}.`
                  : 'Si no puede, te mostraremos otras opciones.'}
              </Notice>
              <MakiCard db={db} makiId={selected.id} categoryId={req.categoryId} showContact />
              <ScopeCard db={db} lines={req.lines} route={req.route} verifiedAt={req.quoteVerifiedAt} compact />
            </>
          )}

          {req.status === 'confirmada' && maki && (
            <>
              <VisitCodeCard code={req.visitCode!} makiName={maki.name} date={req.preferredDate} window={req.window} />
              <MakiCard db={db} makiId={maki.id} categoryId={req.categoryId} showContact />
              <ScopeCard db={db} lines={req.lines} route={req.route} verifiedAt={req.quoteVerifiedAt} compact />
            </>
          )}

          {req.status === 'en_curso' && (
            <>
              <Notice icon={<ShieldCheck className="h-4 w-4" />} title={`${maki?.name ?? 'Tu Maki'} está trabajando`}>
                Se trabaja solo en el área definida. Cualquier adicional requiere tu aprobación aquí; si no lo apruebas, no se cobra.
              </Notice>
              <ExtrasPanel req={req} />
              <ScopeCard db={db} lines={req.lines} route={req.route} verifiedAt={req.quoteVerifiedAt} compact />
            </>
          )}

          {req.status === 'evidencia_enviada' && (
            <>
              <EvidenceCard req={req} />
              <ConformityForm req={req} onIssue={() => setIssueOpen(true)} />
            </>
          )}

          {req.status === 'con_incidencia' && (
            <>
              <Notice tone="warn" icon={<ShieldAlert className="h-4 w-4" />} title="Revisando tu reporte">
                MakiYa recibió tu reporte y responderá en ≤ 24 h. Si procede, el Maki corregirá sin costo antes de que firmes. No se registra ningún pago mientras tanto.
              </Notice>
              {openIncidents.map((i) => <Card key={i.id} className="p-4 text-sm"><p className="font-semibold">Tu reporte</p><p className="text-ink-700">{i.description}</p><p className="mt-1 text-xs text-ink-400">Respuesta antes de {formatDateTime(i.responseDue)}</p></Card>)}
              <EvidenceCard req={req} />
            </>
          )}

          {req.status === 'completada' && (
            <>
              <Card className="overflow-hidden">
                <div className="flex items-center gap-3 bg-mint-50 px-5 py-4">
                  <CheckCircle2 className="h-6 w-6 text-turq-600" />
                  <div>
                    <p className="font-bold text-petrol-800">Servicio completado con tu conformidad</p>
                    <p className="text-sm text-ink-700">Firmado el {formatDateTime(req.conformity!.signedAt)}</p>
                  </div>
                </div>
                {payment && (
                  <div className="space-y-2 px-5 py-4 text-sm">
                    <div className="flex items-center justify-between"><span className="flex items-center gap-1.5 font-semibold"><ReceiptText className="h-4 w-4 text-turq-600" />Comprobante de pago</span><Badge tone="muted">Pago simulado</Badge></div>
                    {req.lines.map((l) => <div key={l.id} className="flex justify-between"><span className="text-ink-600">{l.qty} × {l.description}</span><Money value={l.qty * l.unitPrice} /></div>)}
                    {req.extras.filter((e) => e.status === 'aprobado').map((e) => <div key={e.id} className="flex justify-between"><span className="text-ink-600">{e.kind === 'material' ? 'Material' : 'Adicional'} aprobado: {e.description}</span><Money value={e.amount} /></div>)}
                    <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><span>Total pagado</span><Money value={payment.amount} className="text-petrol-700" /></div>
                    <p className="text-xs text-ink-400">ID {payment.id} · {formatDateTime(payment.paidAt)} · No se procesó dinero real.</p>
                  </div>
                )}
              </Card>
              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-turq-600" />
                  <div className="flex-1">
                    <p className="font-bold">Garantía de mano de obra {inWarranty ? 'vigente' : 'vencida'}</p>
                    <p className="text-sm text-ink-600">Hasta el {formatDate(req.warrantyUntil!, { day: 'numeric', month: 'long', year: 'numeric' })}. Cubre la misma falla; no cubre materiales del cliente, mal uso ni intervenciones de terceros. Corrección en ≤ 72 h.</p>
                  </div>
                </div>
                {inWarranty && <Button className="mt-4" variant="secondary" icon={<ShieldAlert className="h-4 w-4" />} onClick={() => setIssueOpen(true)}>Usar garantía</Button>}
                {openIncidents.length > 0 && <Notice tone="warn" className="mt-3">Tienes un reclamo de garantía en curso. Corrección antes de {formatDateTime(openIncidents[0].fixDue ?? openIncidents[0].responseDue)}.</Notice>}
              </Card>
              {maki && (
                <Card className="p-5">
                  <p className="font-bold">¿Te gustó trabajar con {maki.name.split(' ')[0]}?</p>
                  <p className="text-sm text-ink-600">Guárdalo como Mi Maki: lo verás primero la próxima vez y la comisión de referencia baja a {pct(db.settings.commissionRepeat)}, así el Maki gana más.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant={home?.favoriteMakiIds.includes(maki.id) ? 'soft' : 'secondary'} icon={<Heart className={`h-4 w-4 ${home?.favoriteMakiIds.includes(maki.id) ? 'fill-accent-500 text-accent-500' : ''}`} />} onClick={() => run((d, a) => toggleFavoriteMaki(d, a, maki.id))}>
                      {home?.favoriteMakiIds.includes(maki.id) ? 'Es Mi Maki' : 'Guardar como Mi Maki'}
                    </Button>
                    <Link to={`/app/pedir?maki=${maki.id}`}><Button icon={<RotateCcw className="h-4 w-4" />}>Repetir con {maki.name.split(' ')[0]}</Button></Link>
                  </div>
                </Card>
              )}
            </>
          )}

          {req.status === 'cancelada' && <Notice tone="neutral" title="Solicitud cancelada">{req.cancellation?.reason}</Notice>}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader title="Seguimiento" />
            <div className="px-5 py-4"><Timeline items={req.timeline} /></div>
          </Card>
          <Card className="p-5 text-sm">
            <p className="font-semibold text-ink-600">Tu pedido</p>
            <p className="mt-1">{req.description}</p>
            {req.photos.length > 0 && <div className="mt-3"><PhotoStrip photos={req.photos} /></div>}
          </Card>
          {canCancel && <Button variant="danger" block onClick={() => setCancelOpen(true)}>Cancelar solicitud</Button>}
          {['confirmada', 'en_curso'].includes(req.status) && <Button variant="ghost" block onClick={() => setIssueOpen(true)}>Reportar un problema de seguridad o cobro</Button>}
        </aside>
      </div>
      <CancelModal req={req} open={cancelOpen} onClose={() => setCancelOpen(false)} />
      <IssueModal req={req} open={issueOpen} onClose={() => setIssueOpen(false)} />
    </div>
  );
}

type SortKey = 'recomendado' | 'calificacion' | 'trabajos' | 'experiencia';

function Proposal({ req, preferMakiId }: { req: ServiceRequest; preferMakiId?: string }) {
  const { db, run } = useApp();
  const match = useMemo(() => recommendMakis(db, req), [db, req]);
  const recommended = req.candidates;
  const allEligible = match.eligible;
  const initial = allEligible.find((c) => c.makiId === preferMakiId)?.makiId ?? recommended.find((c) => c.isMyMaki)?.makiId ?? recommended[0]?.makiId;
  const [makiId, setMakiId] = useState<string | undefined>(initial);
  const [mode, setMode] = useState<'recomendados' | 'todos'>('recomendados');
  const [sort, setSort] = useState<SortKey>('recomendado');
  const [useBackups, setUseBackups] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [date, setDate] = useState(req.preferredDate);
  const [win, setWin] = useState<TimeWindow>(req.window);
  const total = linesTotal(req.lines);
  const rejected = req.offers.filter((o) => o.status === 'rechazada' && o.reason !== 'Solicitud cancelada');
  const chosen = db.users.find((u) => u.id === makiId);

  const sorted = useMemo(() => {
    const list = [...(mode === 'recomendados' ? recommended : allEligible)];
    const st = (id: string) => makiStats(db, id, req.categoryId);
    const years = (id: string) => db.makiProfiles.find((m) => m.userId === id)?.experienceYears ?? 0;
    if (sort === 'calificacion') list.sort((a, b) => st(b.makiId).bayesRating - st(a.makiId).bayesRating);
    if (sort === 'trabajos') list.sort((a, b) => st(b.makiId).completed - st(a.makiId).completed);
    if (sort === 'experiencia') list.sort((a, b) => years(b.makiId) - years(a.makiId));
    return list;
  }, [mode, sort, recommended, allEligible, db, req.categoryId]);

  // Respaldo: las siguientes opciones recomendadas (o compatibles) distintas de la elegida.
  const backups = useMemo(() => {
    const pool = [...recommended, ...allEligible].map((c) => c.makiId).filter((id, i, arr) => arr.indexOf(id) === i && id !== makiId);
    return pool.slice(0, 2);
  }, [recommended, allEligible, makiId]);

  const send = () => makiId && run((d, a) => approveAndSendOffer(d, a, req.id, makiId, useBackups ? backups : []), `Enviamos tu solicitud a ${chosen?.name.split(' ')[0]}.`);

  return (
    <>
      {rejected.length > 0 && (
        <Notice tone="warn" title="Tu Maki anterior no pudo tomar el trabajo">
          {rejected.map((o) => `${db.users.find((u) => u.id === o.makiId)?.name}: «${o.reason}»`).join(' · ')}. Elige otra opción.
        </Notice>
      )}
      {req.quoteVerifiedAt && <Notice icon={<ShieldCheck className="h-4 w-4" />} title="Presupuesto verificado por MakiYa">Un evaluador revisó el alcance y el precio contra el tarifario.</Notice>}
      <ScopeCard db={db} lines={req.lines} route={req.route} verifiedAt={req.quoteVerifiedAt} />
      <Notice icon={<ShieldCheck className="h-4 w-4" />}>
        <strong>Garantía de 30 días</strong> sobre la mano de obra. <strong>Cero adicionales</strong> sin tu aprobación escrita; los materiales extra se cobran al costo con boleta. Pagas <strong>después</strong> de la prueba de cierre.
      </Notice>

      <section>
        <h2 className="mb-1 text-lg font-bold">Elige a tu Maki</h2>
        <p className="mb-3 text-sm text-ink-600">
          Todos están verificados en 4 capas, atienden {req.district} y tienen libre tu franja. Te recomendamos {recommended.length === 1 ? 'uno' : recommended.length}, pero puedes ver a todos, revisar sus perfiles y elegir a quien prefieras.
        </p>
        {allEligible.length ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1" role="tablist">
                {([['recomendados', `Recomendados (${recommended.length})`], ['todos', `Todos los disponibles (${allEligible.length})`]] as const).map(([v, l]) => (
                  <button key={v} role="tab" aria-selected={mode === v} onClick={() => setMode(v)} className={`h-9 rounded-lg px-3 text-sm font-semibold ${mode === v ? 'bg-white text-petrol-700 shadow-card' : 'text-ink-600'}`}>{l}</button>
                ))}
              </div>
              <Select aria-label="Ordenar Makis" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="h-10 w-auto text-sm">
                <option value="recomendado">Orden recomendado</option>
                <option value="calificacion">Mejor calificación</option>
                <option value="trabajos">Más trabajos</option>
                <option value="experiencia">Más años de experiencia</option>
              </Select>
            </div>
            <div className="space-y-2" role="radiogroup">
              {sorted.map((c) => (
                <MakiCard key={c.makiId} db={db} makiId={c.makiId} candidate={c} categoryId={req.categoryId} selected={makiId === c.makiId} onSelect={() => setMakiId(c.makiId)} onViewProfile={() => setProfileId(c.makiId)} />
              ))}
            </div>
            {mode === 'recomendados' && allEligible.length > recommended.length && (
              <button type="button" onClick={() => setMode('todos')} className="mt-2 text-sm font-semibold text-petrol-700 hover:underline">
                Ver los {allEligible.length - recommended.length} Makis disponibles restantes
              </button>
            )}
          </>
        ) : (
          <Card className="p-5">
            <p className="font-bold">No hay Makis disponibles en esa franja</p>
            <p className="text-sm text-ink-600">Prueba con otra fecha u horario. MakiYa también recibió una alerta.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Fecha"><Input type="date" min={dateOnlyPlus(1)} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Franja">
                <Select value={win} onChange={(e) => setWin(e.target.value as TimeWindow)}>
                  {(Object.keys(WINDOW_LABEL) as TimeWindow[]).map((w) => <option key={w} value={w}>{WINDOW_LABEL[w]}</option>)}
                </Select>
              </Field>
            </div>
            <Button className="mt-3" variant="secondary" onClick={() => run((d, a) => reschedule(d, a, req.id, date, win), 'Buscamos Makis para la nueva franja.')}>Buscar Makis</Button>
          </Card>
        )}
      </section>

      {allEligible.length > 0 && (
        <Card className="space-y-4 p-5 shadow-pop md:sticky md:bottom-4">
          {backups.length > 0 && (
            <Checkbox
              checked={useBackups}
              onChange={setUseBackups}
              label="Si mi Maki no puede, enviar a mi siguiente opción"
              description={`Para no empezar de nuevo: ${backups.map((id) => db.users.find((u) => u.id === id)?.name.split(' ')[0]).join(' y luego ')}.`}
            />
          )}
          <Checkbox
            checked={approved}
            onChange={setApproved}
            label={<>Apruebo el alcance y el precio de <Money value={total} /></>}
            description="Sé que no se cobrará nada adicional sin mi aprobación escrita y que pagaré después de comprobar el resultado."
          />
          <Button block size="lg" disabled={!approved || !makiId} onClick={send}>
            {chosen ? `Aprobar y enviar a ${chosen.name.split(' ')[0]}` : 'Elige un Maki'}
          </Button>
        </Card>
      )}
      <MakiProfileModal db={db} makiId={profileId} categoryId={req.categoryId} open={!!profileId} onClose={() => setProfileId(null)} onChoose={profileId ? () => setMakiId(profileId) : undefined} />
    </>
  );
}

function ExtrasPanel({ req }: { req: ServiceRequest }) {
  const { run } = useApp();
  if (!req.extras.length) return null;
  return (
    <Card>
      <CardHeader title="Adicionales" subtitle="Solo se cobran si los apruebas." />
      <div className="divide-y divide-line">
        {req.extras.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{e.description}</p>
              <p className="text-xs text-ink-600">{e.kind === 'material' ? `Material al costo · boleta ${e.receipt}` : 'Trabajo adicional'} · <Money value={e.amount} /></p>
            </div>
            {e.status === 'propuesto' ? (
              <div className="flex gap-2">
                <Button size="sm" variant="danger" onClick={() => run((d, a) => decideExtra(d, a, req.id, e.id, false), 'Adicional rechazado. Se mantiene el alcance original.')}>Rechazar</Button>
                <Button size="sm" onClick={() => run((d, a) => decideExtra(d, a, req.id, e.id, true), 'Adicional aprobado por escrito.')}>Aprobar</Button>
              </div>
            ) : (
              <Badge tone={e.status === 'aprobado' ? 'mint' : 'muted'}>{e.status === 'aprobado' ? 'Aprobado' : 'Rechazado'}</Badge>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function EvidenceCard({ req }: { req: ServiceRequest }) {
  if (!req.evidence) return null;
  return (
    <Card>
      <CardHeader title="Evidencia de cierre" subtitle={`Enviada ${formatDateTime(req.evidence.submittedAt)}`} />
      <div className="space-y-4 px-5 py-4">
        <PhotoStrip photos={req.evidence.photos} />
        <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
          {req.evidence.checklist.map((c) => <li key={c.label} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-turq-600" />{c.label}</li>)}
        </ul>
        {req.evidence.notes && <p className="rounded-lg bg-surface px-3 py-2 text-sm text-ink-700">«{req.evidence.notes}»</p>}
      </div>
    </Card>
  );
}

function ConformityForm({ req, onIssue }: { req: ServiceRequest; onIssue: () => void }) {
  const { run } = useApp();
  const me = useActor();
  const [f, setF] = useState({ signedName: '', quality: 0, safety: 0, fairPrice: 0, ease: 0, nps: -1, comment: '' });
  const total = finalAmount(req);
  const extras = approvedExtrasTotal(req.extras);
  const valid = f.signedName.trim().length >= 3 && f.quality && f.safety && f.fairPrice && f.ease && f.nps >= 0;
  return (
    <Card>
      <CardHeader title="Firma tu conformidad" subtitle="Revisa la evidencia. Si todo está bien, firma y se registrará el pago." />
      <div className="space-y-5 px-5 py-5">
        <div className="rounded-xl bg-surface p-4 text-sm">
          <div className="flex justify-between"><span>Precio aprobado</span><Money value={linesTotal(req.lines)} /></div>
          {extras > 0 && <div className="flex justify-between"><span>Adicionales aprobados por ti</span><Money value={extras} /></div>}
          <div className="mt-1 flex justify-between border-t border-line pt-2 text-base font-bold"><span>Total a pagar</span><Money value={total} className="text-petrol-700" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {([['quality', '¿Quedó bien el trabajo?'], ['safety', '¿Te sentiste seguro/a durante la visita?'], ['fairPrice', '¿El precio te pareció justo?'], ['ease', '¿Fue fácil pedir el servicio?']] as const).map(([k, l]) => (
            <Field key={k} label={l}><Rating value={f[k]} onChange={(v) => setF((s) => ({ ...s, [k]: v }))} label={l} /></Field>
          ))}
        </div>
        <Field label="¿Qué tan probable es que recomiendes MakiYa? (0–10)">
          <ChipGroup options={Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: String(i) }))} value={f.nps >= 0 ? String(f.nps) : ''} onChange={(v) => setF((s) => ({ ...s, nps: Number(v) }))} />
        </Field>
        <Field label="Comentario" optional><Textarea value={f.comment} onChange={(e) => { const comment = e.target.value; setF((s) => ({ ...s, comment })); }} className="min-h-[70px]" /></Field>
        <Field label="Firma (escribe tu nombre)" hint={`Ej.: ${me.name}`}><Input value={f.signedName} onChange={(e) => { const signedName = e.target.value; setF((s) => ({ ...s, signedName })); }} /></Field>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={onIssue} icon={<ShieldAlert className="h-4 w-4" />}>Algo no quedó bien</Button>
          <Button className="flex-1" size="lg" disabled={!valid} onClick={() => run((d, a) => confirmConformity(d, a, req.id, f), 'Conformidad firmada. Pago simulado registrado.')}>
            Firmar conformidad y pagar <Money value={total} />
          </Button>
        </div>
        <p className="text-center text-xs text-ink-400">Pago simulado: no se procesa dinero real.</p>
      </div>
    </Card>
  );
}

function CancelModal({ req, open, onClose }: { req: ServiceRequest; open: boolean; onClose: () => void }) {
  const { run } = useApp();
  const [reason, setReason] = useState('');
  const reasons = ['El mueble aún no llegó', 'Cambié de fecha', 'Lo resolví por mi cuenta', 'Otro motivo'];
  return (
    <Modal open={open} onClose={onClose} title="Cancelar solicitud" footer={<><Button variant="secondary" onClick={onClose}>Volver</Button><Button variant="danger" disabled={!reason.trim()} onClick={() => { if (run((d, a) => cancelRequest(d, a, req.id, reason), 'Solicitud cancelada.')) onClose(); }}>Cancelar solicitud</Button></>}>
      <p className="mb-3 text-sm text-ink-600">Antes de la visita puedes cancelar sin costo (modo demostración).</p>
      <ChipGroup options={reasons.map((r) => ({ value: r, label: r }))} value={reason} onChange={(v) => setReason(v as string)} />
    </Modal>
  );
}

function IssueModal({ req, open, onClose }: { req: ServiceRequest; open: boolean; onClose: () => void }) {
  const { run } = useApp();
  const defaultType: IncidentType = req.status === 'completada' ? 'garantia' : req.status === 'evidencia_enviada' ? 'conformidad' : 'seguridad';
  const [type, setType] = useState<IncidentType>(defaultType);
  const [desc, setDesc] = useState('');
  const types: { value: IncidentType; label: string }[] =
    req.status === 'completada'
      ? [{ value: 'garantia', label: 'La falla volvió (garantía)' }, { value: 'cobro', label: 'Problema de cobro' }]
      : req.status === 'evidencia_enviada'
        ? [{ value: 'conformidad', label: 'El trabajo no quedó bien' }, { value: 'cobro', label: 'Me cobraron algo no aprobado' }]
        : [{ value: 'seguridad', label: 'Seguridad / el código no coincidió' }, { value: 'cobro', label: 'Me pidieron un pago fuera de la plataforma' }];
  return (
    <Modal open={open} onClose={onClose} title="Reportar un problema" footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button disabled={desc.trim().length < 10} onClick={() => { if (run((d, a) => reportIssue(d, a, req.id, type, desc), 'Reporte enviado. MakiYa responderá en ≤ 24 h.')) { setDesc(''); onClose(); } }}>Enviar reporte</Button></>}>
      <div className="space-y-4">
        <ChipGroup options={types} value={type} onChange={(v) => setType(v as IncidentType)} />
        <Field label="¿Qué pasó?" hint="Mínimo 10 caracteres."><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        {req.status === 'evidencia_enviada' && <Notice>Mientras se revisa, no se registra ningún pago.</Notice>}
      </div>
    </Modal>
  );
}
