import { Link } from 'react-router-dom';
import { BadgeCheck, CalendarDays, Check, ChevronRight, KeyRound, MapPin, ReceiptText, ShieldCheck, Star, X } from 'lucide-react';
import { WINDOW_SHORT } from '@/config/catalog';
import { finalAmount, linesTotal, pct } from '@/domain/economics';
import type { Candidate, Database, ID, QuoteLine, ServiceRequest } from '@/domain/types';
import { cx, formatDate } from '@/lib/utils';
import { makiStats } from '@/matching/engine';
import { Avatar, Badge, Card, Money, StatusBadge } from './ui';

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
  categoryId,
  showContact,
}: {
  db: Database;
  makiId: ID;
  candidate?: Candidate;
  selected?: boolean;
  onSelect?: () => void;
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
          <p className="font-bold">{u.name}</p>
          {candidate?.isMyMaki && <Badge tone="accent">Tu Maki</Badge>}
          {candidate?.isNewMaki && <Badge tone="turq">Nuevo</Badge>}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-ink-600">
          <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-turq-500 text-turq-500" />{st.ratingAvg ? st.ratingAvg.toFixed(1) : '—'} <span className="text-ink-400">({st.ratingCount})</span></span>
          <span>{st.completed} trabajos</span>
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
  if (onSelect) {
    return (
      <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className={cx('w-full rounded-2xl border bg-white p-4 text-left transition', selected ? 'border-petrol-700 ring-2 ring-petrol-700/15' : 'border-line hover:border-turq-500')}>
        {body}
      </button>
    );
  }
  return <Card className="p-4">{body}</Card>;
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
