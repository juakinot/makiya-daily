import type { Settings } from '@/domain/types';

/**
 * Ajustes por defecto. Todas las variables de negocio NO validadas son configurables
 * desde Admin › Configuración. Los valores provienen del informe (cap. 6, 8 y 10) y se
 * etiquetan como referencia, no como decisiones definitivas.
 */
export const DEFAULT_SETTINGS: Settings = {
  // Informe 6.3: 25 % primer servicio, 20 % con Mi Maki. Prompt: rango de referencia 20–25 %, no definitivo.
  commissionFirst: 0.25,
  commissionRepeat: 0.2,
  commissionReferenceRange: [0.2, 0.25],
  // Informe Tabla 19: mayor peso en calidad y cumplimiento que en precio.
  matchingWeights: { quality: 0.35, rating: 0.25, experience: 0.2, tradeTest: 0.1, affinity: 0.1 },
  maxCandidates: 3,
  newMakiSlot: true,
  aiConfidenceThreshold: 0.6,
  minLeadHours: 24,
  warrantyDays: 30,
  tradeTestMin: 14,
  // Informe 9.4 / ficha técnica: tarifario con tope de +10 % sobre la referencia de mercado.
  priceCapOverReference: 0.1,
  // Escalera de confianza: criterios PROPUESTOS (configurables) basados en las metas del informe:
  // retrabajo ≤ 10 % (C8), seguridad ≥ 4 (H2), precio justo ≥ 4 (H3), Makis activos ≥ 75 % (H4).
  ladder: {
    minCompletedByStep: { 2: 30, 3: 80, 4: 150, 5: 300 },
    maxReworkRate: 0.1,
    minSafety: 4,
    minFairPrice: 4,
    minMakiRetention: 0.75,
    minMakisPerCategory: 3,
  },
  // Informe Tabla 28 (supuestos del escenario base).
  costs: {
    warrantyProvisionRate: 0.05,
    paymentFeeRate: 0.02,
    acquisitionCostFirst: 8,
    evaluatorCostPerQuote: 8,
    coordinationHours: 0.4,
    coordinationHourCost: 10,
    monthlyFixedCosts: 1100,
  },
  diagnosticFee: 0,
};
