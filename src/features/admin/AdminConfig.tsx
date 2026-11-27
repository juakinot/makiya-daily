import { useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { TrustLadder } from '@/components/TrustLadder';
import { priceCap, priceStatus, PRICE_STATUS_LABEL } from '@/domain/pricing';
import { businessMetrics, clientMetrics, makiMetrics, northStar } from '@/analytics/metrics';
import { Badge, Button, Card, CardHeader, Checkbox, Field, Input, Money, Notice, PageHeader, SimulatedTag, Stat, Textarea } from '@/components/ui';
import { pct } from '@/domain/economics';
import type { Metric } from '@/analytics/metrics';
import type { ServiceItem, Settings } from '@/domain/types';
import { updateItem, updateSettings } from '@/services/adminService';
import { useApp } from '@/store/AppStore';
import { Bars, DemoDataNote } from './AdminOps';

/* ═════════ Servicios ═════════ */
export function AdminServices() {
  const { db } = useApp();
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración de servicios" subtitle={`Tarifario, alcance y prueba de cierre. Regla del informe: ningún precio puede superar en más de ${Math.round(db.settings.priceCapOverReference * 100)} % la referencia alta de mercado.`} action={<SimulatedTag>Referencias de mercado: investigación de escritorio</SimulatedTag>} />
      {db.categories.filter((c) => c.status === 'activo').map((c) => (
        <section key={c.id}>
          <h2 className="mb-3 text-lg font-bold">{c.name}</h2>
          <div className="grid gap-3 lg:grid-cols-2">{db.items.filter((i) => i.categoryId === c.id).map((i) => <ItemEditor key={i.id} item={i} />)}</div>
        </section>
      ))}
      <section>
        <h2 className="text-lg font-bold">Escalera de confianza</h2>
        <p className="mb-3 text-sm text-ink-600">Avance hacia cada escalón con los datos actuales. Los umbrales son propuestas configurables en «Comisiones y reglas»; habilitar una categoría sigue siendo una decisión del equipo.</p>
        <TrustLadder detailed />
      </section>
    </div>
  );
}

function ItemEditor({ item }: { item: ServiceItem }) {
  const { run } = useApp();
  const [f, setF] = useState({ price: String(item.price), durationMin: String(item.durationMin), includes: item.includes.join('\n'), excludes: item.excludes.join('\n'), active: item.active });
  const { db } = useApp();
  const status = priceStatus(item, db.settings, Number(f.price) || 0);
  const cap = priceCap(item, db.settings);
  const dirty = f.price !== String(item.price) || f.durationMin !== String(item.durationMin) || f.includes !== item.includes.join('\n') || f.excludes !== item.excludes.join('\n') || f.active !== item.active;
  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold">{item.name}</p>
        <Badge tone={item.active ? 'mint' : 'muted'}>{item.active ? 'Activo' : 'Inactivo'}</Badge>
      </div>
      {item.marketRef && (
        <div className="rounded-xl bg-surface p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold">Mercado en Lima: S/ {item.marketRef.low}–{item.marketRef.high}</span>
            <Badge tone={status === 'sobre_tope' ? 'accent' : status === 'en_rango' ? 'mint' : 'warn'}>{PRICE_STATUS_LABEL[status]}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-ink-600">Tope permitido: S/ {cap?.toFixed(2)} · revisado el {item.marketRef.checkedAt}{item.marketRef.limited ? ' · referencia limitada (pocas fuentes)' : ''}</p>
          <ul className="mt-2 space-y-1 text-xs text-ink-700">
            {item.marketRef.sources.map((src) => (
              <li key={src.name} className="flex gap-1">
                <span>•</span>
                <span>
                  {src.url ? <a href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 font-medium text-turq-700 hover:underline">{src.name}<ExternalLink className="h-3 w-3" /></a> : src.name}: {src.price}
                  {src.note && <span className="text-ink-600"> ({src.note})</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {item.trustRationale && <p className="text-xs text-ink-600"><span className="font-semibold text-ink-700">Por qué genera confianza:</span> {item.trustRationale}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Precio (S/)"><Input type="number" min={1} step="0.5" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
        <Field label="Duración (min)"><Input type="number" min={15} step="5" value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} /></Field>
      </div>
      <Field label="Incluye (uno por línea)"><Textarea value={f.includes} onChange={(e) => setF({ ...f, includes: e.target.value })} className="min-h-[80px] text-sm" /></Field>
      <Field label="No incluye (uno por línea)"><Textarea value={f.excludes} onChange={(e) => setF({ ...f, excludes: e.target.value })} className="min-h-[70px] text-sm" /></Field>
      <p className="text-xs text-ink-600">Prueba de cierre: {item.closingTest.test}</p>
      <Checkbox checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Servicio activo (contratable)" />
      <Button
        size="sm"
        disabled={!dirty}
        onClick={() =>
          run(
            (d, a) =>
              updateItem(d, a, item.id, {
                price: Number(f.price),
                durationMin: Number(f.durationMin),
                includes: f.includes.split('\n').map((s) => s.trim()).filter(Boolean),
                excludes: f.excludes.split('\n').map((s) => s.trim()).filter(Boolean),
                active: f.active,
              }),
            'Servicio actualizado. Aplica a nuevas propuestas.',
          )
        }
      >Guardar</Button>
    </Card>
  );
}

/* ═════════ Comisiones y reglas ═════════ */
export function AdminSettings() {
  const { db, run } = useApp();
  const s = db.settings;
  const [f, setF] = useState(() => ({
    commissionFirst: String(s.commissionFirst * 100),
    commissionRepeat: String(s.commissionRepeat * 100),
    aiConfidenceThreshold: String(s.aiConfidenceThreshold),
    maxCandidates: String(s.maxCandidates),
    newMakiSlot: s.newMakiSlot,
    priceCap: String(Math.round(s.priceCapOverReference * 100)),
    steps: Object.fromEntries(Object.entries(s.ladder.minCompletedByStep).map(([k, v]) => [k, String(v)])) as Record<'2' | '3' | '4' | '5', string>,
    w: Object.fromEntries(Object.entries(s.matchingWeights).map(([k, v]) => [k, String(v)])) as Record<keyof Settings['matchingWeights'], string>,
    c: Object.fromEntries(Object.entries(s.costs).map(([k, v]) => [k, String(v)])) as Record<keyof Settings['costs'], string>,
  }));
  const [lo, hi] = s.commissionReferenceRange;
  const outOfRange = [Number(f.commissionFirst) / 100, Number(f.commissionRepeat) / 100].some((x) => x < lo || x > hi);
  const example = 100;
  const save = () =>
    run(
      (d, a) =>
        updateSettings(d, a, {
          commissionFirst: Number(f.commissionFirst) / 100,
          commissionRepeat: Number(f.commissionRepeat) / 100,
          aiConfidenceThreshold: Number(f.aiConfidenceThreshold),
          maxCandidates: Number(f.maxCandidates),
          newMakiSlot: f.newMakiSlot,
          priceCapOverReference: Number(f.priceCap) / 100,
          ladder: { ...s.ladder, minCompletedByStep: { 2: Number(f.steps['2']), 3: Number(f.steps['3']), 4: Number(f.steps['4']), 5: Number(f.steps['5']) } },
          matchingWeights: Object.fromEntries(Object.entries(f.w).map(([k, v]) => [k, Number(v)])) as unknown as Settings['matchingWeights'],
          costs: Object.fromEntries(Object.entries(f.c).map(([k, v]) => [k, Number(v)])) as unknown as Settings['costs'],
        }),
      'Configuración guardada. Aplica a nuevos pagos y recomendaciones.',
    );
  const W_LABEL: Record<string, string> = { quality: 'Calidad y cumplimiento', rating: 'Evaluaciones', experience: 'Experiencia', tradeTest: 'Prueba de oficio', affinity: 'Bonus Mi Maki' };
  const C_LABEL: Record<string, string> = { warrantyProvisionRate: 'Provisión de garantía (fracción)', paymentFeeRate: 'Costo medios de pago (fracción)', acquisitionCostFirst: 'Adquisición por cliente nuevo (S/)', evaluatorCostPerQuote: 'Evaluador por presupuesto (S/)', coordinationHours: 'Coordinación (h/servicio)', coordinationHourCost: 'Costo hora coordinación (S/)', monthlyFixedCosts: 'Costos fijos mensuales (S/)' };
  return (
    <div className="space-y-6">
      <PageHeader title="Comisiones y reglas" subtitle="Variables de negocio no validadas: configurables, no definitivas." action={<Button onClick={save}>Guardar cambios</Button>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Comisión" subtitle={`Rango de referencia del modelo: ${pct(lo)}–${pct(hi)}`} />
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primer servicio con un cliente (%)"><Input type="number" min={0} max={50} step="0.5" value={f.commissionFirst} onChange={(e) => setF({ ...f, commissionFirst: e.target.value })} /></Field>
              <Field label="Repetición con Mi Maki (%)"><Input type="number" min={0} max={50} step="0.5" value={f.commissionRepeat} onChange={(e) => setF({ ...f, commissionRepeat: e.target.value })} /></Field>
            </div>
            {outOfRange && <Notice tone="warn" icon={<AlertTriangle className="h-4 w-4" />}>Fuera del rango de referencia 20–25 %. El informe advierte que bajo 20 % el margen no sostiene verificación y garantía, y sobre 25 % se arriesga la aceptación de los Makis (H4).</Notice>}
            <div className="rounded-xl bg-surface p-4 text-sm">
              <p className="font-semibold">Ejemplo con un servicio de <Money value={example} /></p>
              <p className="mt-1 text-ink-700">Primer servicio: MakiYa <Money value={example * Number(f.commissionFirst) / 100} /> · Maki <Money value={example - example * Number(f.commissionFirst) / 100} /></p>
              <p className="text-ink-700">Con Mi Maki: MakiYa <Money value={example * Number(f.commissionRepeat) / 100} /> · Maki <Money value={example - example * Number(f.commissionRepeat) / 100} /></p>
            </div>
            <p className="text-xs text-ink-600">Por defecto: esquema 25 % / 20 % propuesto en el informe (cap. 6.3). Los cambios aplican a pagos futuros; los registrados no se modifican.</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Motor de asignación y asistente" />
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(f.w).map((k) => (
                <Field key={k} label={W_LABEL[k]}><Input type="number" min={0} max={1} step="0.05" value={f.w[k as keyof typeof f.w]} onChange={(e) => setF({ ...f, w: { ...f.w, [k]: e.target.value } })} /></Field>
              ))}
              <Field label="Makis a mostrar (1–3)"><Input type="number" min={1} max={3} value={f.maxCandidates} onChange={(e) => setF({ ...f, maxCandidates: e.target.value })} /></Field>
            </div>
            <Checkbox checked={f.newMakiSlot} onChange={(v) => setF({ ...f, newMakiSlot: v })} label="Reservar un cupo para Makis nuevos" description="Evita que solo los Makis con historial reciban oportunidades." />
            <Field label="Umbral de confianza del asistente (0–1)" hint="Por debajo, la solicitud pasa a revisión humana."><Input type="number" min={0.1} max={0.95} step="0.05" value={f.aiConfidenceThreshold} onChange={(e) => setF({ ...f, aiConfidenceThreshold: e.target.value })} className="max-w-[140px]" /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Precios" subtitle="Regla del informe: tope sobre la referencia de mercado" />
          <div className="space-y-3 p-5">
            <Field label="Tope sobre la referencia alta de mercado (%)" hint="El informe propone +10 %. Admin › Servicios bloquea precios por encima."><Input type="number" min={0} max={50} value={f.priceCap} onChange={(e) => setF({ ...f, priceCap: e.target.value })} className="max-w-[140px]" /></Field>
          </div>
        </Card>
        <Card>
          <CardHeader title="Escalera de confianza" subtitle="Servicios completados sin retrabajo para habilitar cada escalón (propuesta)" />
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
            {(['2', '3', '4', '5'] as const).map((k) => (
              <Field key={k} label={`Escalón ${k}`}><Input type="number" min={1} value={f.steps[k]} onChange={(e) => setF({ ...f, steps: { ...f.steps, [k]: e.target.value } })} /></Field>
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Supuestos económicos" subtitle="Del escenario base del informe (Tabla 28). Se usan para el margen de contribución y el punto de equilibrio." action={<SimulatedTag>Supuestos</SimulatedTag>} />
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
            {Object.keys(f.c).map((k) => (
              <Field key={k} label={C_LABEL[k]}><Input type="number" min={0} step="0.01" value={f.c[k as keyof typeof f.c]} onChange={(e) => setF({ ...f, c: { ...f.c, [k]: e.target.value } })} /></Field>
            ))}
          </div>
        </Card>
        <Card className="p-5 text-sm lg:col-span-2">
          <p className="font-bold">Reglas fijas del MVP (Cero Sorpresas)</p>
          <ul className="mt-2 grid gap-1.5 text-ink-700 sm:grid-cols-2">
            <li>• Anticipación mínima: {s.minLeadHours} h (solo trabajos programados)</li>
            <li>• Garantía: {s.warrantyDays} días sobre mano de obra</li>
            <li>• Prueba de oficio mínima: {s.tradeTestMin}/20</li>
            <li>• Ningún adicional se cobra sin aprobación del cliente</li>
            <li>• El pago se registra solo tras la conformidad</li>
            <li>• Sin gas, sin tablero eléctrico, sin emergencias</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ═════════ Analítica ═════════ */
const fmt = (m: Metric, kind: 'pct' | 'num' | 'money' | 'h' | 'min' | 'score' = 'num') => {
  if (m.value === null || m.value === undefined) return '—';
  switch (kind) {
    case 'pct': return pct(m.value);
    case 'money': return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(m.value);
    case 'h': return `${m.value.toFixed(1)} h`;
    case 'min': return `${m.value.toFixed(1)} min`;
    case 'score': return m.value.toFixed(2);
    default: return String(Math.round(m.value * 100) / 100);
  }
};

export function AdminAnalytics() {
  const { db } = useApp();
  const ns = northStar(db);
  const cm = clientMetrics(db);
  const mm = makiMetrics(db);
  const bm = businessMetrics(db);
  const row = (label: string, m: Metric, kind: Parameters<typeof fmt>[1]) => <Stat key={label} label={label} value={fmt(m, kind)} hint={[m.fraction, m.target && `meta ${m.target}`].filter(Boolean).join(' · ') || undefined} />;
  return (
    <div className="space-y-8">
      <PageHeader title="Analítica" subtitle="Métricas del informe (cap. 11). Se recalculan con cada operación." action={<DemoDataNote />} />
      <Notice tone="warn" icon={<AlertTriangle className="h-4 w-4" />} title="Lectura responsable">
        Estas cifras provienen de datos ficticios y de la interacción en el prototipo. No validan hipótesis: H1–H5 solo se pondrán a prueba con el experimento de 5 semanas descrito en el informe.
      </Notice>
      <section>
        <h2 className="mb-3 text-lg font-bold">North Star</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Completados sin retrabajo" value={ns.total} tone="petrol" hint={`${ns.matured} ya superaron 30 días`} />
          <Stat label="Tasa sin retrabajo" value={ns.rate !== null ? pct(ns.rate) : '—'} hint="meta ≥ 90 %" />
          <Stat label="Margen promedio" value={fmt(bm.avgContributionMargin, 'money')} hint="meta > S/ 0 (H5)" />
          <Stat label="Punto de equilibrio" value={bm.breakEven.value ? `${bm.breakEven.value} serv./mes` : '—'} hint="Costos fijos ÷ margen (supuestos)" />
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Experiencia del cliente</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {row('Tiempo de solicitud', cm.requestTimeMin, 'min')}
          {row('Abandono del formulario', cm.abandonment, 'pct')}
          {row('Tiempo hasta propuesta', cm.timeToProposalH, 'h')}
          {row('Requieren aclaraciones', cm.clarificationRate, 'pct')}
          {row('Satisfacción (calidad)', cm.satisfaction, 'score')}
          {row('Seguridad percibida', cm.safety, 'score')}
          {row('Precio justo', cm.fairPrice, 'score')}
          {row('Facilidad de uso', cm.ease, 'score')}
          {row('NPS', cm.nps, 'num')}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Makis</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {row('Tasa de aceptación', mm.acceptanceRate, 'pct')}
          {row('Tasa de finalización', mm.completionRate, 'pct')}
          {row('Ingreso neto total', mm.netIncome, 'money')}
          {row('Días hasta el pago', mm.daysToPayment, 'score')}
          {row('Incidencias', mm.incidents, 'num')}
          {row('Retención de Makis', mm.retention, 'pct')}
          {row('Satisfacción con Makis', mm.satisfaction, 'score')}
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Negocio</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {row('Conversión solicitud → reserva', bm.conversion, 'pct')}
          {row('Ticket promedio', bm.avgTicket, 'money')}
          {row('Ingresos (comisiones)', bm.revenue, 'money')}
          {row('Margen de contribución total', bm.contributionMargin, 'money')}
          {row('Coste de adquisición', bm.cac, 'money')}
          {row('Retención de clientes', bm.clientRetention, 'pct')}
          {row('Aprobación de presupuestos', bm.quoteApproval, 'pct')}
          {row('Cobros sin aprobación', bm.unauthorizedCharges, 'num')}
        </div>
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-4 font-bold">Embudo</p>
          <Bars data={bm.funnel} />
        </Card>
        <Card className="overflow-x-auto">
          <CardHeader title="Rentabilidad por categoría" />
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs font-semibold text-ink-600"><tr><th className="px-5 py-2.5">Categoría</th><th className="px-3 text-right">Servicios</th><th className="px-3 text-right">Ingresos</th><th className="px-5 text-right">Margen</th></tr></thead>
            <tbody className="divide-y divide-line">
              {bm.byCategory.map((c) => (
                <tr key={c.categoryId}><td className="px-5 py-2.5 font-medium">{c.name}</td><td className="px-3 text-right">{c.services}</td><td className="px-3 text-right"><Money value={c.revenue} /></td><td className={`px-5 text-right font-semibold ${c.margin < 0 ? 'text-accent-700' : 'text-petrol-700'}`}><Money value={c.margin} /></td></tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
