import type { Database } from '@/domain/types';
import { DomainError } from '@/domain/stateMachine';
import type { Repository } from './repository';
import { createSeed, DB_VERSION } from './seed';

const KEY = 'makiya.demo.db';

export class LocalStorageRepository implements Repository {
  readonly id = 'local-demo';
  private memory: Database | null = null;

  private get storage(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  load(): Database {
    try {
      const raw = this.storage?.getItem(KEY);
      if (raw) {
        const db = JSON.parse(raw) as Database;
        if (db.version === DB_VERSION) return db;
      }
    } catch {
      /* datos corruptos → se regeneran */
    }
    if (this.memory) return this.memory;
    const seed = createSeed();
    this.save(seed);
    return seed;
  }

  save(db: Database): void {
    this.memory = db;
    try {
      this.storage?.setItem(KEY, JSON.stringify(db));
    } catch (e) {
      if (e instanceof DOMException && /quota/i.test(e.name + e.message)) {
        throw new DomainError('El almacenamiento del navegador está lleno. Usa fotos más livianas o restablece los datos de demostración.');
      }
      /* sin storage disponible: se mantiene en memoria */
    }
  }

  reset(): Database {
    const seed = createSeed();
    this.save(seed);
    return seed;
  }

  subscribe(cb: (db: Database) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: StorageEvent) => {
      if (e.key === KEY && e.newValue) {
        try {
          const db = JSON.parse(e.newValue) as Database;
          this.memory = db;
          cb(db);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }
}

/** Repositorio en memoria (pruebas). */
export class MemoryRepository implements Repository {
  readonly id = 'memory';
  constructor(private db: Database = createSeed()) {}
  load() {
    return this.db;
  }
  save(db: Database) {
    this.db = db;
  }
  reset() {
    this.db = createSeed();
    return this.db;
  }
  subscribe() {
    return () => {};
  }
}
