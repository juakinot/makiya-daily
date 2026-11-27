import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { DomainError } from '@/domain/stateMachine';
import type { Database, User } from '@/domain/types';
import { sha256 } from '@/lib/utils';
import { LocalStorageRepository } from '@/persistence/localStorageRepo';
import type { Repository } from '@/persistence/repository';
import { DEMO_PASSWORD } from '@/persistence/seed';
import { registerUser, type RegisterInput } from '@/services/accountService';

type ToastTone = 'success' | 'error' | 'info';
interface Toast {
  id: number;
  msg: string;
  tone: ToastTone;
}

interface AppState {
  db: Database;
  user: User | null;
  repoId: string;
  /** Ejecuta un caso de uso sobre una copia de la BD; persiste y notifica. Devuelve undefined si falla. */
  run: <T>(fn: (draft: Database, actor: User) => T, success?: string) => T | undefined;
  login: (email: string, password: string) => Promise<User>;
  loginAs: (userId: string) => void;
  logout: () => void;
  register: (input: Omit<RegisterInput, 'passwordHash'> & { password: string }) => Promise<User>;
  resetDemo: () => void;
  toast: (msg: string, tone?: ToastTone) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
}

const Ctx = createContext<AppState | null>(null);
const SESSION_KEY = 'makiya.session';

const hashPassword = (email: string, password: string) => sha256(`makiya:${email.trim().toLowerCase()}:${password}`);

function readSession(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}
function writeSession(id: string | null) {
  try {
    if (id) sessionStorage.setItem(SESSION_KEY, id);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function AppProvider({ children, repository }: { children: ReactNode; repository?: Repository }) {
  const repo = useMemo(() => repository ?? new LocalStorageRepository(), [repository]);
  const [db, setDb] = useState<Database>(() => repo.load());
  const [userId, setUserId] = useState<string | null>(() => readSession());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const dbRef = useRef(db);
  dbRef.current = db;

  useEffect(() => repo.subscribe((next) => setDb(next)), [repo]);

  const user = useMemo(() => db.users.find((u) => u.id === userId) ?? null, [db.users, userId]);

  const toast = useCallback((msg: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 6000 : 3500);
  }, []);
  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const commit = useCallback(
    (draft: Database) => {
      repo.save(draft);
      dbRef.current = draft;
      setDb(draft);
    },
    [repo],
  );

  const run = useCallback(
    <T,>(fn: (draft: Database, actor: User) => T, success?: string): T | undefined => {
      const current = dbRef.current;
      const actor = current.users.find((u) => u.id === userId);
      if (!actor) {
        toast('Tu sesión expiró. Vuelve a ingresar.', 'error');
        return undefined;
      }
      const draft = structuredClone(current);
      try {
        const result = fn(draft, actor);
        commit(draft);
        if (success) toast(success, 'success');
        return result;
      } catch (e) {
        toast(e instanceof DomainError ? e.message : 'Ocurrió un error inesperado. Intenta nuevamente.', 'error');
        if (!(e instanceof DomainError)) console.error(e);
        return undefined;
      }
    },
    [commit, toast, userId],
  );

  const login = useCallback(async (email: string, password: string) => {
    const u = dbRef.current.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    const ok = u && ((u.isDemo && password === DEMO_PASSWORD) || (u.passwordHash && u.passwordHash === (await hashPassword(email, password))));
    if (!u || !ok) throw new DomainError('Correo o contraseña incorrectos.');
    writeSession(u.id);
    setUserId(u.id);
    return u;
  }, []);

  const loginAs = useCallback((id: string) => {
    const u = dbRef.current.users.find((x) => x.id === id);
    if (!u?.isDemo) return; // atajo solo para usuarios de demostración
    writeSession(id);
    setUserId(id);
  }, []);

  const logout = useCallback(() => {
    writeSession(null);
    setUserId(null);
  }, []);

  const register = useCallback(
    async (input: Omit<RegisterInput, 'passwordHash'> & { password: string }) => {
      if (input.password.length < 8) throw new DomainError('La contraseña debe tener al menos 8 caracteres.');
      const passwordHash = await hashPassword(input.email, input.password);
      const draft = structuredClone(dbRef.current);
      const u = registerUser(draft, { ...input, passwordHash });
      commit(draft);
      writeSession(u.id);
      setUserId(u.id);
      return u;
    },
    [commit],
  );

  const resetDemo = useCallback(() => {
    const fresh = repo.reset();
    dbRef.current = fresh;
    setDb(fresh);
    toast('Datos de demostración restablecidos.', 'info');
  }, [repo, toast]);

  const value: AppState = { db, user, repoId: repo.id, run, login, loginAs, logout, register, resetDemo, toast, toasts, dismissToast };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
}

/** Usuario actual garantizado (dentro de rutas protegidas). */
export function useActor(): User {
  const { user } = useApp();
  if (!user) throw new Error('Ruta protegida sin usuario');
  return user;
}
