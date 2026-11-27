import { ShieldCheck } from 'lucide-react';
import isotipoUrl from '@/assets/brand/isotipo.svg';
import { cx } from '@/lib/utils';

/**
 * Identidad oficial de MakiYa (Brand Kit).
 * - Isotipo: dos manos que se encuentran, coral #F0785A + turquesa #20A995.
 *   Uso incorrecto según el manual: no deformar, no cambiar colores, no agregar bordes, no aplicar sombras ni efectos.
 * - Logotipo: «MakiYa» en Manrope, verde petróleo (blanco en la versión negativa).
 * - Slogan: «Una mano para tu día» en cursiva.
 * Se exponen por separado para permitir usos distintos.
 */

export function Isotipo({ className, title = 'MakiYa' }: { className?: string; title?: string }) {
  return <img src={isotipoUrl} alt={title} className={cx('select-none object-contain', className)} draggable={false} />;
}

export function Logotipo({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cx('font-display font-extrabold leading-none tracking-tight', inverse ? 'text-white' : 'text-petrol-700', className)} aria-label="MakiYa">
      MakiYa
    </span>
  );
}

export function Slogan({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return <span className={cx('font-medium italic', inverse ? 'text-mint-100' : 'text-ink-600', className)}>Una mano para tu día</span>;
}

/** Imagotipo (principal): isotipo + logotipo (+ slogan opcional). `inverse` = versión negativa sobre fondo oscuro. */
export function Lockup({ size = 'md', withSlogan = false, inverse = false, className }: { size?: 'sm' | 'md' | 'lg'; withSlogan?: boolean; inverse?: boolean; className?: string }) {
  const iso = { sm: 'h-6', md: 'h-8', lg: 'h-12' }[size];
  const txt = { sm: 'text-lg', md: 'text-[1.4rem]', lg: 'text-[2.1rem]' }[size];
  return (
    <span className={cx('inline-flex items-center gap-2', className)}>
      <Isotipo className={iso} />
      <span className="flex flex-col">
        <Logotipo className={txt} inverse={inverse} />
        {withSlogan && <Slogan className={cx('mt-0.5', size === 'lg' ? 'text-sm' : 'text-xs')} inverse={inverse} />}
      </span>
    </span>
  );
}

/** Isologo (integrado): cuadrado petróleo redondeado con el isotipo; sirve como icono de app. */
export function Isologo({ className, withName = false }: { className?: string; withName?: boolean }) {
  return (
    <span className={cx('inline-flex flex-col items-center justify-center rounded-2xl bg-petrol-700 p-2', className)}>
      <Isotipo className="h-full max-h-8 w-auto" />
      {withName && <Logotipo inverse className="mt-1 text-sm" />}
    </span>
  );
}

/** Sub-marcas de la arquitectura de marca: MakiYa Arreglos (activa) y MakiYa Daily (expansión). */
export function SubBrand({ line, className }: { line: 'Arreglos' | 'Daily'; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <Isotipo className="h-5" />
      <Logotipo className="text-base" />
      <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold text-white', line === 'Arreglos' ? 'bg-petrol-700' : 'bg-turq-700')}>{line}</span>
    </span>
  );
}

/** Sello del sistema Cero Sorpresas. */
export function CeroSorpresasSeal({ className, inverse = false }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-display font-extrabold leading-none', inverse ? 'text-white' : 'text-petrol-700', className)}>
      <ShieldCheck className={cx('h-7 w-7', inverse ? 'text-turq-500' : 'text-turq-600')} strokeWidth={2} />
      <span className="flex flex-col text-[15px]">
        <span>Cero</span>
        <span>Sorpresas</span>
      </span>
    </span>
  );
}
