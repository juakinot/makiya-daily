import { Link } from 'react-router-dom';
import { BadgeCheck, CalendarDays, Check, ChevronRight, KeyRound, MapPin, ReceiptText, ShieldCheck, Star, X } from 'lucide-react';
import { WINDOW_SHORT } from '@/config/catalog';
import { finalAmount, linesTotal, pct } from '@/domain/economics';
import type { Candidate, Database, ID, QuoteLine, ServiceRequest } from '@/domain/types';
import { cx, formatDate } from '@/lib/utils';
import { makiStats } from '@/matching/engine';
import { Avatar, Badge, Button, Card, Modal, Money, PhotoStrip, Rating, StatusBadge } from './ui';

/** Los tres mecanismos del sistema Cero Sorpresas. */
export const MECHANISMS = [
  { icon: ShieldCheck, title: 'Maki Probado', q: '¿Quién entra a mi casa?', text: 'Identidad, antecedentes, referencias y una prueba de oficio práctica aprobada (mínimo 14/20).' },
  { icon: ReceiptText, title: 'Presupuesto Verificado', q: '¿Cuánto me cobran y por qué?', text: 'Precio cerrado o revisado por un evaluador, con lo que incluye y no incluye. Nada adicional sin tu aprobación.' },
  { icon: BadgeCheck, title: 'Pago tras Conformidad', q: '¿Quedó bien?', text: 'Pagas después de ver la prueba de cierre. Garantía de 30 días sobre la mano de obra.' },
];

export function ScopeCard({ db, lines, route, verifiedAt, compact = false }: { db: Database; lines: QuoteLine[]; route: ServiceRequest['route']; verifiedAt?: string; compact?: boolean }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <h3 className="font-bold">Qué incluye tu servicio</h3>
        {route === 'tarifario' ? <Badge tone="mint" icon={<ReceiptText className="h-3 w-3" />}>Precio cerrado</Badge> : <Badge tone="turq" icon={<ShieldCheck className="h-3 w-3" />}>{verifiedAt ? 'Presupuesto verificado' : 'En verificación'}</Badge>}
      </div>
      <div className="divide-y divide-line">
        {lines.map((l) => {
          const item = l.itemId ? db.items.find((i) => i.id === l.itemId) : undefined;
          return (
            <div key={l.id} className="px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {l.description} {l.qty > 1 && <span className="text-ink-600">× {l.qty}</span>}
                  </p>
                  <p className="text-xs text-ink-600">
                    {item ? `S/ ${l.unitPrice.toFixed(2)} por ${item.unit} · aprox. ${item.durationMin} min` : 'Línea a medida definida por el evaluador'}
                  </p>
                  {item?.marketRef && !compact && (
                    <p className="mt-0.5 text-xs text-turq-700">Referencia de mercado en Lima: S/ {item.marketRef.low}–{item.marketRef.high} por {item.unit}</p>
                  )}
                </div>
                <Money value={l.qty * l.unitPrice} className="font-bold" />
              </div>
              {item && !compact && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ul className="space-y-1.5 text-sm">
                    {item.includes.map((t) => (
                      <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-turq-600" />{t}</li>
                    ))}
                  </ul>
                  <ul className="space-y-1.5 text-sm text-ink-600">
                    {item.excludes.map((t) => (
                      <li key={t} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />No incluye: {t.charAt(0).toLowerCase() + t.slice(1)}</li>
                    ))}
                  </ul>
                </div>
              )}
              {item && !compact && (
                <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-ink-700">
                  <span className="font-semibold">Prueba de cierre:</span> {item.closingTest.test} <span className="font-semibold">Criterio:</span> {item.closingTest.criterion}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between bg-mint-50 px-4 py-3 sm:px-5">
        <span className="font-semibold text-petrol-800">Total {route === 'tarifario' ? 'cerrado' : 'verificado'}</span>
        <Money value={linesTotal(lines)} className="text-xl font-extrabold text-petrol-700" />
      </div>
    </Card>
  );
}

export function MakiCard({
  db,
  makiId,
  candidate,
  selected,
  onSelect,
  onViewProfile,
  categoryId,
  showContact,
}: {
  db: Database;
  makiId: ID;
  candidate?: Candidate;
  selected?: boolean;
  onSelect?: () => void;
  onViewProfile?: () => void;
  categoryId?: ID;
  showContact?: boolean;
}) {
  const u = db.users.find((x) => x.id === makiId);
  const mp = db.makiProfiles.find((m) => m.userId === makiId);
  if (!u || !mp) return null;
  const st = makiStats(db, makiId, categoryId);
  const body = (
    <div className="flex gap-3">
      <Avatar name={u.name} className="h-12 w-12 text-base" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="font-display font-bold">{u.name}</p>
          {candidate?.isMyMaki && <Badge tone="accent">Tu Maki</Badge>}
          {candidate?.isNewMaki && <Badge tone="turq">Nuevo</Badge>}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-600">
          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-turq-500 text-turq-500" />{st.ratingAvg ? st.ratingAvg.toFixed(1) : '—'} <span className="text-ink-400">({st.ratingCount})</span></span>
          <span>{st.completed} trabajos</span>
          <span>{mp.experienceYears} años</span>
          <span>Prueba de oficio {mp.verification.tradeTestScore ?? '—'}/20</span>
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {mp.verification.identity && <Badge tone="mint">Identidad</Badge>}
          {mp.verification.background && <Badge tone="mint">Antecedentes</Badge>}
          {mp.verification.references && <Badge tone="mint">Referencias</Badge>}
        </div>
        {candidate && (
          <ul className="mt-2.5 space-y-1 text-sm text-ink-700">
            {candidate.reasons.slice(0, 3).map((r) => (
              <li key={r} className="flex gap-1.5"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-turq-600" />{r}</li>
            ))}
          </ul>
        )}
        {showContact && <p className="mt-2 text-sm text-ink-700">{mp.bio}</p>}
      </div>
      {onSelect && (
        <span className={cx('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2', selected ? 'border-petrol-700 bg-petrol-700' : 'border-ink-300')}>
          {selected && <span className="h-2 w-2 rounded-full bg-white" />}
        </span>
      )}
    </div>
  );
  const profileBtn = onViewProfile && (
    <div className="mt-3 flex border-t border-line pt-2">
      <button type="button" onClick={onViewProfile} className="inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-semibold text-petrol-700 hover:underline">
        Ver perfil, reseñas y trabajos <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
  if (onSelect) {
    return (
      <div className={cx('rounded-2xl border bg-white p-4 transition', selected ? 'border-petrol-700 ring-2 ring-petrol-700/15' : 'border-line hover:border-turq-500')}>
        <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className="w-full text-left">
          {body}
        </button>
        {profileBtn}
      </div>
    );
  }
  return (
    <Card className="p-4">
      {body}
      {profileBtn}
    </Card>
  );
}

/** Perfil completo del Maki para que el cliente decida con información (reseñas, trabajos y verificación). */
export function MakiProfileModal({
  db,
  makiId,
  categoryId,
  open,
  onClose,
  onChoose,
  chooseLabel,
}: {
  db: Database;
  makiId: ID | null;
  categoryId?: ID;
  open: boolean;
  onClose: () => void;
  onChoose?: () => void;
  chooseLabel?: string;
}) {
  const u = makiId ? db.users.find((x) => x.id === makiId) : undefined;
  const mp = makiId ? db.makiProfiles.find((m) => m.userId === makiId) : undefined;
  if (!u || !mp) return null;
  const st = makiStats(db, u.id, categoryId);
  const done = db.requests
    .filter((r) => r.assignedMakiId === u.id && r.status === 'completada' && r.conformity)
    .sort((a, b) => b.conformity!.signedAt.localeCompare(a.conformity!.signedAt));
  const reviews = done.filter((r) => r.conformity!.comment).slice(0, 5);
  const photos = done.flatMap((r) => r.evidence?.photos ?? []).slice(0, 6);
  const safety = done.map((r) => r.conformity!.safety);
  const avgSafety = safety.length ? safety.reduce((a, b) => a + b, 0) / safety.length : null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={u.name}
      footer={onChoose ? <><Button variant="secondary" onClick={onClose}>Volver</Button><Button onClick={() => { onChoose(); onClose(); }}>{chooseLabel ?? `Elegir a ${u.name.split(' ')[0]}`}</Button></> : undefined}
    >
      <div className="space-y-5">
        <div className="flex gap-3">
          <Avatar name={u.name} className="h-14 w-14 text-lg" />
          <div>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="petrol" icon={<ShieldCheck className="h-3 w-3" />}>Maki Probado</Badge>
              {st.completed < 3 && <Badge tone="turq">Nuevo en MakiYa</Badge>}
            </div>
            <p className="mt-2 text-sm text-ink-700">{mp.bio || 'Sin presentación.'}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Calificación', st.ratingAvg ? `${st.ratingAvg.toFixed(1)} ★` : '—', `${st.ratingCount} evaluaciones`],
            ['Trabajos', String(st.completed), `${st.completedInCategory} de esta categoría`],
            ['Sin retrabajo', st.completed ? `${Math.round((1 - st.reworkCount / st.completed) * 100)} %` : '—', `${st.reworkCount} retrabajos`],
            ['Seguridad percibida', avgSafety ? avgSafety.toFixed(1) : '—', 'según clientes'],
          ].map(([l, v, h]) => (
            <div key={l} className="rounded-xl bg-surface p-3">
              <p className="text-xs font-semibold text-ink-600">{l}</p>
              <p className="font-display text-lg font-extrabold text-petrol-700">{v}</p>
              <p className="text-[11px] text-ink-600">{h}</p>
            </div>
          ))}
        </div>
        <div>
          <p className="mb-2 text-sm font-bold">Verificación en 4 capas</p>
          <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
            {[
              [mp.verification.identity, 'Identidad verificada (DNI)'],
              [mp.verification.background, 'Certificado de antecedentes'],
              [mp.verification.references, 'Dos referencias favorables'],
              [(mp.verification.tradeTestScore ?? 0) >= db.settings.tradeTestMin, `Prueba de oficio ${mp.verification.tradeTestScore ?? '—'}/20`],
            ].map(([ok, l]) => (
              <li key={l as string} className="flex items-center gap-2"><Check className={cx('h-4 w-4', ok ? 'text-turq-600' : 'text-ink-300')} />{l}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink-600">{mp.experienceYears} años de experiencia · Especialidades: {mp.specialties.map((s) => db.categories.find((c) => c.id === s)?.name).join(', ')} · Atiende: {mp.districts.join(', ')}</p>
        </div>
        {photos.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold">Trabajos recientes (evidencia de cierre)</p>
            <PhotoStrip photos={photos} />
          </div>
        )}
        <div>
          <p className="mb-2 text-sm font-bold">Reseñas de clientes</p>
          {reviews.length ? (
            <ul className="space-y-2">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-line p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Rating value={r.conformity!.quality} size="sm" />
                    <span className="text-xs text-ink-400">{r.lines[0]?.description} · {formatDate(r.conformity!.signedAt)}</span>
                  </div>
                  <p className="mt-1 text-ink-700">«{r.conformity!.comment}»</p>
                  <p className="mt-1 text-xs text-ink-400">{db.users.find((x) => x.id === r.clientId)?.name.split(' ')[0]} · reseña verificada tras un servicio pagado</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-600">Aún no tiene reseñas escritas. Todos los Makis pasan la misma evaluación antes de recibir trabajos.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function VisitCodeCard({ code, makiName, date, window }: { code: string; makiName: string; date: string; window: keyof typeof WINDOW_SHORT }) {
  return (
    <div className="rounded-2xl border border-petrol-700/20 bg-petrol-700 p-5 text-white">
      <div className="flex items-center gap-2 text-mint-100">
        <KeyRound className="h-4 w-4" />
        <p className="text-sm font-semibold">Visita Segura · tu código</p>
      </div>
      <p className="mt-2 font-mono text-4xl font-extrabold tracking-[0.35em]">{code}</p>
      <p className="mt-3 text-sm text-mint-100">
        Cuando llegue <strong className="text-white">{makiName}</strong> ({formatDate(date)}, {WINDOW_SHORT[window]}), pídele que muestre su fotocheck y díctale este código. <strong className="text-white">Si no coincide, no abras la puerta</strong> y repórtalo.
      </p>
    </div>
  );
}

export function RequestRow({ db, req, to, perspective = 'client' }: { db: Database; req: ServiceRequest; to: string; perspective?: 'client' | 'maki' | 'admin' }) {
  const client = db.users.find((u) => u.id === req.clientId);
  const maki = req.assignedMakiId ? db.users.find((u) => u.id === req.assignedMakiId) : undefined;
  const title = req.lines.length ? req.lines.map((l) => `${l.qty > 1 ? `${l.qty}× ` : ''}${l.description}`).join(' + ') : req.description;
  const total = req.lines.length ? finalAmount(req) : null;
  return (
    <Link to={to} className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-4 transition hover:border-turq-500 hover:shadow-card">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-ink-400">{req.code}</span>
          <StatusBadge status={req.status} />
        </div>
        <p className="mt-1 truncate font-semibold">{title}</p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-sm text-ink-600">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate(req.preferredDate)} · {WINDOW_SHORT[req.window]}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{req.district}</span>
          {perspective !== 'client' && client && <span>Cliente: {client.name}</span>}
          {perspective !== 'maki' && maki && <span>Maki: {maki.name}</span>}
        </p>
      </div>
      {total !== null && <Money value={total} className="hidden font-bold sm:block" />}
      <ChevronRight className="h-5 w-5 text-ink-300 group-hover:text-turq-600" />
    </Link>
  );
}

export function PaymentBreakdown({ amount, rate, commission, makiNet, isRepeat }: { amount: number; rate: number; commission: number; makiNet: number; isRepeat: boolean }) {
  return (
    <dl className="space-y-1.5 text-sm">
      <div className="flex justify-between"><dt className="text-ink-600">Precio del servicio</dt><dd><Money value={amount} /></dd></div>
      <div className="flex justify-between"><dt className="text-ink-600">Comisión MakiYa ({pct(rate)}{isRepeat ? ' · Mi Maki' : ' · primer servicio'})</dt><dd className="text-ink-600">− <Money value={commission} /></dd></div>
      <div className="flex justify-between border-t border-line pt-1.5 font-bold"><dt>Ingreso del Maki</dt><dd className="text-petrol-700"><Money value={makiNet} /></dd></div>
    </dl>
  );
}
