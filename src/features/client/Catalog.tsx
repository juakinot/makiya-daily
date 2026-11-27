import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, X } from 'lucide-react';
import { Badge, Button, Card, Money, PageHeader, SimulatedTag, Tabs } from '@/components/ui';
import { useApp } from '@/store/AppStore';

export default function Catalog() {
  const { db } = useApp();
  const active = db.categories.filter((c) => c.status === 'activo');
  const [tab, setTab] = useState(active[0]?.id ?? '');
  const items = db.items.filter((i) => i.categoryId === tab && i.active);
  const future = db.categories.filter((c) => c.status === 'futuro');
  return (
    <div>
      <PageHeader title="Servicios" subtitle="Precio cerrado, alcance claro y prueba de cierre en cada servicio." action={<SimulatedTag>Precios de demostración</SimulatedTag>} />
      <Tabs tabs={active.map((c) => ({ value: c.id, label: c.name }))} value={tab} onChange={setTab} />
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <Card key={it.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{it.name}</p>
                <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-ink-600"><Clock className="h-3.5 w-3.5" />aprox. {it.durationMin} min · por {it.unit}</p>
              </div>
              <Money value={it.price} className="text-xl font-extrabold text-petrol-700" />
            </div>
            <ul className="mt-4 space-y-1.5 text-sm">
              {it.includes.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-turq-600" />{t}</li>)}
              {it.excludes.map((t) => <li key={t} className="flex gap-2 text-ink-600"><X className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />No incluye: {t.charAt(0).toLowerCase() + t.slice(1)}</li>)}
            </ul>
            <p className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-ink-700"><span className="font-semibold">Prueba de cierre:</span> {it.closingTest.criterion}</p>
            <div className="mt-auto pt-4">
              <Link to={`/app/pedir?item=${it.id}`}><Button variant="secondary" block>Pedir este servicio</Button></Link>
            </div>
          </Card>
        ))}
      </div>
      <section className="mt-10">
        <h2 className="text-lg font-bold">Próximamente</h2>
        <p className="text-sm text-ink-600">Aún no se pueden contratar. Si lo necesitas, cuéntanoslo en «Pedir» y registraremos tu interés.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {future.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-dashed border-line bg-white px-4 py-3">
              <span className="text-sm font-medium text-ink-700">{c.name}</span>
              <Badge tone="muted">Próximamente</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
