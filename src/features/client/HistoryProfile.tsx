import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Home, RotateCcw } from 'lucide-react';
import { MakiCard, RequestRow } from '@/components/domain';
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, PageHeader, Select, Tabs, Textarea } from '@/components/ui';
import { DISTRICTS } from '@/config/catalog';
import type { HomeType } from '@/domain/types';
import { formatDate } from '@/lib/utils';
import { updateHomeProfile } from '@/services/accountService';
import { toggleFavoriteMaki } from '@/services/requestService';
import { useActor, useApp } from '@/store/AppStore';

export function History() {
  const { db } = useApp();
  const me = useActor();
  const [tab, setTab] = useState<'todos' | 'completada' | 'cancelada'>('todos');
  const mine = db.requests
    .filter((r) => r.clientId === me.id && (tab === 'todos' ? true : r.status === tab))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (s: string) => db.requests.filter((r) => r.clientId === me.id && r.status === s).length;
  return (
    <div>
      <PageHeader title="Historial" subtitle="Todos tus servicios, con su evidencia, pago y garantía." />
      <Tabs
        tabs={[
          { value: 'todos', label: 'Todos' },
          { value: 'completada', label: 'Completados', count: count('completada') },
          { value: 'cancelada', label: 'Cancelados' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {mine.length ? (
        <div className="space-y-2">
          {mine.map((r) => (
            <div key={r.id} className="space-y-1">
              <RequestRow db={db} req={r} to={`/app/solicitudes/${r.id}`} />
              {r.status === 'completada' && r.assignedMakiId && (
                <Link to={`/app/pedir?maki=${r.assignedMakiId}`} className="inline-flex items-center gap-1 pl-2 text-sm font-semibold text-petrol-700 hover:underline">
                  <RotateCcw className="h-3.5 w-3.5" /> Repetir con {db.users.find((u) => u.id === r.assignedMakiId)?.name.split(' ')[0]}
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="Aún no hay servicios aquí" action={<Link to="/app/pedir"><Button size="sm">Pedir ayuda</Button></Link>} />
      )}
    </div>
  );
}

export function ClientProfile() {
  const { db, run } = useApp();
  const me = useActor();
  const home = db.homeProfiles.find((h) => h.clientId === me.id)!;
  const [f, setF] = useState({ district: home.district, addressRef: home.addressRef, homeType: home.homeType, floor: home.floor ?? '', notes: home.notes });
  const pastMakis = [...new Set(db.requests.filter((r) => r.clientId === me.id && r.status === 'completada' && r.assignedMakiId).map((r) => r.assignedMakiId!))];
  const interests = db.interests.filter((i) => i.clientId === me.id);
  const history = db.requests.filter((r) => r.clientId === me.id && r.status === 'completada');
  return (
    <div>
      <PageHeader title="Mi hogar" subtitle="Tu Perfil del Hogar ayuda al Maki a llegar preparado." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<Home className="h-5 w-5" />} title="Perfil del Hogar" subtitle="Solo lo ve el Maki que acepta tu trabajo." />
          <form
            className="space-y-4 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              run((d, a) => updateHomeProfile(d, a, f), 'Perfil del Hogar actualizado.');
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Distrito">
                <Select value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })}>{DISTRICTS.map((d) => <option key={d}>{d}</option>)}</Select>
              </Field>
              <Field label="Tipo de vivienda">
                <Select value={f.homeType} onChange={(e) => setF({ ...f, homeType: e.target.value as HomeType })}>
                  <option value="departamento">Departamento</option>
                  <option value="casa">Casa</option>
                  <option value="habitacion">Habitación</option>
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <Field label="Referencia de dirección"><Input value={f.addressRef} onChange={(e) => setF({ ...f, addressRef: e.target.value })} /></Field>
              <Field label="Piso" optional><Input value={f.floor} onChange={(e) => setF({ ...f, floor: e.target.value })} /></Field>
            </div>
            <Field label="Notas para el Maki" optional hint="Ej.: tipo de paredes, ascensor, horarios del edificio."><Textarea value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="min-h-[80px]" /></Field>
            <Button type="submit">Guardar</Button>
          </form>
          {history.length > 0 && (
            <div className="border-t border-line px-5 py-4">
              <p className="mb-2 text-sm font-semibold text-ink-600">Memoria del hogar</p>
              <ul className="space-y-1 text-sm">
                {history.map((r) => <li key={r.id} className="flex justify-between gap-2"><span>{r.lines.map((l) => l.description).join(' + ')}</span><span className="text-ink-400">{formatDate(r.conformity!.signedAt)}</span></li>)}
              </ul>
            </div>
          )}
        </Card>
        <div className="space-y-6">
          <section>
            <h2 className="mb-1 text-lg font-bold">Mi Maki</h2>
            <p className="mb-3 text-sm text-ink-600">Makis que ya trabajaron en tu hogar. Marca tus favoritos para verlos primero.</p>
            {pastMakis.length ? (
              <div className="space-y-2">
                {pastMakis.map((id) => {
                  const fav = home.favoriteMakiIds.includes(id);
                  return (
                    <div key={id} className="space-y-2">
                      <MakiCard db={db} makiId={id} />
                      <Button size="sm" variant={fav ? 'soft' : 'secondary'} icon={<Heart className={`h-4 w-4 ${fav ? 'fill-accent-500 text-accent-500' : ''}`} />} onClick={() => run((d, a) => toggleFavoriteMaki(d, a, id))}>
                        {fav ? 'Es Mi Maki' : 'Guardar como Mi Maki'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Todavía no has completado servicios" />
            )}
          </section>
          <Card className="p-5 text-sm">
            <p className="font-bold">Cuenta</p>
            <p className="mt-1 text-ink-700">{me.name} · {me.email} · {me.phone}</p>
            <p className="mt-1 text-xs text-ink-400">Consentimiento de datos registrado el {me.dataConsentAt ? formatDate(me.dataConsentAt) : '—'} (Ley N.° 29733).</p>
          </Card>
          {interests.length > 0 && (
            <Card className="p-5 text-sm">
              <p className="font-bold">Te avisaremos cuando esté disponible</p>
              <ul className="mt-2 space-y-1">
                {interests.map((i) => <li key={i.id} className="flex items-center justify-between gap-2"><span>{i.description}</span><Badge tone="muted">{db.categories.find((c) => c.id === i.categoryId)?.name}</Badge></li>)}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
