import type { Interpretation } from '@/domain/types';
import { RemoteLLMProvider } from './remoteProvider';
import { SimulatedRulesProvider } from './simulatedProvider';
import type { AIProvider, InterpretContext, InterpretInput } from './types';

export type { AIProvider } from './types';

let provider: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (!provider) {
    const mode = import.meta.env?.VITE_AI_MODE;
    provider = mode === 'remote' ? new RemoteLLMProvider() : new SimulatedRulesProvider();
  }
  return provider;
}

export function setAIProvider(p: AIProvider) {
  provider = p;
}

/**
 * Guardrails aplicados a CUALQUIER proveedor (simulado o real):
 * - máximo 2 preguntas complementarias;
 * - baja confianza sin preguntas pendientes → revisión humana;
 * - las líneas sugeridas solo pueden referir a servicios ACTIVOS del catálogo
 *   (la IA no puede fijar precios ni inventar servicios);
 * - si el proveedor falla, se deriva a revisión humana en vez de bloquear al cliente.
 */
export async function interpretRequest(input: InterpretInput, ctx: InterpretContext, p: AIProvider = getAIProvider()): Promise<Interpretation> {
  let r: Interpretation;
  try {
    r = await p.interpret(input, ctx);
  } catch {
    return {
      providerId: p.id,
      isSimulated: p.isSimulated,
      suggestedLines: [],
      confidence: 0,
      missingInfo: [],
      questions: [],
      summary: 'No pudimos interpretar tu solicitud automáticamente. Un especialista la revisará.',
      scope: 'desconocido',
      needsHumanReview: true,
      reasons: ['Error del proveedor de IA: se deriva a revisión humana.'],
      customWork: false,
    };
  }
  const activeIds = new Set(ctx.items.filter((i) => i.active).map((i) => i.id));
  const suggestedLines = r.suggestedLines.filter((l) => activeIds.has(l.itemId) && l.qty > 0 && l.qty <= 10);
  const questions = r.questions.slice(0, 2);
  const low = r.confidence < ctx.confidenceThreshold;
  const needsHumanReview =
    (r.scope === 'mvp' && (r.needsHumanReview || (low && questions.length === 0) || suggestedLines.length === 0)) ||
    (r.scope === 'desconocido' && (r.needsHumanReview || questions.length === 0));
  return { ...r, suggestedLines, questions, needsHumanReview };
}
