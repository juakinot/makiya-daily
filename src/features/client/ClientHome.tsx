import { Link } from 'react-router-dom';
import { ArrowRight, BellRing, MessageSquareText, ShieldCheck } from 'lucide-react';
import { MakiCard, RequestRow } from '@/components/domain';
import { Button, EmptyState, Notice, PageHeader } from '@/components/ui';
import { ACTIVE_STATUSES } from '@/domain/stateMachine';
import { formatDate } from '@/lib/utils';
import { useActor, useApp } from '@/store/AppStore';

export default function ClientHome() {
  const { db } = useApp();
  const me = useActor();
  const mine = db.requests.filter((r) => r.clientId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const needsAction = mine.filter((r) => r.status === 'propuesta_lista' || r.status === 'evidencia_enviada' || (r.status === 'en_curso' && r.extras.some((e) => e.status === 'propuesto')));
  const active = mine.filter((r) => ACTIVE_STATUSES.includes(r.status) && !needsAction.includes(r));
  const home = db.homeProfiles.find((h) => h.clientId === me.id);
  const warranty = mine.filter((r) => r.status === 'completada' && r.warrantyUntil && new Date(r.warrantyUntil) > new Date());
  const actionLabel = (s: string, hasExtra: boolean) =>
    hasExtra ? 'Tu Maki propone un adicional: decide si lo apruebas' : s === 'propuesta_lista' ? 'Revisa la propuesta y elige a tu Maki' : 'Revisa la evidencia y firma tu conformidad';

  return (
    <div className="space-y-8">
      <PageHeader title={`Hola, ${me.name.split(' ')[0]}`} subtitle="¿Qué necesitas resolver en tu hogar?" />

      <Link to="/app/pedir" className="block">
        <div className="flex items-center gap-4 rounded-2xl bg-petrol-700 p-5 text-white shadow-card transition hover:bg-petrol-800">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15"><MessageSquareText className="h-6 w-6" /></span>
          <div className="flex-1">
            <p className="text-lg font-bold text-white">Cuéntanos qué necesitas</p>
            <p className="text-sm text-mint-100">Escríbelo con tus palabras. Te respondemos con alcance y precio.</p>
          </div>
          <ArrowRight className="h-5 w-5" />
        </div>
      </Link>

      {needsAction.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><BellRing className="h-5 w-5 text-accent-700" />Requiere tu acción</h2>
          <div className="space-y-2">
            {needsAction.map((r) => (
              <div key={r.id}>
                <p className="mb-1 text-sm font-medium text-accent-700">{actionLabel(r.status, r.extras.some((e) => e.status === 'propuesto'))}</p>
                <RequestRow db={db} req={r} to={`/app/solicitudes/${r.id}`} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Servicios en curso</h2>
        {active.length ? (
          <div className="space-y-2">{active.map((r) => <RequestRow key={r.id} db={db} req={r} to={`/app/solicitudes/${r.id}`} />)}</div>
        ) : (
          <EmptyState title="No tienes servicios en curso" description="Cuando pidas ayuda, aquí verás el avance paso a paso." action={<Link to="/app/pedir"><Button size="sm">Pedir ayuda</Button></Link>} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold">Mi Maki</h2>
          {home?.favoriteMakiIds.length ? (
            <div className="space-y-2">
              {home.favoriteMakiIds.map((id) => (
                <div key={id} className="space-y-2">
                  <MakiCard db={db} makiId={id} />
                  <Link to={`/app/pedir?maki=${id}`} className="inline-block"><Button size="sm" variant="secondary">Pedir de nuevo con este Maki</Button></Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aún no tienes un Maki de confianza" description="Después de un servicio podrás guardarlo como Mi Maki. Con él, la comisión de referencia es menor y el Maki gana más." />
          )}
        </section>
        <section>
          <h2 className="mb-3 text-lg font-bold">Garantías vigentes</h2>
          {warranty.length ? (
            <div className="space-y-2">
              {warranty.map((r) => (
                <Link key={r.id} to={`/app/solicitudes/${r.id}`}>
                  <Notice icon={<ShieldCheck className="h-4 w-4" />} title={r.lines.map((l) => l.description).join(' + ')} className="mb-2 transition hover:border-turq-500">
                    Garantía de mano de obra hasta el {formatDate(r.warrantyUntil!, { day: 'numeric', month: 'long' })}.
                  </Notice>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin garantías vigentes" description="Cada servicio completado tiene 30 días de garantía sobre la mano de obra." />
          )}
        </section>
      </div>
    </div>
  );
}
