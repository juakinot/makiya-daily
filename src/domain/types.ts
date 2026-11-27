/**
 * Modelo de dominio de MakiYa.
 * Un mismo modelo sirve a los tres entornos (cliente, Maki, administrador).
 */

export type Role = 'client' | 'maki' | 'admin';
export type ID = string;
export type ISODate = string;

export interface User {
  id: ID;
  role: Role;
  name: string;
  email: string;
  phone: string;
  district: string;
  createdAt: ISODate;
  /** Hash SHA-256 de la contraseña (solo modo demo local). */
  passwordHash?: string;
  /** Usuario de datos de demostración (identificable). */
  isDemo?: boolean;
  dataConsentAt?: ISODate;
}

/* ───────────── Catálogo ───────────── */

export type ServiceLine = 'arreglos' | 'reset' | 'daily';
export type CategoryStatus = 'activo' | 'futuro';

export interface ServiceCategory {
  id: ID;
  name: string;
  line: ServiceLine;
  status: CategoryStatus;
  description: string;
  icon: string; // nombre de icono lucide
  /** Escalón en la escalera de confianza (1 = más simple). */
  trustStep: 1 | 2 | 3 | 4 | 5;
}

export interface ClosingTest {
  test: string;
  criterion: string;
  checklist: string[];
}

export interface MarketSource {
  name: string;
  price: string;
  url?: string;
  note?: string;
}

/** Referencia de mercado en Lima (investigación de escritorio; no es una cotización garantizada). */
export interface MarketReference {
  low: number;
  high: number;
  sources: MarketSource[];
  checkedAt: string; // YYYY-MM-DD
  /** true si hay una sola fuente o fuentes poco comparables. */
  limited?: boolean;
}

export interface ServiceItem {
  id: ID;
  categoryId: ID;
  name: string;
  unit: string;
  /** Precio del prototipo por unidad (S/), alineado a la referencia de mercado. Configurable. */
  price: number;
  marketRef?: MarketReference;
  /** Por qué este servicio genera confianza en el segmento inicial. */
  trustRationale?: string;
  durationMin: number;
  includes: string[];
  excludes: string[];
  closingTest: ClosingTest;
  active: boolean;
  keywords: string[];
}

/* ───────────── Personas ───────────── */

export type HomeType = 'departamento' | 'casa' | 'habitacion';

export interface HomeProfile {
  clientId: ID;
  district: string;
  addressRef: string;
  homeType: HomeType;
  floor?: string;
  notes: string;
  favoriteMakiIds: ID[];
}

export type TimeWindow = 'manana' | 'mediodia' | 'tarde';
/** 0 = domingo … 6 = sábado */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Availability = Record<Weekday, TimeWindow[]>;

export type MakiStatus = 'postulante' | 'en_evaluacion' | 'habilitado' | 'rechazado' | 'suspendido';

export interface Verification {
  identity: boolean;
  background: boolean;
  references: boolean;
  /** Puntaje de la prueba de oficio (0–20). Mínimo para habilitar: 14. */
  tradeTestScore: number | null;
  reviewedBy?: ID;
  reviewedAt?: ISODate;
  notes?: string;
}

export interface MakiProfile {
  userId: ID;
  bio: string;
  specialties: ID[]; // categoryIds
  experienceYears: number;
  districts: string[];
  availability: Availability;
  status: MakiStatus;
  verification: Verification;
  references: { name: string; phone: string }[];
  paused: boolean;
  joinedAt: ISODate;
}

/* ───────────── IA ───────────── */

export type InterpretationScope = 'mvp' | 'futuro' | 'prohibido' | 'autoservicio' | 'desconocido';

export interface SuggestedLine {
  itemId: ID;
  qty: number;
}

export interface Interpretation {
  providerId: string;
  isSimulated: boolean;
  categoryId?: ID;
  suggestedLines: SuggestedLine[];
  confidence: number; // 0–1
  missingInfo: string[];
  questions: { id: string; text: string; options?: string[] }[];
  summary: string;
  scope: InterpretationScope;
  /** Categoría futura detectada (para registrar interés). */
  futureCategoryId?: ID;
  needsHumanReview: boolean;
  reasons: string[];
  selfHelpTip?: string;
  /** Pide un trabajo a medida que el tarifario no cubre. */
  customWork: boolean;
}

/* ───────────── Solicitud ───────────── */

export type RequestStatus =
  | 'en_revision'
  | 'propuesta_lista'
  | 'esperando_maki'
  | 'confirmada'
  | 'en_curso'
  | 'evidencia_enviada'
  | 'con_incidencia'
  | 'completada'
  | 'cancelada';

export type PriceRoute = 'tarifario' | 'evaluador';

export interface QuoteLine {
  id: ID;
  itemId?: ID; // undefined = línea a medida (vía evaluador)
  description: string;
  qty: number;
  unitPrice: number;
}

export interface Candidate {
  makiId: ID;
  score: number;
  reasons: string[];
  isNewMaki: boolean;
  isMyMaki: boolean;
}

export interface Offer {
  makiId: ID;
  sentAt: ISODate;
  status: 'pendiente' | 'aceptada' | 'rechazada';
  respondedAt?: ISODate;
  reason?: string;
}

export interface Extra {
  id: ID;
  kind: 'trabajo' | 'material';
  description: string;
  amount: number;
  receipt?: string;
  status: 'propuesto' | 'aprobado' | 'rechazado';
  proposedAt: ISODate;
  decidedAt?: ISODate;
}

export interface Evidence {
  photos: string[];
  checklist: { label: string; ok: boolean }[];
  notes: string;
  submittedAt: ISODate;
}

export interface Conformity {
  signedName: string;
  signedAt: ISODate;
  quality: number; // 1–5
  safety: number; // «me sentí seguro» 1–5 (H2)
  fairPrice: number; // «precio justo» 1–5 (H3)
  ease: number; // facilidad de uso 1–5
  nps: number; // 0–10
  comment: string;
}

export interface Payment {
  id: ID;
  requestId: ID;
  clientId: ID;
  makiId: ID;
  amount: number;
  commissionRate: number;
  commission: number;
  makiNet: number;
  isRepeat: boolean;
  method: 'simulado';
  paidAt: ISODate;
  settlementId?: ID;
}

export interface Settlement {
  id: ID;
  makiId: ID;
  paymentIds: ID[];
  total: number;
  createdAt: ISODate;
  createdBy: ID;
  method: 'simulado';
}

export type IncidentType = 'conformidad' | 'garantia' | 'seguridad' | 'cobro' | 'otro';
export type IncidentStatus = 'abierta' | 'en_correccion' | 'resuelta' | 'no_procede';

export interface Incident {
  id: ID;
  requestId: ID;
  clientId: ID;
  makiId?: ID;
  type: IncidentType;
  description: string;
  status: IncidentStatus;
  createdAt: ISODate;
  /** Fecha límite de respuesta (24 h) */
  responseDue: ISODate;
  /** Fecha límite de corrección por garantía (72 h) */
  fixDue?: ISODate;
  resolution?: string;
  resolvedAt?: ISODate;
  countsAsRework: boolean;
}

export interface TimelineEvent {
  at: ISODate;
  type: string;
  label: string;
  by: Role | 'sistema';
}

export interface ServiceRequest {
  id: ID;
  code: string;
  clientId: ID;
  status: RequestStatus;
  createdAt: ISODate;
  /** Momento en que el cliente abrió el asistente (para medir tiempo de solicitud). */
  startedAt: ISODate;
  description: string;
  photos: string[];
  photoConsent: boolean;
  district: string;
  addressRef: string;
  preferredDate: string; // YYYY-MM-DD
  window: TimeWindow;
  interpretation: Interpretation;
  classificationConfirmed: boolean;
  answers: Record<string, string>;
  categoryId?: ID;
  route: PriceRoute;
  lines: QuoteLine[];
  quoteVerifiedBy?: ID;
  quoteVerifiedAt?: ISODate;
  proposalAt?: ISODate;
  candidates: Candidate[];
  selectedMakiId?: ID;
  /** Opciones de respaldo elegidas por el cliente: si el Maki rechaza, la oferta pasa a la siguiente. */
  backupMakiIds?: ID[];
  offers: Offer[];
  scopeApprovedAt?: ISODate;
  approvedTotal?: number;
  assignedMakiId?: ID;
  visitCode?: string;
  startedVisitAt?: ISODate;
  extras: Extra[];
  evidence?: Evidence;
  conformity?: Conformity;
  paymentId?: ID;
  warrantyUntil?: ISODate;
  cancellation?: { by: Role; reason: string; at: ISODate };
  timeline: TimelineEvent[];
}

export interface FutureInterest {
  id: ID;
  clientId: ID;
  categoryId: ID;
  description: string;
  createdAt: ISODate;
}

export interface AnalyticsEvent {
  id: ID;
  type: 'request_started' | 'request_abandoned' | 'request_submitted' | 'clarification_needed' | 'proposal_viewed';
  at: ISODate;
  userId?: ID;
  requestId?: ID;
}

/* ───────────── Configuración ───────────── */

export interface MatchingWeights {
  quality: number;
  rating: number;
  experience: number;
  tradeTest: number;
  affinity: number;
}

export interface CostAssumptions {
  warrantyProvisionRate: number; // 5 %
  paymentFeeRate: number; // 2 %
  acquisitionCostFirst: number; // S/ 8
  evaluatorCostPerQuote: number; // S/ 8
  coordinationHours: number; // h por servicio
  coordinationHourCost: number; // S/ 10
  monthlyFixedCosts: number;
}

export interface LadderCriteria {
  /** Servicios completados sin retrabajo necesarios para habilitar cada escalón (2–5). */
  minCompletedByStep: Record<2 | 3 | 4 | 5, number>;
  maxReworkRate: number;
  minSafety: number;
  minFairPrice: number;
  minMakiRetention: number;
  minMakisPerCategory: number;
}

export interface Settings {
  commissionFirst: number; // 0.25
  commissionRepeat: number; // 0.20
  commissionReferenceRange: [number, number]; // [0.20, 0.25]
  matchingWeights: MatchingWeights;
  maxCandidates: number;
  newMakiSlot: boolean;
  aiConfidenceThreshold: number;
  minLeadHours: number;
  warrantyDays: number;
  tradeTestMin: number;
  /** Regla del informe (cap. 9): el tarifario no puede superar la referencia de mercado en más de este %. */
  priceCapOverReference: number;
  /** Criterios propuestos para habilitar cada escalón de la escalera de confianza. */
  ladder: LadderCriteria;
  costs: CostAssumptions;
  diagnosticFee: number;
}

export interface Database {
  version: number;
  users: User[];
  homeProfiles: HomeProfile[];
  makiProfiles: MakiProfile[];
  categories: ServiceCategory[];
  items: ServiceItem[];
  requests: ServiceRequest[];
  payments: Payment[];
  settlements: Settlement[];
  incidents: Incident[];
  interests: FutureInterest[];
  events: AnalyticsEvent[];
  settings: Settings;
  seq: number;
}
