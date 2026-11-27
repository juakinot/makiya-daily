import type { Interpretation } from '@/domain/types';
import type { AIProvider, InterpretContext, InterpretInput } from './types';

/**
 * Proveedor de IA real (PREPARADO, NO ACTIVO por defecto).
 *
 * El frontend NUNCA llama directamente a un proveedor de modelos ni guarda claves:
 * envía la solicitud a un endpoint propio (`/api/ai/interpret`, p. ej. una Supabase Edge
 * Function) que agrega la clave en el servidor, llama al modelo con un prompt de sistema
 * acotado al catálogo y devuelve un JSON con la forma de `Interpretation`.
 *
 * Activación: VITE_AI_MODE=remote
 */
export class RemoteLLMProvider implements AIProvider {
  readonly id = 'remote-llm';
  readonly label = 'IA remota (backend)';
  readonly isSimulated = false;

  constructor(private endpoint = '/api/ai/interpret') {}

  async interpret(input: InterpretInput, ctx: InterpretContext): Promise<Interpretation> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: input.text,
        photoCount: input.photoCount,
        answers: input.answers ?? {},
        // Solo se envía el catálogo activo (ids, nombres, alcance); nunca datos personales.
        catalog: ctx.items.filter((i) => i.active).map((i) => ({ id: i.id, categoryId: i.categoryId, name: i.name, includes: i.includes, excludes: i.excludes })),
      }),
    });
    if (!res.ok) throw new Error(`El servicio de IA respondió ${res.status}`);
    const data = (await res.json()) as Interpretation;
    return { ...data, providerId: this.id, isSimulated: false };
  }
}
