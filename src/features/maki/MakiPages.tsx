import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, CheckCircle2, Circle, Clock, Home, KeyRound, MapPin, PauseCircle, PlusCircle, ShieldCheck, Star, Wallet } from 'lucide-react';
import { analyticsSafe } from './util';
import { PaymentBreakdown, RequestRow } from '@/components/domain';
import { Badge, Button, Card, CardHeader, Checkbox, ChipGroup, EmptyState, Field, Input, Modal, Money, Notice, PageHeader, PhotoPicker, PhotoStrip, Stat, StatusBadge, Tabs, Textarea, Timeline } from '@/components/ui';
import { DISTRICTS, WEEKDAY_LABEL, WINDOW_SHORT } from '@/config/catalog';
import { finalAmount, linesTotal, pct, splitPayment } from '@/domain/economics';
import type { MakiProfile, ServiceRequest, TimeWindow, Weekday } from '@/domain/types';
import { formatDate, formatDateTime } from '@/lib/utils';
import { makiStats } from '@/matching/engine';
import { updateMakiProfile } from '@/services/accountService';
import { proposeExtra, respondOffer, startVisit, submitEvidence } from '@/services/requestService';
import { useActor, useApp } from '@/store/AppStore';

function useMakiProfile(): MakiProfile {
  const { db } = useApp();
  const me = useActor();
  return db.makiProfiles.find((m) => m.userId === me.id)!;
}

const STATUS_COPY: Record<MakiProfile['status'], { tone: 'warn' | 'mint' | 'accent' | 'neutral'; title: string; text: string }> = {
  postulante: { tone: 'warn', title: 'Postulación recibida', text: 'MakiYa te contactará para verificar tu identidad, antecedentes y referencias, y para agendar tu prueba de oficio.' },
  en_evaluacion: { tone: 'warn', title: 'En evaluación', text: 'Estamos revisando tus capas de verificación. Hasta ser habilitado no recibirás solicitudes.' },
  habilitado: { tone: 'mint', title: 'Maki Probado', text: 'Estás habilitado para recibir solicitudes en tus especialidades.' },
  rechazado: { tone: 'accent', title: 'Postulación no aprobada', text: 'No alcanzaste los requisitos en esta oportunidad. Puedes volver a postular en 3 meses.' },
  suspendido: { tone: 'accent', title: 'Cuenta suspendida', text: 'No recibirás solicitudes mientras MakiYa revisa tu caso.' },
};

export function VerificationChecklist({ mp, min }: { mp: MakiProfile; min: number }) {
  const v = mp.verification;
  const rows = [
    { ok: v.identity, label: 'Identidad (DNI y foto actual)' },
    { ok: v.background, label: 'Certificado de antecedentes' },
    { ok: v.references, label: 'Dos referencias favorables' },
    { ok: (v.tradeTestScore ?? 0) >= min, label: `Prueba de oficio (${v.tradeTestScore ?? '—'}/20, mínimo ${min})` },
  ];
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-2">
          {r.ok ? <CheckCircle2 className="h-4 w-4 text-turq-600" /> : <Circle className="h-4 w-4 text-ink-300" />}
          <span className={r.ok ? '' : 'text-ink-600'}>{r.label}</span>
        </li>
      ))}
    </ul>
  );
}

/* ═════════ Solicitudes (ofertas) ═════════ */
export function MakiHome() {
  const { db } = useApp();
  const me = useActor();
  const mp = useMakiProfile();
  const offers = db.requests.filter((r) => r.status === 'esperando_maki' && r.offers.some((o) => o.makiId === me.id && o.status === 'pendiente'));
  const upcoming = db.requests.filter((r) => r.assignedMakiId === me.id && ['confirmada', 'en_curso'].includes(r.status)).sort((a, b) => a.preferredDate.localeCompare(b.preferredDate));
  const copy = STATUS_COPY[mp.status];

  if (mp.status !== 'habilitado') {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={`Hola, ${me.name.split(' ')[0]}`} subtitle="Estado de tu evaluación" />
        <Notice tone={copy.tone} title={copy.title}>{copy.text}</Notice>
        <Card className="mt-4 p-5">
          <p className="mb-3 font-bold">Evaluación en 4 capas</p>
          <VerificationChecklist mp={mp} min={db.settings.tradeTestMin} />
        </Card>
        <Card className="mt-4 p-5 text-sm text-ink-700">
          <p className="font-bold text-ink-900">Mientras tanto</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Completa tu disponibilidad y zonas en <Link to="/maki/perfil" className="font-semibold text-petrol-700 underline">tu perfil</Link>.</li>
            <li>Prepara tu kit: nivel, brocas para concreto y mayólica, tarugos y fotocheck.</li>
            <li>Comisión de referencia: {pct(db.settings.commissionFirst)} en el primer servicio con un cliente y {pct(db.settings.commissionRepeat)} cuando te repite.</li>
          </ul>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Solicitudes para ti" subtitle="Oportunidades con alcance, fecha y precio definidos. Tú decides." />
      {mp.paused && <Notice tone="warn" icon={<PauseCircle className="h-4 w-4" />} title="Pausaste la recepción de solicitudes">Reactívala desde tu perfil para volver a recibir ofertas.</Notice>}
      {offers.length ? (
        <div className="space-y-4">{offers.map((r) => <OfferCard key={r.id} req={r} />)}</div>
      ) : (
        <EmptyState title="No tienes ofertas pendientes" description="Te avisaremos cuando un cliente compatible con tus especialidades, zonas y horarios te elija." />
      )}
      <section>
        <h2 className="mb-3 text-lg font-bold">Próximos trabajos</h2>
        {upcoming.length ? (
          <div className="space-y-2">{upcoming.map((r) => <RequestRow key={r.id} db={db} req={r} to={`/maki/trabajos/${r.id}`} perspective="maki" />)}</div>
        ) : (
          <EmptyState title="Sin trabajos confirmados" />
        )}
      </section>
    </div>
  );
}

function OfferCard({ req }: { req: ServiceRequest }) {
  const { db, run } = useApp();
  const me = useActor();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const isRepeat = db.requests.some((r) => r.id !== req.id && r.clientId === req.clientId && r.assignedMakiId === me.id && r.status === 'completada');
  const split = splitPayment(req, isRepeat, db.settings);
  const client = db.users.find((u) => u.id === req.clientId);
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
        <div className="flex items-center gap-2"><span className="text-sm font-semibold text-ink-400">{req.code}</span><Badge tone="accent">Nueva oferta</Badge>{isRepeat && <Badge tone="mint">Cliente que te repite</Badge>}</div>
        <span className="text-xs text-ink-400">Recibida {formatDateTime(req.offers.find((o) => o.makiId === me.id)!.sentAt)}</span>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-[1fr_260px]">
        <div>
          <p className="text-lg font-bold">{req.lines.map((l) => `${l.qty > 1 ? `${l.qty} × ` : ''}${l.description}`).join(' + ')}</p>
          <p className="mt-1 flex flex-wrap gap-x-4 text-sm text-ink-600">
            <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" />{formatDate(req.preferredDate, { weekday: 'long', day: 'numeric', month: 'short' })} · {WINDOW_SHORT[req.window]}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" />{req.district}</span>
          </p>
          <p className="mt-3 text-sm"><span className="font-semibold">Cliente:</span> {client?.name.split(' ')[0]} · <span className="font-semibold">Resumen:</span> {req.description}</p>
          <ul className="mt-3 space-y-1 text-sm text-ink-700">
            {req.lines.map((l) => {
              const it = db.items.find((i) => i.id === l.itemId);
              return <li key={l.id}>• {l.description}: {it ? `${it.includes[0]}. Prueba de cierre: ${it.closingTest.criterion}` : 'Línea a medida verificada por MakiYa'}</li>;
            })}
          </ul>
          <p className="mt-3 text-xs text-ink-600">La dirección exacta y el Perfil del Hogar se muestran al aceptar.</p>
        </div>
        <div className="rounded-xl bg-surface p-4">
          <PaymentBreakdown amount={split.amount} rate={split.rate} commission={split.commission} makiNet={split.makiNet} isRepeat={isRepeat} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => setRejectOpen(true)}>Rechazar</Button>
            <Button onClick={() => run((d, a) => respondOffer(d, a, req.id, true), 'Trabajo aceptado. El cliente recibió la confirmación.')}>Aceptar</Button>
          </div>
        </div>
      </div>
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Rechazar oferta" footer={<><Button variant="secondary" onClick={() => setRejectOpen(false)}>Volver</Button><Button variant="danger" disabled={!reason} onClick={() => run((d, a) => respondOffer(d, a, req.id, false, reason), 'Oferta rechazada. El cliente verá otras opciones.')}>Rechazar</Button></>}>
        <p className="mb-3 text-sm text-ink-600">Rechazar no te penaliza. Nos ayuda a enviarte mejores oportunidades.</p>
        <ChipGroup options={['Tengo otro compromiso', 'Queda lejos de mi ruta', 'No tengo la herramienta necesaria', 'El trabajo excede mi especialidad'].map((r) => ({ value: r, label: r }))} value={reason} onChange={(v) => setReason(v as string)} />
      </Modal>
    </Card>
  );
}

/* ═════════ Trabajos ═════════ */
export function MakiJobs() {
  const { db } = useApp();
  const me = useActor();
  const [tab, setTab] = useState<'proximos' | 'curso' | 'confirmar' | 'historial'>('proximos');
  const mine = db.requests.filter((r) => r.assignedMakiId === me.id);
  const groups = {
    proximos: mine.filter((r) => r.status === 'confirmada'),
    curso: mine.filter((r) => r.status === 'en_curso'),
    confirmar: mine.filter((r) => ['evidencia_enviada', 'con_incidencia'].includes(r.status)),
    historial: mine.filter((r) => ['completada', 'cancelada'].includes(r.status)).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
  return (
    <div>
      <PageHeader title="Mis trabajos" />
      <Tabs
        tabs={[
          { value: 'proximos', label: 'Próximos', count: groups.proximos.length },
          { value: 'curso', label: 'En curso', count: groups.curso.length },
          { value: 'confirmar', label: 'Por confirmar', count: groups.confirmar.length },
          { value: 'historial', label: 'Historial' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {groups[tab].length ? (
        <div className="space-y-2">{groups[tab].map((r) => <RequestRow key={r.id} db={db} req={r} to={`/maki/trabajos/${r.id}`} perspective="maki" />)}</div>
      ) : (
        <EmptyState title="Nada por aquí" />
      )}
    </div>
  );
}

export function MakiJob() {
  const { id } = useParams();
  const { db, run } = useApp();
  const me = useActor();
  const req = db.requests.find((r) => r.id === id && r.assignedMakiId === me.id);
  const [code, setCode] = useState('');
  const [extraOpen, setExtraOpen] = useState(false);
  if (!req) return <EmptyState title="Trabajo no encontrado" action={<Link to="/maki/trabajos"><Button size="sm">Mis trabajos</Button></Link>} />;
  const client = db.users.find((u) => u.id === req.clientId)!;
  const home = db.homeProfiles.find((h) => h.clientId === req.clientId);
  const payment = req.paymentId ? db.payments.find((p) => p.id === req.paymentId) : undefined;
  const incidents = db.incidents.filter((i) => i.requestId === req.id);

  return (
    <div>
      <Link to="/maki/trabajos" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-ink-600 hover:text-petrol-700"><ArrowLeft className="h-4 w-4" />Mis trabajos</Link>
      <div className="mb-5">
        <div className="flex items-center gap-2"><span className="text-sm font-semibold text-ink-400">{req.code}</span><StatusBadge status={req.status} /></div>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{req.lines.map((l) => `${l.qty > 1 ? `${l.qty} × ` : ''}${l.description}`).join(' + ')}</h1>
        <p className="mt-1 text-sm text-ink-600">{formatDate(req.preferredDate, { weekday: 'long', day: 'numeric', month: 'long' })} · {WINDOW_SHORT[req.window]} · {req.district}</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          {req.status === 'confirmada' && (
            <Card className="p-5">
              <div className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-turq-600" /><p className="font-bold">Iniciar visita segura</p></div>
              <p className="mt-1 text-sm text-ink-600">Al llegar, muestra tu fotocheck y pide a {client.name.split(' ')[0]} que te dicte su código de 4 dígitos.</p>
              <div className="mt-4 flex gap-2">
                <Input inputMode="numeric" maxLength={4} placeholder="0000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className="max-w-[140px] text-center font-mono text-lg tracking-[0.3em]" aria-label="Código de visita" />
                <Button disabled={code.length !== 4} onClick={() => run((d, a) => startVisit(d, a, req.id, code), 'Código verificado. Visita iniciada.')}>Verificar e iniciar</Button>
              </div>
            </Card>
          )}
          {req.status === 'en_curso' && (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold">¿Hace falta algo fuera del alcance?</p>
                    <p className="text-sm text-ink-600">Todo adicional requiere aprobación escrita del cliente. Sin aprobación no se cobra.</p>
                  </div>
                  <Button variant="secondary" icon={<PlusCircle className="h-4 w-4" />} onClick={() => setExtraOpen(true)}>Proponer adicional</Button>
                </div>
                {req.extras.length > 0 && (
                  <ul className="mt-4 divide-y divide-line rounded-xl border border-line text-sm">
                    {req.extras.map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                        <span>{e.description} · <Money value={e.amount} /></span>
                        <Badge tone={e.status === 'aprobado' ? 'mint' : e.status === 'rechazado' ? 'muted' : 'warn'}>{e.status === 'propuesto' ? 'Esperando al cliente' : e.status}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <EvidenceForm req={req} />
            </>
          )}
          {['evidencia_enviada', 'con_incidencia'].includes(req.status) && (
            <Notice tone={req.status === 'con_incidencia' ? 'warn' : 'mint'} title={req.status === 'con_incidencia' ? 'El cliente reportó un problema' : 'Esperando la conformidad del cliente'}>
              {req.status === 'con_incidencia' ? 'MakiYa revisará la evidencia y te indicará si corresponde una corrección.' : `El pago de ${new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(finalAmount(req))} se registra cuando el cliente firme.`}
            </Notice>
          )}
          {incidents.map((i) => (
            <Card key={i.id} className="p-4 text-sm">
              <div className="flex items-center justify-between"><p className="font-semibold">Incidencia · {i.type}</p><Badge tone={i.status === 'resuelta' ? 'mint' : 'warn'}>{i.status.replace('_', ' ')}</Badge></div>
              <p className="mt-1 text-ink-700">{i.description}</p>
              {i.resolution && <p className="mt-1 text-ink-600">Resolución: {i.resolution}</p>}
            </Card>
          ))}
          {req.status === 'completada' && payment && (
            <Card className="p-5">
              <p className="mb-3 font-bold">Liquidación de este servicio</p>
              <PaymentBreakdown amount={payment.amount} rate={payment.commissionRate} commission={payment.commission} makiNet={payment.makiNet} isRepeat={payment.isRepeat} />
              <p className="mt-3 text-xs text-ink-600">{payment.settlementId ? 'Liquidado (simulado).' : 'Pendiente de liquidación semanal.'} Evaluación del cliente: {req.conformity?.quality}/5.</p>
            </Card>
          )}
          <Card>
            <CardHeader title="Alcance aprobado" subtitle={<>Total aprobado <Money value={linesTotal(req.lines)} /></>} />
            <div className="divide-y divide-line">
              {req.lines.map((l) => {
                const it = db.items.find((i) => i.id === l.itemId);
                return (
                  <div key={l.id} className="px-5 py-3 text-sm">
                    <p className="font-semibold">{l.qty} × {l.description}</p>
                    {it && <p className="text-ink-600">Incluye: {it.includes.join('; ')}. No incluye: {it.excludes.join('; ')}.</p>}
                  </div>
                );
              })}
            </div>
          </Card>
          {req.evidence && <Card className="p-5"><p className="mb-2 font-bold">Evidencia enviada</p><PhotoStrip photos={req.evidence.photos} /></Card>}
        </div>
        <aside className="space-y-4">
          <Card className="p-5 text-sm">
            <p className="flex items-center gap-2 font-bold"><Home className="h-4 w-4 text-turq-600" />Perfil del Hogar</p>
            <p className="mt-2">{client.name} · {client.phone}</p>
            <p className="text-ink-600">{home?.addressRef || req.addressRef || 'Sin referencia'} · {home?.homeType}{home?.floor ? `, piso ${home.floor}` : ''}</p>
            {home?.notes && <p className="mt-2 rounded-lg bg-surface px-3 py-2">{home.notes}</p>}
            <p className="mt-2 text-xs text-ink-400">Datos visibles solo mientras tengas este trabajo asignado.</p>
          </Card>
          {req.photos.length > 0 && <Card className="p-5"><p className="mb-2 text-sm font-bold">Fotos del cliente</p><PhotoStrip photos={req.photos} /></Card>}
          <Card><CardHeader title="Línea de tiempo" /><div className="px-5 py-4"><Timeline items={req.timeline} /></div></Card>
        </aside>
      </div>
      <ExtraModal req={req} open={extraOpen} onClose={() => setExtraOpen(false)} />
    </div>
  );
}

function ExtraModal({ req, open, onClose }: { req: ServiceRequest; open: boolean; onClose: () => void }) {
  const { run } = useApp();
  const [f, setF] = useState({ kind: 'material' as 'material' | 'trabajo', description: '', amount: '', receipt: '' });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Proponer adicional"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => { if (run((d, a) => proposeExtra(d, a, req.id, { ...f, amount: Number(f.amount) }), 'Enviado al cliente para su aprobación.')) { setF({ kind: 'material', description: '', amount: '', receipt: '' }); onClose(); } }}>Enviar al cliente</Button>
        </>
      }
    >
      <div className="space-y-4">
        <ChipGroup options={[{ value: 'material', label: 'Material (al costo)' }, { value: 'trabajo', label: 'Trabajo adicional' }]} value={f.kind} onChange={(v) => setF({ ...f, kind: v as 'material' | 'trabajo' })} />
        <Field label="Descripción"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Ej.: tarugos para concreto" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Monto (S/)"><Input inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          {f.kind === 'material' && <Field label="N.° de boleta"><Input value={f.receipt} onChange={(e) => setF({ ...f, receipt: e.target.value })} /></Field>}
        </div>
        <Notice>Los materiales se reembolsan al costo y no generan comisión. Un trabajo adicional sí la genera.</Notice>
      </div>
    </Modal>
  );
}

function EvidenceForm({ req }: { req: ServiceRequest }) {
  const { db, run } = useApp();
  const labels = [...new Set(req.lines.flatMap((l) => db.items.find((i) => i.id === l.itemId)?.closingTest.checklist ?? ['Trabajo terminado según alcance', 'Zona de trabajo limpia']))];
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const tests = req.lines.map((l) => db.items.find((i) => i.id === l.itemId)?.closingTest).filter(Boolean);
  return (
    <Card>
      <CardHeader icon={<ShieldCheck className="h-5 w-5" />} title="Prueba de cierre y evidencia" subtitle="Hazla frente al cliente. Fotos solo de la zona de trabajo, nunca de personas." />
      <div className="space-y-5 p-5">
        {tests.map((t, i) => <p key={i} className="rounded-lg bg-surface px-3 py-2 text-sm"><span className="font-semibold">Prueba:</span> {t!.test} <span className="font-semibold">Criterio:</span> {t!.criterion}</p>)}
        <div className="space-y-2.5">
          {labels.map((l) => <Checkbox key={l} checked={!!checks[l]} onChange={(v) => setChecks({ ...checks, [l]: v })} label={l} />)}
        </div>
        <Field label="Fotos del trabajo terminado" hint="Al menos 1, máximo 4."><PhotoPicker photos={photos} onChange={setPhotos} max={4} /></Field>
        <Field label="Notas para el cliente" optional><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[70px]" /></Field>
        <Button block size="lg" disabled={!photos.length || labels.some((l) => !checks[l])} onClick={() => run((d, a) => submitEvidence(d, a, req.id, { photos, checklist: labels.map((label) => ({ label, ok: !!checks[label] })), notes }), 'Evidencia enviada. El cliente revisará y firmará.')}>
          Enviar evidencia al cliente
        </Button>
      </div>
    </Card>
  );
}

/* ═════════ Ingresos ═════════ */
export function MakiIncome() {
  const { db } = useApp();
  const me = useActor();
  const pays = db.payments.filter((p) => p.makiId === me.id).sort((a, b) => b.paidAt.localeCompare(a.paidAt));
  const settlements = db.settlements.filter((s) => s.makiId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const m = analyticsSafe(db, me.id);
  return (
    <div className="space-y-6">
      <PageHeader title="Ingresos" subtitle="Precio, comisión y lo que recibes, servicio por servicio." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingreso neto total" value={<Money value={m.netIncome.value ?? 0} />} icon={<Wallet className="h-4 w-4" />} tone="petrol" />
        <Stat label="Por liquidar" value={<Money value={m.pendingIncome.value ?? 0} />} hint="Liquidación semanal" />
        <Stat label="Servicios pagados" value={pays.length} hint={`${pays.filter((p) => p.isRepeat).length} con clientes que repiten`} />
        <Stat label="Días hasta el pago" value={m.daysToPayment.value !== null ? m.daysToPayment.value.toFixed(1) : '—'} hint="Promedio desde la conformidad" />
      </div>
      <Notice title="Así funciona la comisión (valores de referencia, configurables)">
        {pct(db.settings.commissionFirst)} en el primer servicio con un cliente · {pct(db.settings.commissionRepeat)} cuando el cliente te repite (Mi Maki). Los materiales con boleta se reembolsan al costo sin comisión. No pagas por contactos.
      </Notice>
      <Card className="overflow-hidden">
        <CardHeader title="Pagos por servicio" subtitle="Registrados tras la conformidad del cliente (simulados)." />
        {pays.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-surface text-left text-xs font-semibold text-ink-600">
                <tr><th className="px-5 py-2.5">Servicio</th><th className="px-3">Fecha</th><th className="px-3 text-right">Precio</th><th className="px-3 text-right">Comisión</th><th className="px-3 text-right">Tú recibes</th><th className="px-5">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pays.map((p) => {
                  const r = db.requests.find((x) => x.id === p.requestId)!;
                  return (
                    <tr key={p.id}>
                      <td className="px-5 py-3"><Link to={`/maki/trabajos/${r.id}`} className="font-medium hover:text-petrol-700">{r.code} · {r.lines[0]?.description}</Link></td>
                      <td className="px-3 text-ink-600">{formatDate(p.paidAt)}</td>
                      <td className="px-3 text-right"><Money value={p.amount} /></td>
                      <td className="px-3 text-right text-ink-600">{pct(p.commissionRate)} · <Money value={p.commission} /></td>
                      <td className="px-3 text-right font-bold text-petrol-700"><Money value={p.makiNet} /></td>
                      <td className="px-5">{p.settlementId ? <Badge tone="mint">Liquidado</Badge> : <Badge tone="warn">Por liquidar</Badge>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-5"><EmptyState title="Aún no tienes pagos" description="Cuando un cliente firme su conformidad, verás aquí el detalle." /></div>
        )}
      </Card>
      <Card>
        <CardHeader title="Historial de liquidaciones" />
        {settlements.length ? (
          <ul className="divide-y divide-line">
            {settlements.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                <span>{formatDate(s.createdAt, { day: 'numeric', month: 'long', year: 'numeric' })} · {s.paymentIds.length} servicios <Badge tone="muted" className="ml-1">simulado</Badge></span>
                <Money value={s.total} className="font-bold" />
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-4 text-sm text-ink-600">Sin liquidaciones todavía.</p>
        )}
      </Card>
    </div>
  );
}

/* ═════════ Perfil y reputación ═════════ */
export function MakiProfilePage() {
  const { db, run } = useApp();
  const me = useActor();
  const mp = useMakiProfile();
  const [bio, setBio] = useState(mp.bio);
  const [districts, setDistricts] = useState(mp.districts);
  const [avail, setAvail] = useState(mp.availability);
  const st = makiStats(db, me.id);
  const m = analyticsSafe(db, me.id);
  const reviews = db.requests.filter((r) => r.assignedMakiId === me.id && r.conformity).sort((a, b) => b.conformity!.signedAt.localeCompare(a.conformity!.signedAt));
  const copy = STATUS_COPY[mp.status];
  const toggle = (d: Weekday, w: TimeWindow) => setAvail({ ...avail, [d]: avail[d].includes(w) ? avail[d].filter((x) => x !== w) : [...avail[d], w] });

  return (
    <div className="space-y-6">
      <PageHeader title="Mi perfil profesional" subtitle={`${me.name} · ${me.email}`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Perfil, zona y disponibilidad" />
            <div className="space-y-5 p-5">
              <Field label="Presentación"><Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-[80px]" /></Field>
              <Field label="Especialidades habilitadas" hint="Para sumar una especialidad, MakiYa debe evaluarla.">
                <div className="flex flex-wrap gap-2">{mp.specialties.map((s) => <Badge key={s} tone="mint">{db.categories.find((c) => c.id === s)?.name}</Badge>)}</div>
              </Field>
              <Field label="Experiencia"><p className="text-sm">{mp.experienceYears} años</p></Field>
              <Field label="Distritos donde atiendes">
                <ChipGroup multiple options={DISTRICTS.map((d) => ({ value: d, label: d }))} value={districts} onChange={(v) => setDistricts(v as string[])} />
              </Field>
              <Field label="Disponibilidad semanal">
                <div className="overflow-x-auto">
                  <table className="text-sm">
                    <thead><tr><th />{(['manana', 'mediodia', 'tarde'] as TimeWindow[]).map((w) => <th key={w} className="px-2 pb-1 text-xs font-semibold text-ink-600">{WINDOW_SHORT[w]}</th>)}</tr></thead>
                    <tbody>
                      {([1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => (
                        <tr key={d}>
                          <td className="pr-3 font-medium">{WEEKDAY_LABEL[d]}</td>
                          {(['manana', 'mediodia', 'tarde'] as TimeWindow[]).map((w) => (
                            <td key={w} className="p-1"><button type="button" onClick={() => toggle(d, w)} aria-pressed={avail[d].includes(w)} aria-label={`${WEEKDAY_LABEL[d]} ${WINDOW_SHORT[w]}`} className={`h-8 w-14 rounded-lg border ${avail[d].includes(w) ? 'border-turq-500 bg-turq-500' : 'border-line bg-white'}`} /></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => run((d, a) => updateMakiProfile(d, a, { bio, districts, availability: avail }), 'Perfil actualizado.')}>Guardar cambios</Button>
                {mp.status === 'habilitado' && (
                  <Button variant="secondary" icon={<PauseCircle className="h-4 w-4" />} onClick={() => run((d, a) => updateMakiProfile(d, a, { paused: !mp.paused }), mp.paused ? 'Vuelves a recibir solicitudes.' : 'Pausaste la recepción de solicitudes.')}>
                    {mp.paused ? 'Reanudar solicitudes' : 'Pausar solicitudes'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title="Evaluaciones de clientes" subtitle="Tu reputación es tuya." />
            {reviews.length ? (
              <ul className="divide-y divide-line">
                {reviews.slice(0, 8).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <span>{r.lines[0]?.description} · {formatDate(r.conformity!.signedAt)}{r.conformity!.comment && <span className="block text-ink-600">«{r.conformity!.comment}»</span>}</span>
                    <span className="inline-flex items-center gap-1 font-semibold"><Star className="h-4 w-4 fill-turq-500 text-turq-500" />{r.conformity!.quality}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-4 text-sm text-ink-600">Aún no tienes evaluaciones.</p>
            )}
          </Card>
        </div>
        <aside className="space-y-4">
          <Card className="p-5">
            <Notice tone={copy.tone} title={copy.title}>{copy.text}</Notice>
            <div className="mt-4"><VerificationChecklist mp={mp} min={db.settings.tradeTestMin} /></div>
          </Card>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Calificación" value={st.ratingAvg ? st.ratingAvg.toFixed(1) : '—'} hint={`${st.ratingCount} evaluaciones · ajustada ${st.bayesRating.toFixed(2)}`} />
            <Stat label="Completados" value={st.completed} />
            <Stat label="Aceptación" value={m.acceptanceRate.value !== null ? pct(m.acceptanceRate.value) : '—'} hint={m.acceptanceRate.fraction} />
            <Stat label="Retrabajos" value={st.reworkCount} hint={`${st.incidentCount} incidencias`} />
          </div>
          <Card className="p-4 text-xs text-ink-600"><Clock className="mb-1 h-4 w-4" />La calificación ajustada combina tus notas con un promedio de referencia, para que pocos trabajos no te perjudiquen ni te inflen.</Card>
        </aside>
      </div>
    </div>
  );
}
