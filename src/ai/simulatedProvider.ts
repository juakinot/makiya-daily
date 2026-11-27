import type { Interpretation, ServiceItem, SuggestedLine } from '@/domain/types';
import type { AIProvider, InterpretContext, InterpretInput } from './types';

/**
 * CLASIFICADOR SIMULADO POR REGLAS — NO ES IA REAL.
 * Usa palabras clave en español para reproducir el comportamiento esperado del asistente
 * y permitir demostrar el flujo sin servicios externos. Ver ai/remoteProvider.ts para la
 * integración real prevista.
 */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const NUMBER_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, par: 2,
};

/** Fuera del alcance por seguridad (informe 5.4 y 8.5). */
const PROHIBITED: { kw: string[]; msg: string }[] = [
  { kw: ['gas', 'balon de gas', 'terma a gas', 'calentador a gas'], msg: 'Las instalaciones de gas requieren instaladores certificados. Por seguridad, no las realizamos.' },
  { kw: ['tablero', 'llave general', 'cableado nuevo', 'cortocircuito', 'chispa', 'olor a quemado'], msg: 'Por seguridad no intervenimos el tablero eléctrico ni cableado nuevo. Si hay olor a quemado o chispas, corta la energía y contacta a un electricista colegiado.' },
  { kw: ['urgente', 'emergencia', 'ahora mismo', 'inundacion', 'inundando'], msg: 'Por ahora solo atendemos trabajos programados con al menos 24 horas de anticipación; no atendemos emergencias.' },
  { kw: ['muro portante', 'demoler', 'romper pared', 'columna', 'viga'], msg: 'No realizamos trabajos estructurales.' },
];

/** Categorías futuras: se detectan para registrar interés, no se contratan. */
const FUTURE: { categoryId: string; kw: string[] }[] = [
  { categoryId: 'gasfiteria', kw: ['grifo', 'cano', 'caño', 'fuga', 'gotea', 'inodoro', 'wc', 'desatoro', 'atorado', 'atasco', 'lavadero', 'ducha', 'agua', 'tuberia', 'griferia', 'terma'] },
  { categoryId: 'electricidad', kw: ['enchufe', 'tomacorriente', 'interruptor', 'foco', 'luminaria', 'lampara', 'luz no', 'electric', 'cable'] },
  { categoryId: 'laptops', kw: ['laptop', 'computadora', 'pc ', 'notebook'] },
  { categoryId: 'televisores', kw: ['tv no prende', 'televisor no prende', 'reparar tv', 'reparar televisor', 'pantalla rota', 'tele no enciende'] },
  { categoryId: 'consolas', kw: ['consola', 'playstation', 'ps4', 'ps5', 'xbox', 'nintendo'] },
  { categoryId: 'limpieza', kw: ['limpieza', 'limpiar', 'limpien'] },
  { categoryId: 'organizacion', kw: ['organizar', 'ordenar', 'orden '] },
];

const CUSTOM_KW = ['a medida', 'cortar', 'recortar', 'modificar', 'empotrado', 'melamina a medida', 'reducir tamano', 'adaptar'];
const SELF_HELP: { kw: string[]; tip: string }[] = [
  { kw: ['ajustar tornillo', 'apretar tornillo', 'tornillo suelto', 'perilla suelta', 'jalador suelto'], tip: 'Esto probablemente lo puedes resolver tú: con un destornillador del tamaño correcto, aprieta el tornillo en sentido horario sin forzarlo. Si la rosca está barrida, ahí sí te ayudamos.' },
  { kw: ['puerta del ropero roza', 'bisagra desajustada', 'regular bisagra'], tip: 'Las bisagras de los muebles tienen un tornillo de regulación: gíralo un cuarto de vuelta y prueba. Si no mejora, podemos ayudarte.' },
];

function detectQty(text: string, keyword: string): number {
  const t = norm(text);
  const k = norm(keyword);
  const idx = t.indexOf(k);
  if (idx < 0) return 1;
  const before = t.slice(Math.max(0, idx - 14), idx).trim().split(/\s+/).slice(-2);
  for (const w of before.reverse()) {
    if (/^\d+$/.test(w)) return Math.min(parseInt(w, 10), 10);
    if (NUMBER_WORDS[w]) return NUMBER_WORDS[w];
  }
  // plural sin número → 2 por defecto se considera ambiguo; mantenemos 1 y pedimos confirmación
  return 1;
}

function matchItems(text: string, items: ServiceItem[]): { item: ServiceItem; kw: string; hits: number }[] {
  const t = norm(text);
  const out: { item: ServiceItem; kw: string; hits: number }[] = [];
  for (const item of items) {
    if (!item.active) continue;
    let best = '';
    let hits = 0;
    for (const kw of item.keywords) {
      const k = norm(kw);
      const re = new RegExp(`(^|[^a-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(es|s)?([^a-z]|$)`);
      if (re.test(t)) {
        hits += 1;
        if (k.length > best.length) best = kw;
      }
    }
    if (hits > 0) out.push({ item, kw: best, hits });
  }
  // «mueble» genérico solo si no hubo otro mueble más específico
  const specific = out.filter((o) => o.item.id !== 'armado-almacenamiento' || o.kw !== 'mueble');
  const res = specific.length ? specific : out;
  // «soporte» de TV vs «baño»: evitar doble conteo cuando el único indicio de baño es «baño» y hay otro accesorio
  return res.sort((a, b) => b.hits - a.hits || b.kw.length - a.kw.length);
}

export class SimulatedRulesProvider implements AIProvider {
  readonly id = 'simulated-rules';
  readonly label = 'Clasificación simulada por reglas';
  readonly isSimulated = true;

  constructor(private latencyMs = 600) {}

  async interpret(input: InterpretInput, ctx: InterpretContext): Promise<Interpretation> {
    if (this.latencyMs) await new Promise((r) => setTimeout(r, this.latencyMs));
    const text = `${input.text} ${Object.values(input.answers ?? {}).join(' ')}`;
    const t = norm(text);
    const reasons: string[] = [];
    const base: Interpretation = {
      providerId: this.id,
      isSimulated: true,
      suggestedLines: [],
      confidence: 0,
      missingInfo: [],
      questions: [],
      summary: '',
      scope: 'desconocido',
      needsHumanReview: false,
      reasons,
      customWork: false,
    };

    if (t.trim().length < 8) {
      return {
        ...base,
        missingInfo: ['Descripción de la necesidad'],
        questions: [{ id: 'detalle', text: 'Cuéntanos un poco más: ¿qué mueble o accesorio es y qué quieres que hagamos?' }],
        summary: 'Aún no tenemos suficiente información.',
      };
    }

    for (const p of PROHIBITED) {
      if (p.kw.some((k) => t.includes(norm(k)))) {
        reasons.push('Se detectó un pedido fuera de las reglas de seguridad.');
        return { ...base, scope: 'prohibido', confidence: 0.9, summary: p.msg };
      }
    }

    for (const s of SELF_HELP) {
      if (s.kw.some((k) => t.includes(norm(k)))) {
        reasons.push('El pedido parece un ajuste menor que puede hacer el propio cliente.');
        return { ...base, scope: 'autoservicio', confidence: 0.7, summary: 'Ajuste menor.', selfHelpTip: s.tip };
      }
    }

    const matches = matchItems(text, ctx.items);

    // Si no hay match del MVP pero sí de una categoría futura → registrar interés.
    if (matches.length === 0) {
      const fut = FUTURE.find((f) => f.kw.some((k) => t.includes(norm(k))));
      if (fut) {
        const cat = ctx.categories.find((c) => c.id === fut.categoryId);
        reasons.push(`Corresponde a «${cat?.name}», categoría aún no disponible.`);
        return {
          ...base,
          scope: 'futuro',
          futureCategoryId: fut.categoryId,
          confidence: 0.8,
          summary: `Esto corresponde a ${cat?.name ?? 'una categoría futura'}, que todavía no ofrecemos.`,
        };
      }
      reasons.push('No se identificó un servicio del catálogo con suficiente certeza.');
      return {
        ...base,
        confidence: 0.25,
        needsHumanReview: !!input.answers && Object.keys(input.answers).length > 0,
        missingInfo: ['Tipo de mueble o accesorio'],
        questions: input.answers?.tipo
          ? []
          : [{ id: 'tipo', text: '¿Se trata de armar un mueble o de instalar algo en la pared?', options: ['Armar un mueble', 'Instalar algo en la pared', 'Otro'] }],
        summary: 'No estamos seguros de qué servicio necesitas. Un especialista de MakiYa puede revisarlo.',
      };
    }

    // Líneas sugeridas (máx. una por ítem)
    const lines: SuggestedLine[] = [];
    const seen = new Set<string>();
    for (const m of matches) {
      if (seen.has(m.item.id)) continue;
      // evitar que «baño» sume accesorio genérico si ya hay accesorio de baño
      if (m.item.id === 'inst-accesorio' && seen.has('inst-bano') && m.hits === 1 && m.kw === 'espejo') continue;
      seen.add(m.item.id);
      lines.push({ itemId: m.item.id, qty: detectQty(text, m.kw) });
    }
    // Ropero: el tamaño define el servicio (hasta 3 puertas vs. 4 a 6 o corredizas).
    const answersPre = input.answers ?? {};
    const bigWardrobe = /([4-6]|cuatro|cinco|seis)\s*puertas|corrediz/.test(t) || ['4 a 6 puertas', 'Puertas corredizas'].includes(answersPre.ropero_puertas ?? '');
    const small = lines.find((l) => l.itemId === 'armado-ropero');
    const big = lines.find((l) => l.itemId === 'armado-ropero-grande');
    if (small && (big || bigWardrobe) && ctx.items.some((i) => i.id === 'armado-ropero-grande' && i.active)) {
      if (big) lines.splice(lines.indexOf(small), 1);
      else small.itemId = 'armado-ropero-grande';
    }
    const catIds = [...new Set(lines.map((l) => ctx.items.find((i) => i.id === l.itemId)!.categoryId))];
    const categoryId = catIds[0];

    let confidence = 0.55 + Math.min(matches[0].hits, 3) * 0.12 + (input.photoCount > 0 ? 0.08 : 0);
    if (catIds.length > 1) confidence -= 0.05;
    const questions: Interpretation['questions'] = [];
    const missing: string[] = [];
    const answers = input.answers ?? {};

    // Trabajo a medida → vía evaluador
    const customWork = CUSTOM_KW.some((k) => t.includes(norm(k)));
    if (customWork) {
      reasons.push('El pedido incluye trabajo a medida: requiere presupuesto verificado por un evaluador.');
      confidence = Math.min(confidence, 0.5);
    }

    // Preguntas complementarias (máximo 2)
    const ids = lines.map((l) => l.itemId);
    if (ids.includes('inst-tv') && !answers.tv_pulgadas && !/\d{2}\s*(\"|pulg)/.test(t)) {
      missing.push('Tamaño del televisor');
      questions.push({ id: 'tv_pulgadas', text: '¿De cuántas pulgadas es tu televisor y ya tienes el soporte?', options: ['Hasta 55" y tengo soporte', '56–65" y tengo soporte', 'Aún no tengo soporte', 'Más de 65"'] });
    }
    if (ids.some((i) => i.startsWith('inst-')) && !answers.pared && !/(ladrillo|concreto|drywall|mayolica|melamina)/.test(t)) {
      missing.push('Tipo de pared');
      questions.push({ id: 'pared', text: '¿De qué material es la pared?', options: ['Ladrillo o concreto', 'Drywall', 'Mayólica', 'No sé'] });
    }
    if (ids.includes('armado-ropero') && !answers.ropero_puertas && !/puertas|corrediz/.test(t)) {
      missing.push('Tamaño del ropero');
      questions.push({ id: 'ropero_puertas', text: '¿Cuántas puertas tiene el ropero?', options: ['2 o 3 puertas', '4 a 6 puertas', 'Puertas corredizas'] });
    }
    const finalQuestions = questions.slice(0, 2);
    confidence -= finalQuestions.length * 0.05;

    // Ajustes por respuestas
    if (answers.tv_pulgadas === 'Más de 65"') {
      reasons.push('Televisores de más de 65" están fuera del alcance estándar.');
      confidence = Math.min(confidence, 0.45);
    }
    if (answers.pared === 'Drywall') {
      reasons.push('Drywall puede requerir refuerzo: se recomienda revisión del evaluador.');
      confidence = Math.min(confidence, 0.5);
    }
    if (answers.pared === 'No sé') confidence -= 0.05;

    confidence = Math.max(0, Math.min(0.97, confidence));
    const names = lines.map((l) => {
      const it = ctx.items.find((i) => i.id === l.itemId)!;
      return `${l.qty > 1 ? `${l.qty} × ` : ''}${it.name.toLowerCase()}`;
    });
    reasons.unshift(`Palabras clave detectadas: ${matches.slice(0, 3).map((m) => `«${m.kw}»`).join(', ')}.`);
    if (input.photoCount > 0) reasons.push(`${input.photoCount} foto(s) adjunta(s) (no se analizan en modo simulado).`);

    const lowConfidence = confidence < ctx.confidenceThreshold;
    return {
      ...base,
      categoryId,
      suggestedLines: lines,
      confidence: Math.round(confidence * 100) / 100,
      missingInfo: missing,
      questions: finalQuestions,
      summary: `Necesitas: ${names.join(', ')}.`,
      scope: 'mvp',
      customWork,
      needsHumanReview: customWork || (lowConfidence && finalQuestions.length === 0),
    };
  }
}
