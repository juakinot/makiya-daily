import type { ServiceItem, Settings } from './types';

export type PriceStatus = 'sin_referencia' | 'bajo_rango' | 'en_rango' | 'sobre_rango' | 'sobre_tope';

/** Tope del tarifario: referencia alta de mercado + % configurable (informe: +10 %). */
export function priceCap(item: Pick<ServiceItem, 'marketRef'>, s: Pick<Settings, 'priceCapOverReference'>): number | null {
  return item.marketRef ? Math.round(item.marketRef.high * (1 + s.priceCapOverReference) * 100) / 100 : null;
}

export function priceStatus(item: Pick<ServiceItem, 'price' | 'marketRef'>, s: Pick<Settings, 'priceCapOverReference'>, price = item.price): PriceStatus {
  const r = item.marketRef;
  if (!r) return 'sin_referencia';
  if (price > priceCap(item, s)!) return 'sobre_tope';
  if (price > r.high) return 'sobre_rango';
  if (price < r.low) return 'bajo_rango';
  return 'en_rango';
}

export const PRICE_STATUS_LABEL: Record<PriceStatus, string> = {
  sin_referencia: 'Sin referencia de mercado',
  bajo_rango: 'Debajo del rango de mercado',
  en_rango: 'Dentro del rango de mercado',
  sobre_rango: 'Sobre el rango (dentro del tope)',
  sobre_tope: 'Supera el tope de +10 %',
};
