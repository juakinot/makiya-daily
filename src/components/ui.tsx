import { forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Camera, Loader2, Star, X, Info } from 'lucide-react';
import { STATUS_LABEL } from '@/domain/stateMachine';
import type { RequestStatus } from '@/domain/types';
import { formatPEN } from '@/domain/economics';
import { compressImage, cx } from '@/lib/utils';
import { Isotipo } from '@/brand/Brand';

/* ───────── Button ───────── */
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type BtnSize = 'sm' | 'md' | 'lg';
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
  loading?: boolean;
  icon?: ReactNode;
  block?: boolean;
}
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, block, className, children, disabled, ...rest },
  ref,
) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-petrol-700 text-white hover:bg-petrol-800 shadow-sm',
    secondary: 'bg-white text-petrol-700 border border-line hover:border-petrol-700/40 hover:bg-petrol-50',
    ghost: 'text-petrol-700 hover:bg-petrol-50',
    danger: 'bg-white text-accent-700 border border-accent-100 hover:bg-accent-50',
    soft: 'bg-mint-100 text-petrol-800 hover:bg-mint-200',
  };
  const s: Record<BtnSize, string> = { sm: 'h-9 px-3 text-sm gap-1.5', md: 'h-11 px-4 text-[15px] gap-2', lg: 'h-12 px-5 text-base gap-2' };
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-turq-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        v[variant],
        s[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

/* ───────── Card ───────── */
export function Card({ className, children, as: As = 'div', ...rest }: { className?: string; children: ReactNode; as?: 'div' | 'section' | 'article' } & Record<string, unknown>) {
  return (
    <As className={cx('rounded-2xl border border-line bg-white shadow-card', className)} {...rest}>
      {children}
    </As>
  );
}

export function CardHeader({ title, subtitle, action, icon }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-turq-600">{icon}</span>}
        <div className="min-w-0">
          <h3 className="font-bold text-ink-900">{title}</h3>
          {subtitle && <p className="text-sm text-ink-600">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

/* ───────── Badge ───────── */
export type Tone = 'neutral' | 'petrol' | 'turq' | 'mint' | 'accent' | 'warn' | 'muted';
export function Badge({ tone = 'neutral', children, className, icon }: { tone?: Tone; children: ReactNode; className?: string; icon?: ReactNode }) {
  const t: Record<Tone, string> = {
    neutral: 'bg-surface text-ink-700 border-line',
    petrol: 'bg-petrol-700 text-white border-petrol-700',
    turq: 'bg-turq-50 text-turq-700 border-turq-100',
    mint: 'bg-mint-100 text-petrol-800 border-mint-200',
    accent: 'bg-accent-50 text-accent-700 border-accent-100',
    warn: 'bg-warn-50 text-warn-700 border-amber-200',
    muted: 'bg-white text-ink-600 border-line',
  };
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold', t[tone], className)}>{icon}{children}</span>;
}

const STATUS_TONE: Record<RequestStatus, Tone> = {
  en_revision: 'warn',
  propuesta_lista: 'accent',
  esperando_maki: 'turq',
  confirmada: 'mint',
  en_curso: 'turq',
  evidencia_enviada: 'accent',
  con_incidencia: 'warn',
  completada: 'petrol',
  cancelada: 'muted',
};
export function StatusBadge({ status, labelOverride }: { status: RequestStatus; labelOverride?: string }) {
  return <Badge tone={STATUS_TONE[status]}>{labelOverride ?? STATUS_LABEL[status]}</Badge>;
}

/* ───────── Form ───────── */
export function Field({ label, hint, error, children, htmlFor, optional }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink-900">
        {label} {optional && <span className="font-normal text-ink-400">(opcional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-600">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-accent-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  'w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 transition focus:outline-none focus:ring-2 focus:ring-turq-500/40 focus:border-turq-500 disabled:bg-surface';
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input({ className, invalid, ...rest }, ref) {
  return <input ref={ref} className={cx(inputBase, 'h-11', invalid ? 'border-accent-500' : 'border-line', className)} aria-invalid={invalid || undefined} {...rest} />;
});
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(function Textarea({ className, invalid, ...rest }, ref) {
  return <textarea ref={ref} className={cx(inputBase, 'min-h-[110px] py-3 leading-relaxed', invalid ? 'border-accent-500' : 'border-line', className)} aria-invalid={invalid || undefined} {...rest} />;
});
export function Select({ className, invalid, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select className={cx(inputBase, 'h-11 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23566866%27 stroke-width=%272%27><path d=%27m6 9 6 6 6-6%27/></svg>")] bg-[length:16px] bg-[right_12px_center] bg-no-repeat pr-9', invalid ? 'border-accent-500' : 'border-line', className)} {...rest}>
      {children}
    </select>
  );
}
export function Checkbox({ checked, onChange, label, description, id }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; description?: ReactNode; id?: string }) {
  const gen = useId();
  const cid = id ?? gen;
  return (
    <label htmlFor={cid} className="flex cursor-pointer items-start gap-3">
      <input id={cid} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-line accent-[#075B55]" />
      <span className="text-sm">
        <span className="font-medium text-ink-900">{label}</span>
        {description && <span className="mt-0.5 block text-ink-600">{description}</span>}
      </span>
    </label>
  );
}

export function ChipGroup<T extends string>({ options, value, onChange, multiple = false }: { options: { value: T; label: ReactNode }[]; value: T | T[]; onChange: (v: T | T[]) => void; multiple?: boolean }) {
  const isOn = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div className="flex flex-wrap gap-2" role={multiple ? 'group' : 'radiogroup'}>
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role={multiple ? 'checkbox' : 'radio'}
          aria-checked={isOn(o.value)}
          onClick={() => {
            if (multiple) {
              const arr = Array.isArray(value) ? value : [];
              onChange(arr.includes(o.value) ? arr.filter((x) => x !== o.value) : [...arr, o.value]);
            } else onChange(o.value);
          }}
          className={cx(
            'min-h-[40px] rounded-full border px-3.5 text-sm font-medium transition',
            isOn(o.value) ? 'border-petrol-700 bg-petrol-700 text-white' : 'border-line bg-white text-ink-700 hover:border-turq-500',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ───────── Feedback ───────── */
export function EmptyState({ title, description, action, icon }: { title: string; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-white px-6 py-10 text-center">
      {icon ?? <Isotipo className="mb-3 h-10 opacity-30 grayscale" />}
      <p className="font-bold text-ink-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-600">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'mint', title, children, icon, className }: { tone?: 'mint' | 'accent' | 'warn' | 'neutral'; title?: ReactNode; children?: ReactNode; icon?: ReactNode; className?: string }) {
  const t = {
    mint: 'bg-mint-50 border-mint-200 text-petrol-800',
    accent: 'bg-accent-50 border-accent-100 text-ink-900',
    warn: 'bg-warn-50 border-amber-200 text-ink-900',
    neutral: 'bg-surface border-line text-ink-700',
  }[tone];
  const ic = { mint: 'text-turq-600', accent: 'text-accent-700', warn: 'text-warn-700', neutral: 'text-ink-600' }[tone];
  return (
    <div className={cx('flex gap-3 rounded-xl border px-4 py-3 text-sm', t, className)}>
      <span className={cx('mt-0.5 shrink-0', ic)}>{icon ?? <Info className="h-4 w-4" />}</span>
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cx(!!title && 'mt-0.5', 'text-ink-700')}>{children}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-lg bg-surface', className)} />;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-ink-600" role="status">
      <Loader2 className="h-4 w-4 animate-spin text-turq-500" /> {label}
    </div>
  );
}

/** Etiqueta honesta para funciones simuladas (prompt §10). */
export function SimulatedTag({ children = 'Simulado' }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-ink-300 bg-white px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-600">
      {children}
    </span>
  );
}

/* ───────── Data display ───────── */
export function Money({ value, className }: { value: number; className?: string }) {
  return <span className={cx('tabular-nums', className)}>{formatPEN(value)}</span>;
}

export function Stat({ label, value, hint, tone = 'neutral', icon }: { label: ReactNode; value: ReactNode; hint?: ReactNode; tone?: 'neutral' | 'accent' | 'petrol'; icon?: ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-ink-600">{label}</p>
        {icon && <span className="text-turq-600">{icon}</span>}
      </div>
      <p className={cx('mt-1.5 text-2xl font-extrabold tabular-nums tracking-tight', tone === 'accent' ? 'text-accent-700' : tone === 'petrol' ? 'text-petrol-700' : 'text-ink-900')}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-600">{hint}</p>}
    </Card>
  );
}

export function Rating({ value, onChange, size = 'md', label }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md'; label?: string }) {
  const s = size === 'sm' ? 'h-4 w-4' : 'h-7 w-7';
  return (
    <div className="flex items-center gap-1" role={onChange ? 'radiogroup' : undefined} aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          aria-label={`${n} de 5`}
          aria-checked={onChange ? value === n : undefined}
          role={onChange ? 'radio' : undefined}
          className={cx('rounded-md disabled:cursor-default', onChange && 'p-1 hover:bg-mint-50')}
        >
          <Star className={cx(s, n <= value ? 'fill-turq-500 text-turq-500' : 'text-ink-300')} strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return <span className={cx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mint-100 text-sm font-bold text-petrol-700', className)}>{initials}</span>;
}

export function PageHeader({ title, subtitle, action, back }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: ReactNode; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-xl border border-line bg-surface p-1" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={value === t.value}
            onClick={() => onChange(t.value)}
            className={cx('flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition', value === t.value ? 'bg-white text-petrol-700 shadow-card' : 'text-ink-600 hover:text-ink-900')}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className={cx('rounded-full px-1.5 text-[11px]', value === t.value ? 'bg-accent-500 text-white' : 'bg-line text-ink-700')}>{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Timeline({ items }: { items: { at: string; label: string; by: string }[] }) {
  return (
    <ol className="relative space-y-4 border-l border-line pl-5">
      {items.map((e, i) => (
        <li key={i} className="relative">
          <span className={cx('absolute -left-[26px] top-1 h-3 w-3 rounded-full border-2 border-white', i === items.length - 1 ? 'bg-turq-500 ring-2 ring-turq-100' : 'bg-ink-300')} />
          <p className="text-sm text-ink-900">{e.label}</p>
          <p className="text-xs text-ink-400">
            {new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(e.at))} · {e.by === 'client' ? 'Cliente' : e.by === 'maki' ? 'Maki' : e.by === 'admin' ? 'MakiYa' : 'Sistema'}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Progreso">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-1.5">
          <span className={cx('h-1.5 rounded-full', i < current ? 'bg-petrol-700' : i === current ? 'bg-turq-500' : 'bg-line')} />
          <span className={cx('hidden text-[11px] font-semibold sm:block', i <= current ? 'text-petrol-700' : 'text-ink-400')}>{s}</span>
        </li>
      ))}
    </ol>
  );
}

/* ───────── Modal ───────── */
export function Modal({ open, onClose, title, children, footer, size = 'md' }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg' }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" className={cx('flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-pop outline-none sm:rounded-2xl', size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-600 hover:bg-surface" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/* ───────── Photos ───────── */
export function PhotoPicker({ photos, onChange, max = 3, label = 'Agregar foto' }: { photos: string[]; onChange: (p: string[]) => void; max?: number; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handle = async (files: FileList | null) => {
    if (!files) return;
    const out: string[] = [];
    for (const f of Array.from(files).slice(0, max - photos.length)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        out.push(await compressImage(f));
      } catch {
        /* imagen inválida: se omite */
      }
    }
    onChange([...photos, ...out]);
    if (inputRef.current) inputRef.current.value = '';
  };
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((p, i) => (
        <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line bg-surface">
          <img src={p} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
          <button type="button" onClick={() => onChange(photos.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-ink-700 shadow" aria-label="Quitar foto">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      {photos.length < max && (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ink-300 text-xs font-medium text-ink-600 hover:border-turq-500 hover:text-turq-700">
          <Camera className="h-5 w-5" />
          {label}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => handle(e.target.files)} />
    </div>
  );
}

export function PhotoStrip({ photos }: { photos: string[] }) {
  if (!photos.length) return null;
  return (
    <div className="flex gap-2 overflow-x-auto">
      {photos.map((p, i) => (
        <div key={i} className="h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-line bg-surface">
          <img src={p} alt={`Evidencia ${i + 1}`} className="h-full w-full object-cover" />
        </div>
      ))}
    </div>
  );
}
