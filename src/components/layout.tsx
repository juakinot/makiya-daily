import { useState, type ReactNode } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BriefcaseBusiness,
  CircleUserRound,
  ClipboardList,
  FlaskConical,
  History,
  Home,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  RotateCcw,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Store,
  Users,
  Wallet,
  Wrench,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { HOME_BY_ROLE } from '@/auth/permissions';
import { Isotipo, Lockup } from '@/brand/Brand';
import type { Role } from '@/domain/types';
import { cx } from '@/lib/utils';
import { useApp } from '@/store/AppStore';
import { Avatar, Button } from './ui';

/* ───────── Toasts ───────── */
export function ToastHost() {
  const { toasts, dismissToast } = useApp();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-xl border bg-white px-4 py-3 text-sm shadow-pop',
            t.tone === 'error' ? 'border-accent-100' : 'border-line',
          )}
        >
          {t.tone === 'error' ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-700" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-turq-600" />}
          <p className="flex-1 text-ink-900">{t.msg}</p>
          <button onClick={() => dismissToast(t.id)} className="text-ink-400 hover:text-ink-700" aria-label="Cerrar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ───────── Barra de demostración ───────── */
const DEMO_SHORTCUTS = [
  { id: 'u_valeria', label: 'Cliente · Valeria' },
  { id: 'u_diego', label: 'Cliente · Diego' },
  { id: 'u_rosa', label: 'Maki · Rosa' },
  { id: 'u_carlos', label: 'Maki · Carlos' },
  { id: 'u_martin', label: 'Maki postulante · Martín' },
  { id: 'u_admin', label: 'Administrador' },
];

export function DemoBar() {
  const { user, loginAs, resetDemo, db } = useApp();
  const nav = useNavigate();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="border-b border-line bg-surface text-[12px] text-ink-700">
      <div className="container-app flex min-h-[34px] flex-wrap items-center gap-x-3 gap-y-1 py-1">
        <span className="inline-flex items-center gap-1 font-semibold text-petrol-700">
          <FlaskConical className="h-3.5 w-3.5" /> Modo demostración
        </span>
        <span className="hidden text-ink-600 md:inline">Datos ficticios · pagos e IA simulados</span>
        <label className="ml-auto inline-flex items-center gap-1.5">
          <span className="hidden sm:inline">Ver como:</span>
          <select
            aria-label="Cambiar de usuario de demostración"
            value={user?.isDemo ? user.id : ''}
            onChange={(e) => {
              const u = db.users.find((x) => x.id === e.target.value);
              if (!u) return;
              loginAs(u.id);
              nav(HOME_BY_ROLE[u.role]);
            }}
            className="h-7 rounded-md border border-line bg-white px-1.5 text-[12px] font-medium"
          >
            <option value="" disabled>
              Elegir usuario…
            </option>
            {DEMO_SHORTCUTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        {confirm ? (
          <span className="inline-flex items-center gap-1">
            ¿Restablecer?
            <button className="font-semibold text-accent-700 underline" onClick={() => { resetDemo(); setConfirm(false); }}>Sí</button>
            <button className="underline" onClick={() => setConfirm(false)}>No</button>
          </span>
        ) : (
          <button onClick={() => setConfirm(true)} className="inline-flex items-center gap-1 hover:text-petrol-700" title="Volver a los datos iniciales">
            <RotateCcw className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Restablecer</span>
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────── Guard ───────── */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { user } = useApp();
  const loc = useLocation();
  if (!user) return <Navigate to={`/ingresar?next=${encodeURIComponent(loc.pathname)}`} replace />;
  if (user.role !== role) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <>{children}</>;
}

/* ───────── Público ───────── */
export function PublicLayout() {
  const { user } = useApp();
  const [open, setOpen] = useState(false);
  const links = [
    { href: '/#como-funciona', label: 'Cómo funciona' },
    { href: '/#servicios', label: 'Servicios' },
    { href: '/#cero-sorpresas', label: 'Cero Sorpresas' },
    { href: '/#escalera', label: 'Cómo crecemos' },
    { href: '/#makis', label: 'Para Makis' },
  ];
  return (
    <div className="flex min-h-screen flex-col">
      <DemoBar />
      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-app flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="MakiYa inicio">
            <Lockup />
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-ink-700 md:flex">
            {links.map((l) => (
              <Link key={l.href} to={l.href} className="hover:text-petrol-700">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <Link to={HOME_BY_ROLE[user.role]}>
                <Button size="sm">Ir a mi panel</Button>
              </Link>
            ) : (
              <>
                <Link to="/ingresar">
                  <Button size="sm" variant="ghost">Ingresar</Button>
                </Link>
                <Link to="/registro">
                  <Button size="sm">Pedir ayuda</Button>
                </Link>
              </>
            )}
          </div>
          <button className="rounded-lg p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menú">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-line bg-white md:hidden">
            <div className="container-app flex flex-col gap-1 py-3">
              {links.map((l) => (
                <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="rounded-lg px-2 py-2.5 font-medium hover:bg-surface">
                  {l.label}
                </Link>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                {user ? (
                  <Link to={HOME_BY_ROLE[user.role]} className="col-span-2">
                    <Button block>Ir a mi panel</Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/ingresar"><Button block variant="secondary">Ingresar</Button></Link>
                    <Link to="/registro"><Button block>Pedir ayuda</Button></Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="container-app grid gap-6 py-10 text-sm text-ink-600 sm:grid-cols-3">
          <div>
            <Lockup withSlogan />
            <p className="mt-3 max-w-xs">Ayuda cotidiana de confianza para tu hogar. Prototipo académico — Universidad Científica del Sur, 2026.</p>
          </div>
          <div>
            <p className="font-semibold text-ink-900">MakiYa</p>
            <ul className="mt-2 space-y-1.5">
              <li><Link to="/#como-funciona" className="hover:text-petrol-700">Cómo funciona</Link></li>
              <li><Link to="/#cero-sorpresas" className="hover:text-petrol-700">Sistema Cero Sorpresas</Link></li>
              <li><Link to="/registro?rol=maki" className="hover:text-petrol-700">Quiero ser Maki</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-ink-900">Legal (demo)</p>
            <ul className="mt-2 space-y-1.5">
              <li>Protección de datos: Ley N.° 29733</li>
              <li>Libro de Reclamaciones virtual (próximamente)</li>
              <li>Pagos simulados: no se procesa dinero real</li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ───────── Cliente / Maki ───────── */
interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
  badge?: number;
}

function UserMenu() {
  const { user, logout } = useApp();
  const nav = useNavigate();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2">
      <Avatar name={user.name} className="h-9 w-9" />
      <div className="hidden leading-tight lg:block">
        <p className="text-sm font-semibold">{user.name.split(' ')[0]}</p>
        <p className="text-xs text-ink-600">{user.role === 'client' ? 'Cliente' : user.role === 'maki' ? 'Maki' : 'Administración'}</p>
      </div>
      <button
        onClick={() => {
          logout();
          nav('/');
        }}
        className="rounded-lg p-2 text-ink-600 hover:bg-surface hover:text-accent-700"
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}

function RoleShell({ items, homeTo, tag }: { items: NavItem[]; homeTo: string; tag?: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <DemoBar />
      <header className="sticky top-0 z-40 border-b border-line bg-white">
        <div className="container-app flex h-16 items-center justify-between gap-4">
          <Link to={homeTo} className="flex items-center gap-2">
            <Lockup size="sm" />
            {tag}
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {items.map((i) => (
              <NavLink
                key={i.to}
                to={i.to}
                end={i.end}
                className={({ isActive }) =>
                  cx('relative flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition', isActive ? 'bg-mint-50 text-petrol-700' : 'text-ink-600 hover:text-ink-900')
                }
              >
                {i.icon}
                {i.label}
                {!!i.badge && <span className="rounded-full bg-accent-500 px-1.5 text-[11px] text-white">{i.badge}</span>}
              </NavLink>
            ))}
          </nav>
          <UserMenu />
        </div>
      </header>
      <main className="container-app flex-1 pb-28 pt-5 md:pb-12 md:pt-8">
        <Outlet />
      </main>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white md:hidden" aria-label="Navegación principal">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) => cx('relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold', isActive ? 'text-petrol-700' : 'text-ink-400')}
            >
              {i.icon}
              {i.label}
              {!!i.badge && <span className="absolute right-[calc(50%-18px)] top-1.5 h-2 w-2 rounded-full bg-accent-500" />}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function ClientLayout() {
  const { db, user } = useApp();
  const pending = db.requests.filter((r) => r.clientId === user?.id && ['propuesta_lista', 'evidencia_enviada'].includes(r.status)).length;
  return (
    <RequireRole role="client">
      <RoleShell
        homeTo="/app"
        items={[
          { to: '/app', label: 'Inicio', icon: <Home className="h-5 w-5 md:h-4 md:w-4" />, end: true, badge: pending },
          { to: '/app/pedir', label: 'Pedir', icon: <PlusCircle className="h-5 w-5 md:h-4 md:w-4" /> },
          { to: '/app/servicios', label: 'Servicios', icon: <Store className="h-5 w-5 md:h-4 md:w-4" /> },
          { to: '/app/historial', label: 'Historial', icon: <History className="h-5 w-5 md:h-4 md:w-4" /> },
          { to: '/app/perfil', label: 'Mi hogar', icon: <CircleUserRound className="h-5 w-5 md:h-4 md:w-4" /> },
        ]}
      />
    </RequireRole>
  );
}

export function MakiLayout() {
  const { db, user } = useApp();
  const offers = db.requests.filter((r) => r.status === 'esperando_maki' && r.offers.some((o) => o.makiId === user?.id && o.status === 'pendiente')).length;
  return (
    <RequireRole role="maki">
      <RoleShell
        homeTo="/maki"
        tag={<span className="rounded-md bg-petrol-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Maki</span>}
        items={[
          { to: '/maki', label: 'Solicitudes', icon: <Inbox className="h-5 w-5 md:h-4 md:w-4" />, end: true, badge: offers },
          { to: '/maki/trabajos', label: 'Trabajos', icon: <Wrench className="h-5 w-5 md:h-4 md:w-4" /> },
          { to: '/maki/ingresos', label: 'Ingresos', icon: <Wallet className="h-5 w-5 md:h-4 md:w-4" /> },
          { to: '/maki/perfil', label: 'Perfil', icon: <CircleUserRound className="h-5 w-5 md:h-4 md:w-4" /> },
        ]}
      />
    </RequireRole>
  );
}

/* ───────── Admin ───────── */
export function AdminLayout() {
  const { db } = useApp();
  const [open, setOpen] = useState(false);
  const counts = {
    review: db.requests.filter((r) => r.status === 'en_revision').length,
    makis: db.makiProfiles.filter((m) => ['postulante', 'en_evaluacion'].includes(m.status)).length,
    incidents: db.incidents.filter((i) => ['abierta', 'en_correccion'].includes(i.status)).length,
  };
  const items: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
    { to: '/admin/solicitudes', label: 'Solicitudes', icon: <ClipboardList className="h-4 w-4" />, badge: counts.review },
    { to: '/admin/makis', label: 'Makis', icon: <ShieldCheck className="h-4 w-4" />, badge: counts.makis },
    { to: '/admin/clientes', label: 'Clientes', icon: <Users className="h-4 w-4" /> },
    { to: '/admin/incidencias', label: 'Incidencias y garantías', icon: <ShieldAlert className="h-4 w-4" />, badge: counts.incidents },
    { to: '/admin/liquidaciones', label: 'Liquidaciones', icon: <Wallet className="h-4 w-4" /> },
    { to: '/admin/servicios', label: 'Servicios', icon: <BriefcaseBusiness className="h-4 w-4" /> },
    { to: '/admin/configuracion', label: 'Comisiones y reglas', icon: <Settings2 className="h-4 w-4" /> },
    { to: '/admin/analitica', label: 'Analítica', icon: <BarChart3 className="h-4 w-4" /> },
  ];
  const side = (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map((i) => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.end}
          onClick={() => setOpen(false)}
          className={({ isActive }) => cx('flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition', isActive ? 'bg-white/15 text-white' : 'text-mint-100/80 hover:bg-white/10 hover:text-white')}
        >
          {i.icon}
          <span className="flex-1">{i.label}</span>
          {!!i.badge && <span className="rounded-full bg-accent-500 px-1.5 text-[11px] font-bold text-white">{i.badge}</span>}
        </NavLink>
      ))}
    </nav>
  );
  return (
    <RequireRole role="admin">
      <div className="flex min-h-screen flex-col bg-surface">
        <DemoBar />
        <div className="flex flex-1">
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-petrol-700 lg:flex">
            <div className="flex items-center gap-2 px-5 py-5">
              <Isotipo className="h-7" />
              <span className="font-display text-lg font-extrabold text-white">MakiYa <span className="font-medium text-mint-200">Admin</span></span>
            </div>
            {side}
          </aside>
          {open && (
            <div className="fixed inset-0 z-50 flex lg:hidden" onClick={() => setOpen(false)}>
              <aside className="w-72 bg-petrol-700" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4">
                  <span className="text-lg font-extrabold text-white">MakiYa Admin</span>
                  <button onClick={() => setOpen(false)} className="text-white" aria-label="Cerrar menú"><X className="h-5 w-5" /></button>
                </div>
                {side}
              </aside>
              <div className="flex-1 bg-ink-900/40" />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
              <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Abrir menú">
                <Menu className="h-5 w-5" />
              </button>
              <span className="text-sm font-semibold text-ink-600 lg:hidden">MakiYa Admin</span>
              <div className="ml-auto"><UserMenu /></div>
            </header>
            <main className="w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </RequireRole>
  );
}
