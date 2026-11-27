import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { HOME_BY_ROLE } from '@/auth/permissions';
import { Lockup } from '@/brand/Brand';
import { Button, Card, Checkbox, ChipGroup, Field, Input, Notice, Select, Textarea } from '@/components/ui';
import { DISTRICTS, WEEKDAY_LABEL } from '@/config/catalog';
import { DomainError } from '@/domain/stateMachine';
import type { Availability, TimeWindow, Weekday } from '@/domain/types';
import { DEMO_PASSWORD } from '@/persistence/seed';
import { validateRegister } from '@/services/accountService';
import { useApp } from '@/store/AppStore';

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="container-app flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <Lockup size="lg" withSlogan className="justify-center" />
          <h1 className="mt-6 text-2xl font-extrabold">{title}</h1>
          <p className="mt-1 text-ink-600">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const { login, loginAs } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const u = await login(email, password);
      const next = params.get('next');
      nav(next && next.startsWith(HOME_BY_ROLE[u.role]) ? next : HOME_BY_ROLE[u.role]);
    } catch (err) {
      setError(err instanceof DomainError ? err.message : 'No pudimos iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const quick = [
    { id: 'u_valeria', role: 'Cliente', name: 'Valeria Rojas', to: '/app' },
    { id: 'u_rosa', role: 'Maki', name: 'Rosa Quispe', to: '/maki' },
    { id: 'u_admin', role: 'Administración', name: 'Equipo MakiYa', to: '/admin' },
  ];

  return (
    <AuthFrame title="Ingresa a tu cuenta" subtitle="Clientes, Makis y equipo MakiYa usan el mismo acceso.">
      <Card className="p-5 sm:p-6">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Correo" htmlFor="email">
            <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Contraseña" htmlFor="pw">
            <Input id="pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <Notice tone="accent">{error}</Notice>}
          <Button type="submit" block loading={loading}>Ingresar</Button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-600">
          ¿No tienes cuenta? <Link to="/registro" className="font-semibold text-petrol-700 underline">Regístrate</Link>
        </p>
      </Card>
      <Card className="mt-4 p-5">
        <p className="text-sm font-bold">Acceso rápido de demostración</p>
        <p className="text-xs text-ink-600">Usuarios ficticios (@makiya.demo, contraseña <code className="rounded bg-surface px-1">{DEMO_PASSWORD}</code>). Abre cada rol en una pestaña distinta para ver cómo se conectan.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {quick.map((q) => (
            <button
              key={q.id}
              onClick={() => {
                loginAs(q.id);
                nav(q.to);
              }}
              className="rounded-xl border border-line px-3 py-2.5 text-left transition hover:border-turq-500 hover:bg-mint-50"
            >
              <span className="block text-xs font-semibold text-turq-700">{q.role}</span>
              <span className="text-sm font-semibold">{q.name}</span>
            </button>
          ))}
        </div>
      </Card>
    </AuthFrame>
  );
}

const EMPTY_AVAIL: Availability = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

export function Register() {
  const { register, db } = useApp();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [role, setRole] = useState<'client' | 'maki'>(params.get('rol') === 'maki' ? 'maki' : 'client');
  const [f, setF] = useState({ name: '', email: '', phone: '', district: '', password: '', consent: false });
  const [m, setM] = useState({
    specialties: [] as string[],
    experienceYears: '',
    districts: [] as string[],
    availability: { ...EMPTY_AVAIL, 1: ['manana', 'tarde'], 2: ['manana', 'tarde'], 3: ['manana', 'tarde'], 4: ['manana', 'tarde'], 5: ['manana', 'tarde'] } as Availability,
    bio: '',
    ref1: { name: '', phone: '' },
    ref2: { name: '', phone: '' },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const activeCats = db.categories.filter((c) => c.status === 'activo');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input = {
      role,
      ...f,
      maki:
        role === 'maki'
          ? { specialties: m.specialties, experienceYears: Number(m.experienceYears), districts: m.districts, availability: m.availability, bio: m.bio, references: [m.ref1, m.ref2] }
          : undefined,
    };
    const errs = validateRegister(db, { ...input, passwordHash: 'x' });
    if (f.password.length < 8) errs.password = 'Mínimo 8 caracteres.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const u = await register(input);
      nav(u.role === 'client' ? '/app/pedir' : '/maki/perfil');
    } catch (err) {
      setErrors({ form: err instanceof DomainError ? err.message : 'No pudimos crear tu cuenta.' });
    } finally {
      setLoading(false);
    }
  };

  const toggleWindow = (d: Weekday, w: TimeWindow) =>
    setM((s) => ({ ...s, availability: { ...s.availability, [d]: s.availability[d].includes(w) ? s.availability[d].filter((x) => x !== w) : [...s.availability[d], w] } }));

  return (
    <AuthFrame title={role === 'client' ? 'Crea tu cuenta' : 'Postula como Maki'} subtitle={role === 'client' ? 'En menos de un minuto. Luego nos cuentas qué necesitas.' : 'Te evaluaremos en 4 capas antes de enviarte solicitudes.'}>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1">
        {(['client', 'maki'] as const).map((r) => (
          <button key={r} type="button" onClick={() => setRole(r)} className={`h-10 rounded-lg text-sm font-semibold ${role === r ? 'bg-white text-petrol-700 shadow-card' : 'text-ink-600'}`}>
            {r === 'client' ? 'Necesito ayuda' : 'Quiero ser Maki'}
          </button>
        ))}
      </div>
      <Card className="p-5 sm:p-6">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <Field label="Nombre completo" htmlFor="name" error={errors.name}>
            <Input id="name" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} invalid={!!errors.name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Correo" htmlFor="remail" error={errors.email}>
              <Input id="remail" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} invalid={!!errors.email} />
            </Field>
            <Field label="Celular (WhatsApp)" htmlFor="phone" error={errors.phone}>
              <Input id="phone" inputMode="tel" autoComplete="tel" placeholder="987 654 321" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} invalid={!!errors.phone} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={role === 'client' ? 'Distrito de tu hogar' : 'Distrito donde vives'} htmlFor="district" error={errors.district} hint="Distritos piloto">
              <Select id="district" value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} invalid={!!errors.district}>
                <option value="">Elige…</option>
                {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
              </Select>
            </Field>
            <Field label="Contraseña" htmlFor="rpw" error={errors.password} hint="Mínimo 8 caracteres">
              <Input id="rpw" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} invalid={!!errors.password} />
            </Field>
          </div>

          {role === 'maki' && (
            <div className="space-y-4 border-t border-line pt-4">
              <Field label="Especialidades" error={errors.specialties} hint="Solo categorías habilitadas en esta etapa.">
                <ChipGroup multiple options={activeCats.map((c) => ({ value: c.id, label: c.name }))} value={m.specialties} onChange={(v) => setM({ ...m, specialties: v as string[] })} />
              </Field>
              <Field label="Años de experiencia" htmlFor="exp" error={errors.experienceYears}>
                <Input id="exp" type="number" min={0} max={50} value={m.experienceYears} onChange={(e) => setM({ ...m, experienceYears: e.target.value })} className="max-w-[140px]" />
              </Field>
              <Field label="Distritos donde atiendes" error={errors.districts}>
                <ChipGroup multiple options={DISTRICTS.map((d) => ({ value: d, label: d }))} value={m.districts} onChange={(v) => setM({ ...m, districts: v as string[] })} />
              </Field>
              <Field label="Disponibilidad semanal" error={errors.availability} hint="Toca para activar/desactivar franjas. Atendemos de lunes a sábado.">
                <div className="overflow-x-auto">
                  <table className="text-sm">
                    <thead>
                      <tr><th />{(['manana', 'mediodia', 'tarde'] as TimeWindow[]).map((w) => <th key={w} className="px-2 pb-1 text-xs font-semibold text-ink-600">{w === 'manana' ? '8–11' : w === 'mediodia' ? '11–15' : '15–19'}</th>)}</tr>
                    </thead>
                    <tbody>
                      {([1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => (
                        <tr key={d}>
                          <td className="pr-3 font-medium">{WEEKDAY_LABEL[d]}</td>
                          {(['manana', 'mediodia', 'tarde'] as TimeWindow[]).map((w) => (
                            <td key={w} className="p-1">
                              <button type="button" onClick={() => toggleWindow(d, w)} aria-pressed={m.availability[d].includes(w)} aria-label={`${WEEKDAY_LABEL[d]} ${w}`} className={`h-8 w-14 rounded-lg border ${m.availability[d].includes(w) ? 'border-turq-500 bg-turq-500' : 'border-line bg-white'}`} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Field>
              <Field label="Cuéntanos de tu experiencia" htmlFor="bio" optional>
                <Textarea id="bio" value={m.bio} onChange={(e) => setM({ ...m, bio: e.target.value })} placeholder="¿Qué trabajos haces? ¿Qué herramientas tienes?" />
              </Field>
              <Field label="Dos referencias de clientes anteriores" error={errors.references}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(['ref1', 'ref2'] as const).map((k, i) => (
                    <div key={k} className="space-y-2">
                      <Input placeholder={`Nombre referencia ${i + 1}`} value={m[k].name} onChange={(e) => setM({ ...m, [k]: { ...m[k], name: e.target.value } })} />
                      <Input placeholder="Teléfono" inputMode="tel" value={m[k].phone} onChange={(e) => setM({ ...m, [k]: { ...m[k], phone: e.target.value } })} />
                    </div>
                  ))}
                </div>
              </Field>
              <Notice title="Evaluación en 4 capas">Identidad (DNI), certificado de antecedentes, referencias y una prueba de oficio práctica (mínimo 14/20). Hasta ser habilitado no recibirás solicitudes.</Notice>
            </div>
          )}

          <div className="border-t border-line pt-4">
            <Checkbox
              checked={f.consent}
              onChange={(v) => setF({ ...f, consent: v })}
              label="Acepto el tratamiento de mis datos personales"
              description="Conforme a la Ley N.° 29733. Usamos tus datos solo para gestionar tus servicios. Las fotos se limitan a la zona de trabajo."
            />
            {errors.consent && <p className="mt-1 text-xs font-medium text-accent-700">{errors.consent}</p>}
          </div>
          {errors.form && <Notice tone="accent">{errors.form}</Notice>}
          <Button type="submit" block loading={loading}>{role === 'client' ? 'Crear cuenta' : 'Enviar postulación'}</Button>
        </form>
        <p className="mt-4 text-center text-sm text-ink-600">
          ¿Ya tienes cuenta? <Link to="/ingresar" className="font-semibold text-petrol-700 underline">Ingresa</Link>
        </p>
      </Card>
    </AuthFrame>
  );
}
