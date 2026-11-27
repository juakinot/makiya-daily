import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Clock, Package, X } from 'lucide-react';
import { TrustLadder } from '@/components/TrustLadder';
import { Badge, Button, Card, Money, PageHeader, Tabs } from '@/components/ui';
import { PACKS } from '@/config/catalog';
import { useApp } from '@/store/AppStore';

export default function Catalog() {
  const { db } = useApp();
  const active = db.categories.filter((c) => c.status === 'activo');
  const [tab, setTab] = useState(active[0]?.id ?? '');
  const items = db.items.filter((i) => i.categoryId === tab && i.active);
  return (
    <div className="space-y-10">
      <div>
        <PageHeader title="Servicios" subtitle="Precio cerrado, alcance claro y prueba de cierre en cada servicio. Precios dentro del rango de mercado en Lima." />
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Package className="h-5 w-5 text-turq-600" />Paquetes para tu nuevo depa</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {PACKS.map((p) => {
              const total = p.lines.reduce((a, l) => a + l.qty * (db.items.find((i) => i.id === l.itemId)?.price ?? 0), 0);
              return (
                <Card key={p.id} className="flex flex-col p-5">
                  <p className="font-display text-lg font-bold">{p.name}</p>
                  <p className="mt-1 text-sm text-ink-600">{p.description}</p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {p.lines.map((l) => (
                      <li key={l.itemId} className="flex justify-between gap-2"><span>{l.qty > 1 ? `${l.qty} × ` : ''}{db.items.find((i) => i.id === l.itemId)?.name}</span></li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                    <div><p className="text-xs text-ink-600">Total cerrado</p><Money value={total} className="font-display text-xl font-extrabold text-petrol-700" /></div>
                    <Link to={`/app/pedir?pack=${p.id}`}><Button size="sm">Pedir paquete</Button></Link>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-ink-600">Los paquetes suman los precios del tarifario: sin cargos ocultos. Puedes quitar o agregar servicios antes de aprobar.</p>
        </section>
        <Tabs tabs={active.map((c) => ({ value: c.id, label: c.name }))} value={tab} onChange={setTab} />
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((it) => (
            <Card key={it.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold">{it.name}</p>
                  <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-ink-600"><Clock className="h-3.5 w-3.5" />aprox. {it.durationMin} min · por {it.unit}</p>
                </div>
                <Money value={it.price} className="font-display text-xl font-extrabold text-petrol-700" />
              </div>
              {it.marketRef && (
                <p className="mt-2"><Badge tone="mint">Mercado en Lima: S/ {it.marketRef.low}–{it.marketRef.high}</Badge></p>
              )}
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
      </div>
      <section>
        <h2 className="text-lg font-bold">Cómo crecemos: la escalera de confianza</h2>
        <p className="mb-4 text-sm text-ink-600">Empezamos por los arreglos que tú mismo puedes comprobar. Los servicios que exigen más confianza se habilitan solo cuando cumplimos metas medibles de calidad y seguridad.</p>
        <TrustLadder />
      </section>
    </div>
  );
}
