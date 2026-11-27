import { Link } from 'react-router-dom';
import { ArrowRight, Check, KeyRound, MessageSquareText, Package, Star, Wallet, X } from 'lucide-react';
import { CeroSorpresasSeal, Isotipo, SubBrand } from '@/brand/Brand';
import { MECHANISMS } from '@/components/domain';
import { TrustLadder } from '@/components/TrustLadder';
import { Button, Card, Money } from '@/components/ui';
import { PACKS } from '@/config/catalog';
import { useApp } from '@/store/AppStore';

/** Forma fluida de fondo (manual: «curvas y formas fluidas que transmiten cercanía y ayuda»). */
function FluidShape({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 400" fill="none" aria-hidden>
      <path d="M0 260C90 170 210 120 330 150c120 30 180 120 270 90V400H0z" fill="#D9F1EB" />
      <path d="M0 320c110-60 230-80 340-40 110 40 170 70 260 30v90H0z" fill="#EEF8F5" />
    </svg>
  );
}

export default function Landing() {
  const { db } = useApp();
  const active = db.categories.filter((c) => c.status === 'activo');
  const priceOf = (id: string) => db.items.find((i) => i.id === id)?.price ?? 0;
  return (
    <>
      {/* HERO — fondo claro con formas fluidas, como el Brand Kit */}
      <section className="relative overflow-hidden bg-white">
        <FluidShape className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full" />
        <div className="container-app relative grid gap-10 pb-16 pt-12 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-20">
          <div>
            <SubBrand line="Arreglos" />
            <h1 className="mt-6 text-[40px] font-extrabold leading-[1.05] tracking-tight text-petrol-700 sm:text-[52px]">
              Una mano <br className="hidden sm:block" />
              para tu <span className="relative whitespace-nowrap">día<svg className="absolute -bottom-2 left-0 h-3 w-full" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden><path d="M2 8c30-6 66-6 96-2" stroke="#F0785A" strokeWidth="4" strokeLinecap="round" fill="none" /></svg></span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-ink-700">
              ¿Te mudaste o estás equipando tu depa? Arma tus muebles e instala lo que necesitas con un <strong className="text-petrol-700">Maki verificado</strong>, precio claro antes de confirmar y pago solo cuando todo quedó bien.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/registro"><Button size="lg" icon={<MessageSquareText className="h-5 w-5" />}>Cuéntanos qué necesitas</Button></Link>
              <a href="#como-funciona"><Button size="lg" variant="secondary">Cómo funciona</Button></a>
            </div>
            <p className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-ink-700">
              {['Sabes quién llega', 'Sabes cuánto cuesta', 'Compruebas que quedó bien'].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-turq-600" />{t}</span>
              ))}
            </p>
          </div>
          <div className="md:pl-6">
            <Card className="relative mx-auto max-w-sm p-5 shadow-pop">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink-400">Ejemplo de propuesta</span>
                <CeroSorpresasSeal className="scale-75 origin-right" />
              </div>
              <p className="mt-2 font-display text-lg font-bold">Armado de ropero (hasta 3 puertas)</p>
              <ul className="mt-2 space-y-1 text-sm text-ink-700">
                <li className="flex gap-2"><Check className="h-4 w-4 text-turq-600" />Puertas reguladas y anclaje antivuelco</li>
                <li className="flex gap-2"><X className="h-4 w-4 text-ink-400" />No incluye cortes ni roperos a medida</li>
              </ul>
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-surface p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-100 font-display font-bold text-petrol-700">RQ</span>
                <div className="flex-1 text-sm">
                  <p className="font-semibold">Rosa · Maki verificado</p>
                  <p className="flex items-center gap-1 text-ink-600"><Star className="h-3.5 w-3.5 fill-turq-500 text-turq-500" />4,9 · prueba de oficio 18/20</p>
                </div>
              </div>
              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-center gap-1.5 text-sm text-ink-600"><KeyRound className="h-4 w-4 text-turq-600" />Código: <span className="font-mono font-bold text-ink-900">4827</span></div>
                <Money value={priceOf('armado-ropero')} className="font-display text-2xl font-extrabold text-petrol-700" />
              </div>
              <p className="mt-2 text-[11px] text-ink-400">Dentro del rango de mercado en Lima. Pagas después de la prueba de cierre.</p>
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
            { t: 'Elige a tu Maki', d: 'Revisa perfiles, reseñas y trabajos anteriores. Te recomendamos, tú decides.' },
            { t: 'Comprueba y paga', d: 'Ves la prueba de cierre, firmas tu conformidad y recién ahí pagas.' },
          ].map((s, i) => (
            <li key={s.t} className="rounded-2xl border border-line p-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mint-100 font-display font-extrabold text-petrol-700">{i + 1}</span>
              <p className="mt-4 font-display font-bold">{s.t}</p>
              <p className="mt-1 text-sm text-ink-600">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CERO SORPRESAS */}
      <section id="cero-sorpresas" className="scroll-mt-20 bg-surface py-16">
        <div className="container-app">
          <CeroSorpresasSeal />
          <h2 className="mt-4 max-w-2xl text-3xl font-extrabold tracking-tight">No es un directorio de técnicos. Es un sistema que responde tres preguntas.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {MECHANISMS.map((m) => (
              <Card key={m.title} className="p-6">
                <m.icon className="h-7 w-7 text-turq-600" strokeWidth={1.75} />
                <p className="mt-4 text-sm font-semibold text-accent-700">{m.q}</p>
                <p className="mt-1 font-display text-lg font-bold">{m.title}</p>
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
        <SubBrand line="Arreglos" />
        <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Empezamos por lo que necesitas al mudarte.</h2>
        <p className="mt-2 max-w-2xl text-ink-600">Servicios de bajo riesgo, con precio cerrado dentro del rango de mercado en Lima y una prueba de cierre que tú mismo puedes comprobar.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {active.map((c) => (
            <Card key={c.id} className="p-6">
              <p className="font-display text-lg font-bold">{c.name}</p>
              <p className="text-sm text-ink-600">{c.description}</p>
              <ul className="mt-4 divide-y divide-line">
                {db.items.filter((i) => i.categoryId === c.id && i.active).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span>{i.name}</span>
                    <span className="whitespace-nowrap font-semibold text-petrol-700"><Money value={i.price} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <p className="flex items-center gap-2 font-display font-bold"><Package className="h-5 w-5 text-turq-600" />Paquetes para tu nuevo depa</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {PACKS.map((p) => (
              <div key={p.id} className="rounded-2xl border border-line p-4">
                <p className="font-display font-bold">{p.name}</p>
                <p className="mt-1 text-sm text-ink-600">{p.description}</p>
                <p className="mt-2 font-display font-extrabold text-petrol-700"><Money value={p.lines.reduce((a, l) => a + l.qty * priceOf(l.itemId), 0)} /></p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ESCALERA DE CONFIANZA */}
      <section id="escalera" className="scroll-mt-20 border-t border-line bg-surface py-16">
        <div className="container-app grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SubBrand line="Daily" />
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight">Crecemos al ritmo de tu confianza.</h2>
            <p className="mt-3 text-ink-600">Hoy empezamos con arreglos sencillos que tú mismo puedes comprobar. Los servicios que exigen más confianza, como reparar tu laptop, se habilitan solo cuando cumplimos metas medibles de calidad, seguridad y precio justo.</p>
          </div>
          <TrustLadder />
        </div>
      </section>

      {/* MAKIS */}
      <section id="makis" className="scroll-mt-20 py-16">
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
            <p className="mt-2 font-display text-lg font-bold">Armado de cama · San Miguel · sáb 8–11 h</p>
            {(() => {
              const p = priceOf('armado-cama');
              const c = Math.round(p * db.settings.commissionFirst * 100) / 100;
              return (
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-ink-600">Precio del servicio</dt><dd><Money value={p} /></dd></div>
                  <div className="flex justify-between"><dt className="text-ink-600">Comisión de referencia ({Math.round(db.settings.commissionFirst * 100)} %)</dt><dd>− <Money value={c} /></dd></div>
                  <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><dt>Tú recibes</dt><dd className="text-petrol-700"><Money value={p - c} /></dd></div>
                </dl>
              );
            })()}
            <p className="mt-3 text-xs text-ink-600">Con clientes que te repiten (Mi Maki) la comisión de referencia baja a {Math.round(db.settings.commissionRepeat * 100)} %. Valores configurables, no definitivos.</p>
          </Card>
        </div>
      </section>

      {/* CTA — bloque de marca del Brand Kit */}
      <section className="container-app pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-petrol-700 px-6 py-12 text-center sm:px-12">
          <Isotipo className="mx-auto h-12" />
          <h2 className="mx-auto mt-5 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-white">
            Sabes quién llega, cuánto cuesta y que{' '}
            <span className="relative whitespace-nowrap">quedó bien.<svg className="absolute -bottom-2 left-0 h-3 w-full" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden><path d="M2 8c30-6 66-6 96-2" stroke="#F0785A" strokeWidth="4" strokeLinecap="round" fill="none" /></svg></span>
          </h2>
          <Link to="/registro" className="mt-8 inline-block"><Button size="lg" className="bg-white !text-petrol-700 hover:bg-mint-50" icon={<ArrowRight className="h-5 w-5" />}>Pedir ayuda ahora</Button></Link>
        </div>
      </section>
    </>
  );
}
