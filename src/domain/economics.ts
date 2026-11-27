import type { Extra, Payment, QuoteLine, ServiceRequest, Settings } from './types';

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function linesTotal(lines: QuoteLine[]): number {
  return round2(lines.reduce((s, l) => s + l.qty * l.unitPrice, 0));
}

/** Solo los adicionales APROBADOS por el cliente suman (regla Cero Sorpresas). */
export function approvedExtrasTotal(extras: Extra[]): number {
  return round2(extras.filter((e) => e.status === 'aprobado').reduce((s, e) => s + e.amount, 0));
}

export function finalAmount(req: Pick<ServiceRequest, 'lines' | 'extras'>): number {
  return round2(linesTotal(req.lines) + approvedExtrasTotal(req.extras));
}

export interface Split {
  amount: number;
  rate: number;
  commission: number;
  makiNet: number;
}

/**
 * Reparto de un pago. Los materiales aprobados se reembolsan al costo al Maki
 * (no generan comisión) — informe 7.9: «materiales de obra se cobran al costo con boleta».
 */
export function splitPayment(
  req: Pick<ServiceRequest, 'lines' | 'extras'>,
  isRepeat: boolean,
  settings: Pick<Settings, 'commissionFirst' | 'commissionRepeat'>,
): Split {
  const rate = isRepeat ? settings.commissionRepeat : settings.commissionFirst;
  const materials = round2(
    req.extras.filter((e) => e.status === 'aprobado' && e.kind === 'material').reduce((s, e) => s + e.amount, 0),
  );
  const amount = finalAmount(req);
  const commissionable = round2(amount - materials);
  const commission = round2(commissionable * rate);
  return { amount, rate, commission, makiNet: round2(amount - commission) };
}

/**
 * Margen de contribución por servicio (informe 10.1):
 * MC = P·c − evaluador − P·g − P·p − adquisición − coordinación
 * Usa supuestos configurables; NO es un resultado medido.
 */
export function contributionMargin(
  p: Pick<Payment, 'amount' | 'commission' | 'isRepeat'>,
  usedEvaluator: boolean,
  s: Settings,
): number {
  const c = s.costs;
  return round2(
    p.commission -
      (usedEvaluator ? c.evaluatorCostPerQuote : 0) -
      p.amount * c.warrantyProvisionRate -
      p.amount * c.paymentFeeRate -
      (p.isRepeat ? 0 : c.acquisitionCostFirst) -
      c.coordinationHours * c.coordinationHourCost,
  );
}

export function formatPEN(n: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', minimumFractionDigits: 2 }).format(n);
}

export function pct(n: number, digits = 0): string {
  return `${(n * 100).toFixed(digits)} %`;
}
