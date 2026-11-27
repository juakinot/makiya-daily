import { createSeed } from '@/persistence/seed';
import type { Database, User } from '@/domain/types';
import { dateOnlyPlus } from '@/lib/utils';

export function freshDb(): Database {
  return createSeed();
}
export function userBy(db: Database, email: string): User {
  const u = db.users.find((x) => x.email === email);
  if (!u) throw new Error('no user ' + email);
  return u;
}
/** Próximo día hábil (lun–sáb) a ≥ n días */
export function futureWorkday(n = 3): string {
  for (let i = n; i < n + 7; i++) {
    const d = dateOnlyPlus(i);
    const [y, m, dd] = d.split('-').map(Number);
    if (new Date(y, m - 1, dd).getDay() !== 0) return d;
  }
  return dateOnlyPlus(n);
}
