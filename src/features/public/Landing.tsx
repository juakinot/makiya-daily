import { Link } from 'react-router-dom';
import { ArrowRight, CalendarHeart, Check, Circle, Droplets, Gamepad2, KeyRound, Laptop, LayoutGrid, MessageSquareText, RotateCcw, Ruler, Sofa, Sparkles, Star, Tv, Wallet, X, Zap, type LucideIcon } from 'lucide-react';
import { Isotipo } from '@/brand/Brand';
import { MECHANISMS } from '@/components/domain';
import { Badge, Button, Card, Money, SimulatedTag } from '@/components/ui';
import { useApp } from '@/store/AppStore';

const CAT_ICONS: Record<string, LucideIcon> = { Sofa, Ruler, Droplets, Zap, Laptop, Tv, Gamepad2, Sparkles, RotateCcw, LayoutGrid, CalendarHeart };

function CatIcon({ name, className }: { name: string; className?: string }) {
  const I = CAT_ICONS[name] ?? Circle;
  return <I className={className} strokeWidth={1.75} />;
}

export default function Landing() {
  const { db } = useApp();
  const active = db.categories.filter((c) => c.status === 'activo');
  const future = db.categories.filter((c) => c.status === 'futuro');
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-petrol-700 text-white">
        <div className="container-app relative grid gap-10 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-20">
          <div>
            <Badge tone="mint" className="border-transparent">MakiYa Daily · Lima</Badge>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Una mano <br className="hidden sm:block" />para tu día<span className="text-accent-500">.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-mint-100">
              ¿Te mudaste o estás equipando tu depa? Arma tus muebles e instala lo que necesitas con un <strong className="text-white">Maki probado</strong>, precio cerrado antes de confirmar y pago solo cuando todo quedó bien.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/registro"><Button size="lg" className="bg-white !text-petrol-700 hover:bg-mint-50" icon={<MessageSquareText className="h-5 w-5" />}>Cuéntanos qué necesitas</Button></Link>
              <a href="#como-funciona"><Button size="lg" variant="ghost" className="!text-white hover:!bg-white/10">Cómo funciona</Button></a>
            </div>
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-mint-100">
              {['Sabes quién llega', 'Sabes cuánto cuesta', 'Compruebas que quedó bien'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-turq-500" />{t}</span>
              ))}
            </p>
          </div>
          {/* Tarjeta ilustrativa */}
          <div className="md:pl-6">
            <Card className="mx-auto max-w-sm p-5 text-ink-900 shadow-pop">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-400">Ejemplo de propuesta</span>
                <Badge tone="mint">Precio cerrado</Badge>
              </div>
              <p className="mt-3 text-lg font-bold">Armado de ropero prefabricado</p>
              <ul className="mt-2 space-y-1 text-sm text-ink-700">
                <li className="flex gap-2"><Check className="h-4 w-4 text-turq-600" />Puertas reguladas y anclaje antivuelco</li>
                <li className="flex gap-2"><X className="h-4 w-4 text-ink-400" />No incluye cortes ni roperos a medida</li>
              </ul>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-100 font-bold text-petrol-700">RQ</span>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">Rosa · Maki Probado</p>
                  <p className="flex items-center gap-1 text-ink-600"><Star className="h-3.5 w-3.5 fill-turq-500 text-turq-500" />4,9 · prueba de oficio 18/20</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-center gap-1.5 text-sm text-ink-600"><KeyRound className="h-4 w-4 text-turq-600" />Código de visita: <span className="font-mono font-bold text-ink-900">4827</span></div>
                <Money value={95} className="text-2xl font-extrabold text-petrol-700" />
              </div>
              <p className="mt-2 text-[11px] text-ink-400">Precio de demostración. Pagas después de la prueba de cierre.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="container-app scroll-mt-20 py-16">
        <p className="text-sm font-bold uppercase tracking-wider text-turq-700">Cómo funciona</p>
        <h2 className="mt-2 max-w-xl text-3xl font-extrabold tracking-tight">Cuéntalo con tus palabras. Nosotros nos encargamos del resto.</h2>
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: 'Cuéntanos', d: 'Escribe qué necesitas y, si quieres, adjunta una foto. Sin términos técnicos.' },
            { t: 'Recibe la propuesta', d: 'Qué incluye, qué no incluye y cuánto cuesta. Antes de decidir nada.' },
            { t: 'Elige a tu Maki', d: 'Te mostramos de 1 a 3 Makis probados con las razones a la vista.' },
            { t: 'Comprueba y paga', d: 'Ves la prueba de cierre, firmas tu conformidad y recién ahí pagas.' },
          ].map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-line p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint-100 font-extrabold text-petrol-700">{i + 1}</span>
              <p className="mt-4 font-bold">{s.t}</p>
              <p className="mt-1 text-sm text-ink-600">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CERO SORPRESAS */}
      <section id="cero-sorpresas" className="scroll-mt-20 bg-surface py-16">
        <div className="container-app">
          <p className="text-sm font-bold uppercase tracking-wider text-turq-700">Sistema Cero Sorpresas</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight">No es un directorio de técnicos. Es un sistema que responde tres preguntas.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {MECHANISMS.map((m) => (
              <Card key={m.title} className="p-6">
                <m.icon className="h-7 w-7 text-turq-600" strokeWidth={1.75} />
                <p className="mt-4 text-sm font-semibold text-accent-700">{m.q}</p>
                <p className="mt-1 text-lg font-bold">{m.title}</p>
                <p className="mt-2 text-sm text-ink-600">{m.text}</p>
              </Card>
            ))}
          </div>
          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            {['Ningún adicional sin tu aprobación escrita', 'Materiales al costo, con boleta', 'Código de 4 dígitos en cada visita', 'Garantía de 30 días en mano de obra'].map((t) => (
              <p key={t} className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-medium"><Check className="h-4 w-4 shrink-0 text-turq-600" />{t}</p>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="container-app scroll-mt-20 py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-turq-700">Servicios disponibles</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Empezamos por lo que podemos hacer muy bien.</h2>
          </div>
          <SimulatedTag>Precios de demostración</SimulatedTag>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {active.map((c) => (
            <Card key={c.id} className="p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-mint-100 text-petrol-700"><CatIcon name={c.icon} className="h-5 w-5" /></span>
                <div>
                  <p className="text-lg font-bold">{c.name}</p>
                  <p className="text-sm text-ink-600">{c.description}</p>
                </div>
              </div>
              <ul className="mt-5 divide-y divide-line">
                {db.items.filter((i) => i.categoryId === c.id && i.active).map((i) => (
                  <li key={i.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span>{i.name}</span>
                    <span className="font-semibold text-petrol-700">desde <Money value={i.price} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="mt-10">
          <p className="font-bold">Próximamente en MakiYa Daily</p>
          <p className="text-sm text-ink-600">Crecemos paso a paso en nuestra escalera de confianza. Estas categorías aún no se pueden contratar.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {future.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-ink-300 px-3 py-1.5 text-sm text-ink-600">
                <CatIcon name={c.icon} className="h-4 w-4" />{c.name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* MAKIS */}
      <section id="makis" className="scroll-mt-20 border-t border-line bg-mint-50 py-16">
        <div className="container-app grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-turq-700">Para Makis</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Tu oficio, con reglas claras y pago asegurado.</h2>
            <ul className="mt-6 space-y-3">
              {[
                'Solicitudes con alcance, fecha y precio definidos: tú decides si aceptas.',
                'Ves tu ingreso neto antes de aceptar. Sin pagar por contactos.',
                'La evidencia de cierre te protege de reclamos injustos.',
                'Tu reputación es tuya, y la comisión baja cuando un cliente te repite.',
              ].map((t) => (
                <li key={t} className="flex gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-turq-600" />{t}</li>
              ))}
            </ul>
            <Link to="/registro?rol=maki" className="mt-8 inline-block"><Button size="lg" icon={<Wallet className="h-5 w-5" />}>Postular como Maki</Button></Link>
          </div>
          <Card className="p-6">
            <p className="text-sm font-semibold text-ink-600">Ejemplo de oferta para un Maki</p>
            <p className="mt-2 text-lg font-bold">Armado de cama · San Miguel · sáb 8–11 h</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-600">Precio del servicio</dt><dd><Money value={70} /></dd></div>
              <div className="flex justify-between"><dt className="text-ink-600">Comisión de referencia (25 %)</dt><dd>− <Money value={17.5} /></dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Tú recibes</dt><dd className="text-petrol-700"><Money value={52.5} /></dd></div>
            </dl>
            <p className="mt-3 text-xs text-ink-600">Con clientes que te repiten (Mi Maki) la comisión de referencia baja a 20 %. Valores configurables, no definitivos.</p>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container-app py-16 text-center">
        <Isotipo className="mx-auto h-14" />
        <h2 className="mx-auto mt-5 max-w-xl text-3xl font-extrabold tracking-tight">Siempre sabrás quién llega, cuánto cuesta y que quedó bien.</h2>
        <Link to="/registro" className="mt-7 inline-block"><Button size="lg" icon={<ArrowRight className="h-5 w-5" />}>Pedir ayuda ahora</Button></Link>
      </section>
    </>
  );
}
