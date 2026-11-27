import { CheckCircle2, Circle, Lock } from 'lucide-react';
import { ladderProgress } from '@/analytics/metrics';
import { cx } from '@/lib/utils';
import { useApp } from '@/store/AppStore';
import { Badge } from './ui';

/**
 * Escalera de confianza. `detailed` muestra los criterios medibles y su avance (vista de administración).
 */
export function TrustLadder({ detailed = false }: { detailed?: boolean }) {
  const { db } = useApp();
  const steps = ladderProgress(db);
  return (
    <ol className="relative space-y-3">
      {steps.map((s) => {
        const names = s.categories.map((c) => db.categories.find((x) => x.id === c)?.name).filter(Boolean).join(' · ');
        return (
          <li key={s.step} className={cx('rounded-2xl border p-4', s.active ? 'border-petrol-700/30 bg-mint-50' : 'border-line bg-white')}>
            <div className="flex flex-wrap items-start gap-3">
              <span className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display font-extrabold', s.active ? 'bg-petrol-700 text-white' : 'bg-surface text-ink-600')}>{s.step}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-display font-bold">{s.name}</p>
                  {s.active ? <Badge tone="petrol">Disponible</Badge> : detailed && s.ready ? <Badge tone="mint">Listo para habilitar</Badge> : <Badge tone="muted" icon={<Lock className="h-3 w-3" />}>Próximamente</Badge>}
                </div>
                <p className="text-sm text-ink-600">{names}</p>
                <p className="mt-1 text-sm text-ink-700">{s.why}</p>
                {!s.active && !detailed && <p className="mt-1 text-xs text-ink-600">Se habilita cuando: {s.requires}</p>}
                {detailed && s.checks.length > 0 && (
                  <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
                    {s.checks.map((c) => (
                      <li key={c.label} className="flex items-center gap-2">
                        {c.ok ? <CheckCircle2 className="h-4 w-4 shrink-0 text-turq-600" /> : <Circle className="h-4 w-4 shrink-0 text-ink-300" />}
                        <span className="flex-1">{c.label}</span>
                        <span className={cx('tabular-nums', c.ok ? 'text-turq-700' : 'text-ink-600')}>{c.current} <span className="text-ink-400">/ {c.target}</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
