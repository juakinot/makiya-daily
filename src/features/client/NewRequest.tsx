import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Ban, Lightbulb, Minus, Plus, Sparkles, Trash2, UserCheck } from 'lucide-react';
import { getAIProvider, interpretRequest } from '@/ai';
import { Badge, Button, Card, Checkbox, ChipGroup, Field, Input, Money, Notice, PhotoPicker, Select, SimulatedTag, Stepper, Textarea } from '@/components/ui';
import { DISTRICTS, PACKS, WINDOW_LABEL } from '@/config/catalog';
import { linesTotal } from '@/domain/economics';
import type { Interpretation, SuggestedLine, TimeWindow } from '@/domain/types';
import { dateOnlyPlus, nowISO, uid } from '@/lib/utils';
import { createRequest, registerInterest, validateSchedule } from '@/services/requestService';
import { useActor, useApp } from '@/store/AppStore';

const EXAMPLES = [
  'Compré una cama de 2 plazas y un velador, necesito que los armen',
  'Quiero instalar mi televisor de 50" en la pared de la sala',
  'Necesito colgar dos repisas y un toallero en el baño',
  'Armar un ropero de 3 puertas que llegó en cajas',
];

export default function NewRequest() {
  const { db, run } = useApp();
  const me = useActor();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const home = db.homeProfiles.find((h) => h.clientId === me.id);
  const preItem = db.items.find((i) => i.id === params.get('item'));
  const preMaki = db.users.find((u) => u.id === params.get('maki'));
  const prePack = PACKS.find((p) => p.id === params.get('pack'));

  const [step, setStep] = useState(0);
  const [text, setText] = useState(prePack ? prePack.text : preItem ? `Necesito: ${preItem.name.charAt(0).toLowerCase() + preItem.name.slice(1)}` : '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoConsent, setPhotoConsent] = useState(false);
  const [ai, setAi] = useState<Interpretation | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lines, setLines] = useState<SuggestedLine[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [district, setDistrict] = useState(home?.district ?? me.district);
  const [addressRef, setAddressRef] = useState(home?.addressRef ?? '');
  const [date, setDate] = useState(() => {
    for (let i = 2; i < 9; i++) {
      const d = dateOnlyPlus(i);
      const [y, m, dd] = d.split('-').map(Number);
      if (new Date(y, m - 1, dd).getDay() !== 0) return d;
    }
    return dateOnlyPlus(2);
  });
  const [win, setWin] = useState<TimeWindow>('manana');
  const [error, setError] = useState('');
  const startedAt = useRef(nowISO());
  const submitted = useRef(false);
  const provider = getAIProvider();

  // Métricas de experiencia: inicio y abandono del formulario.
  useEffect(() => {
    run((d) => d.events.push({ id: uid('e'), type: 'request_started', at: startedAt.current, userId: me.id }));
    return () => {
      if (!submitted.current) run((d) => d.events.push({ id: uid('e'), type: 'request_abandoned', at: nowISO(), userId: me.id }));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analyze = async (ans: Record<string, string> = answers) => {
    setError('');
    if (text.trim().length < 8) {
      setError('Cuéntanos un poco más (mínimo 8 caracteres).');
      return;
    }
    if (photos.length && !photoConsent) {
      setError('Acepta el uso de las fotos o quítalas para continuar.');
      return;
    }
    setLoading(true);
    const r = await interpretRequest({ text, photoCount: photos.length, answers: ans }, { categories: db.categories, items: db.items, confidenceThreshold: db.settings.aiConfidenceThreshold });
    setLoading(false);
    setAi(r);
    setLines(r.suggestedLines.length ? r.suggestedLines : preItem ? [{ itemId: preItem.id, qty: 1 }] : []);
    setConfirmed(false);
    setStep(1);
  };

  const quoteLines = useMemo(
    () => lines.map((l) => { const it = db.items.find((i) => i.id === l.itemId)!; return { id: l.itemId, description: it.name, qty: l.qty, unitPrice: it.price }; }),
    [lines, db.items],
  );
  const total = linesTotal(quoteLines);
  const scheduleErr = validateSchedule(db, date, win);
  const needsHuman = !!ai && (ai.needsHumanReview || ai.customWork || lines.length === 0);

  const submit = () => {
    if (!ai) return;
    setError('');
    if (scheduleErr) return setError(scheduleErr);
    const req = run(
      (d, actor) =>
        createRequest(d, actor, {
          description: text,
          photos,
          photoConsent,
          interpretation: ai,
          classificationConfirmed: confirmed,
          answers,
          lines,
          district,
          addressRef,
          preferredDate: date,
          window: win,
          startedAt: startedAt.current,
        }),
      'Solicitud registrada.',
    );
    if (req) {
      submitted.current = true;
      nav(`/app/solicitudes/${req.id}${preMaki ? `?maki=${preMaki.id}` : ''}`);
    }
  };

  const setQty = (itemId: string, delta: number) => setLines((ls) => ls.map((l) => (l.itemId === itemId ? { ...l, qty: Math.min(10, Math.max(1, l.qty + delta)) } : l)));
  const addable = db.items.filter((i) => i.active && !lines.some((l) => l.itemId === i.id) && db.categories.find((c) => c.id === i.categoryId)?.status === 'activo');

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight">Pedir ayuda</h1>
        <p className="text-ink-600">Paso {step + 1} de 3 · meta: menos de 3 minutos</p>
        <div className="mt-4"><Stepper steps={['Cuéntanos', 'Orientación', 'Cuándo y dónde']} current={step} /></div>
      </div>
      {prePack && <Notice className="mb-4" title={prePack.name}>Completamos la descripción por ti. Puedes editarla, quitar o agregar servicios antes de aprobar.</Notice>}
      {preMaki && <Notice className="mb-4" icon={<UserCheck className="h-4 w-4" />} title={`Pedido con tu Maki: ${preMaki.name}`}>Lo mostraremos primero si está disponible en la franja que elijas.</Notice>}

      {step === 0 && (
        <Card className="space-y-5 p-5 sm:p-6">
          <Field label="¿Qué necesitas?" htmlFor="desc" hint="Escríbelo como se lo contarías a un amigo. No necesitas términos técnicos.">
            <Textarea id="desc" value={text} onChange={(e) => setText(e.target.value)} placeholder="Ej.: compré un escritorio y una repisa, necesito que los armen e instalen" autoFocus />
          </Field>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button key={e} type="button" onClick={() => setText(e)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-xs text-ink-700 hover:border-turq-500">{e}</button>
            ))}
          </div>
          <Field label="Fotos de la zona de trabajo" optional hint="Hasta 3. Fotografía el mueble o la pared, nunca a personas.">
            <PhotoPicker photos={photos} onChange={setPhotos} />
          </Field>
          {photos.length > 0 && (
            <Checkbox checked={photoConsent} onChange={setPhotoConsent} label="Autorizo el uso de estas fotos" description="Solo para evaluar mi solicitud y documentar el servicio (Ley N.° 29733)." />
          )}
          {error && <Notice tone="accent">{error}</Notice>}
          <Button block size="lg" loading={loading} onClick={() => analyze()} icon={<Sparkles className="h-5 w-5" />}>Continuar</Button>
          <p className="flex items-center justify-center gap-2 text-center text-xs text-ink-600">
            Orientación: {provider.label} {provider.isSimulated && <SimulatedTag>No es IA real</SimulatedTag>}
          </p>
        </Card>
      )}

      {step === 1 && ai && (
        <div className="space-y-4">
          {ai.scope === 'prohibido' && (
            <Card className="p-5">
              <Notice tone="accent" icon={<Ban className="h-4 w-4" />} title="Esto no lo hacemos">{ai.summary}</Notice>
              <Button className="mt-4" variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(0)}>Editar mi pedido</Button>
            </Card>
          )}
          {ai.scope === 'futuro' && (
            <Card className="p-5">
              <Notice tone="warn" title="Aún no ofrecemos este servicio">{ai.summary} Por ahora solo armamos muebles y hacemos instalaciones sencillas.</Notice>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    const ok = run((d, a) => registerInterest(d, a, ai.futureCategoryId!, text), 'Registramos tu interés. Te avisaremos cuando esté disponible.');
                    if (ok) { submitted.current = true; nav('/app'); }
                  }}
                >Avísenme cuando esté disponible</Button>
                <Button variant="secondary" onClick={() => setStep(0)}>Editar mi pedido</Button>
              </div>
            </Card>
          )}
          {ai.scope === 'autoservicio' && (
            <Card className="p-5">
              <Notice icon={<Lightbulb className="h-4 w-4" />} title="Orientación honesta: esto lo puedes resolver tú">{ai.selfHelpTip}</Notice>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => { submitted.current = true; nav('/app'); }}>Gracias, lo intento</Button>
                <Button onClick={() => { setAi({ ...ai, scope: 'mvp', needsHumanReview: false }); setLines([{ itemId: 'armado-almacenamiento', qty: 1 }]); }}>Prefiero que venga un Maki</Button>
              </div>
            </Card>
          )}

          {(ai.scope === 'mvp' || ai.scope === 'desconocido') && (
            <>
              <Card className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-ink-600">Lo que entendimos</p>
                  <div className="flex items-center gap-2">
                    <Badge tone={ai.confidence >= db.settings.aiConfidenceThreshold ? 'mint' : 'warn'}>Confianza {Math.round(ai.confidence * 100)} %</Badge>
                    {ai.isSimulated && <SimulatedTag />}
                  </div>
                </div>
                <p className="mt-2 text-lg font-bold">{lines.length ? `Necesitas: ${quoteLines.map((l) => `${l.qty > 1 ? `${l.qty} × ` : ''}${l.description.charAt(0).toLowerCase() + l.description.slice(1)}`).join(', ')}.` : ai.summary}</p>
                <details className="mt-2 text-xs text-ink-600">
                  <summary className="cursor-pointer">¿Por qué lo clasificamos así?</summary>
                  <ul className="mt-1 list-disc pl-5">{ai.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
                </details>

                {ai.questions.length > 0 && (
                  <div className="mt-5 space-y-4 rounded-xl bg-mint-50 p-4">
                    <p className="text-sm font-semibold text-petrol-800">Para afinar tu propuesta ({ai.questions.length} pregunta{ai.questions.length > 1 ? 's' : ''}):</p>
                    {ai.questions.map((q) => (
                      <Field key={q.id} label={q.text}>
                        {q.options ? (
                          <ChipGroup options={q.options.map((o) => ({ value: o, label: o }))} value={answers[q.id] ?? ''} onChange={(v) => setAnswers({ ...answers, [q.id]: v as string })} />
                        ) : (
                          <Input value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                        )}
                      </Field>
                    ))}
                    <Button size="sm" variant="secondary" loading={loading} disabled={ai.questions.some((q) => !answers[q.id])} onClick={() => analyze(answers)}>Actualizar orientación</Button>
                  </div>
                )}

                {lines.length > 0 && (
                  <div className="mt-5 divide-y divide-line rounded-xl border border-line">
                    {quoteLines.map((l) => (
                      <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{l.description}</p>
                          <p className="text-xs text-ink-600"><Money value={l.unitPrice} /> c/u · precio cerrado</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="rounded-lg border border-line p-1.5 disabled:opacity-40" onClick={() => setQty(l.id, -1)} disabled={l.qty <= 1} aria-label="Restar"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-6 text-center font-semibold tabular-nums">{l.qty}</span>
                          <button className="rounded-lg border border-line p-1.5" onClick={() => setQty(l.id, 1)} aria-label="Sumar"><Plus className="h-3.5 w-3.5" /></button>
                          <button className="ml-1 rounded-lg p-1.5 text-ink-400 hover:text-accent-700" onClick={() => setLines(lines.filter((x) => x.itemId !== l.id))} aria-label="Quitar"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-surface px-4 py-3">
                      <span className="text-sm font-semibold">Total estimado (precio cerrado)</span>
                      <Money value={total} className="text-lg font-extrabold text-petrol-700" />
                    </div>
                  </div>
                )}
                {addable.length > 0 && (
                  <div className="mt-3">
                    <Select value="" onChange={(e) => e.target.value && setLines([...lines, { itemId: e.target.value, qty: 1 }])} aria-label="Agregar otro servicio">
                      <option value="">+ Agregar o corregir con otro servicio del catálogo…</option>
                      {addable.map((i) => <option key={i.id} value={i.id}>{i.name} — S/ {i.price.toFixed(2)}</option>)}
                    </Select>
                  </div>
                )}

                {needsHuman && (
                  <Notice tone="warn" className="mt-4" icon={<AlertTriangle className="h-4 w-4" />} title="Un especialista revisará tu pedido">
                    {ai.customWork ? 'Incluye trabajo a medida: un evaluador de MakiYa verificará el alcance y el precio antes de mostrártelo.' : 'No tenemos suficiente certeza. Un especialista de MakiYa definirá el alcance y el precio (respuesta en ≤ 2 h hábiles).'}
                  </Notice>
                )}
                <div className="mt-5">
                  <Checkbox checked={confirmed} onChange={setConfirmed} label={needsHuman ? 'Entiendo que un especialista revisará mi pedido' : 'Sí, esto es lo que necesito'} description={!needsHuman ? 'Confirmas la clasificación. El Maki igual verificará en la visita.' : undefined} />
                </div>
              </Card>
              <div className="flex gap-2">
                <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(0)}>Atrás</Button>
                <Button className="flex-1" disabled={!confirmed || (!needsHuman && ai.questions.some((q) => !answers[q.id]))}
                  title={!needsHuman && ai.questions.some((q) => !answers[q.id]) ? 'Responde las preguntas para continuar' : undefined} onClick={() => setStep(2)}>Continuar</Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && ai && (
        <div className="space-y-4">
          <Card className="space-y-5 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fecha" htmlFor="date" hint="Lunes a sábado, con al menos 24 h de anticipación.">
                <Input id="date" type="date" min={dateOnlyPlus(1)} max={dateOnlyPlus(45)} value={date} onChange={(e) => setDate(e.target.value)} invalid={!!scheduleErr} />
              </Field>
              <Field label="Distrito" htmlFor="dist">
                <Select id="dist" value={district} onChange={(e) => setDistrict(e.target.value)}>
                  {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Franja horaria">
              <ChipGroup options={(Object.keys(WINDOW_LABEL) as TimeWindow[]).map((w) => ({ value: w, label: WINDOW_LABEL[w] }))} value={win} onChange={(v) => setWin(v as TimeWindow)} />
            </Field>
            <Field label="Referencia de dirección" htmlFor="addr" optional hint="La dirección exacta solo se comparte con el Maki que acepte el trabajo.">
              <Input id="addr" value={addressRef} onChange={(e) => setAddressRef(e.target.value)} placeholder="Ej.: cerca al parque, edificio azul" />
            </Field>
            {scheduleErr && <Notice tone="warn">{scheduleErr}</Notice>}
          </Card>
          <Card className="p-5">
            <p className="text-sm font-semibold text-ink-600">Resumen</p>
            <p className="mt-1">{needsHuman ? 'Tu pedido pasará a revisión de un especialista. Verás el precio verificado antes de decidir.' : `${quoteLines.map((l) => `${l.qty} × ${l.description}`).join(', ')} · `}{!needsHuman && <Money value={total} className="font-bold" />}</p>
            <p className="mt-1 text-sm text-ink-600">Aún no pagas nada. Primero verás a tus Makis y aprobarás por escrito el alcance y el precio.</p>
          </Card>
          {error && <Notice tone="accent">{error}</Notice>}
          <div className="flex gap-2">
            <Button variant="secondary" icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep(1)}>Atrás</Button>
            <Button className="flex-1" size="lg" disabled={!!scheduleErr} onClick={submit}>{needsHuman ? 'Enviar a revisión' : 'Ver mi propuesta'}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
