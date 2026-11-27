import isotipoUrl from '@/assets/brand/isotipo.svg';
import { cx } from '@/lib/utils';

/**
 * Identidad oficial de MakiYa.
 * - Isotipo: dos manos que se encuentran (vectorizado del archivo oficial; NO redibujar ni recolorear).
 * - Logotipo: «MakiYa» tipográfico.
 * - Slogan: «Una mano para tu día.»
 * Se exponen por separado para permitir usos distintos.
 */

export function Isotipo({ className, title = 'MakiYa' }: { className?: string; title?: string }) {
  return <img src={isotipoUrl} alt={title} className={cx('select-none object-contain', className)} draggable={false} />;
}

export function Logotipo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cx('font-extrabold tracking-tight leading-none', className)} aria-label="MakiYa">
      <span className={inverse ? 'text-white' : 'text-petrol-700'}>Maki</span>
      <span className={inverse ? 'text-mint-200' : 'text-turq-500'}>Ya</span>
    </span>
  );
}

export function Slogan({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return <span className={cx('font-medium', inverse ? 'text-mint-100' : 'text-ink-600', className)}>Una mano para tu día.</span>;
}

/** Composición horizontal: isotipo + logotipo (+ slogan opcional). */
export function Lockup({ size = 'md', withSlogan = false, inverse = false, className }: { size?: 'sm' | 'md' | 'lg'; withSlogan?: boolean; inverse?: boolean; className?: string }) {
  const iso = { sm: 'h-6', md: 'h-8', lg: 'h-12' }[size];
  const txt = { sm: 'text-lg', md: 'text-[1.35rem]', lg: 'text-3xl' }[size];
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <span className={cx('inline-flex items-center justify-center', inverse && 'rounded-lg bg-white px-1 py-0.5')}>
        <Isotipo className={iso} />
      </span>
      <span className="flex flex-col">
        <Logotipo className={txt} inverse={inverse} />
        {withSlogan && <Slogan className="mt-0.5 text-xs" inverse={inverse} />}
      </span>
    </span>
  );
}
