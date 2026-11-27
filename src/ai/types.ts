import type { Interpretation, ServiceCategory, ServiceItem } from '@/domain/types';

export interface InterpretInput {
  text: string;
  photoCount: number;
  /** Respuestas a preguntas complementarias previas (id → respuesta). */
  answers?: Record<string, string>;
}

export interface InterpretContext {
  categories: ServiceCategory[];
  items: ServiceItem[];
  confidenceThreshold: number;
}

/**
 * Contrato que cualquier proveedor de IA debe cumplir.
 * La IA PROPONE: interpreta, clasifica, detecta información faltante, pregunta (máx. 2) y resume.
 * NO diagnostica fallas complejas ni fija presupuestos definitivos.
 */
export interface AIProvider {
  readonly id: string;
  readonly label: string;
  /** true si NO es una integración real de IA (debe mostrarse así en la UI). */
  readonly isSimulated: boolean;
  interpret(input: InterpretInput, ctx: InterpretContext): Promise<Interpretation>;
}
