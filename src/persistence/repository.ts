import type { Database } from '@/domain/types';

/**
 * Contrato de persistencia. La app solo conoce esta interfaz.
 * - LocalStorageRepository: modo demostración (sin servicios externos).
 * - SupabaseRepository: previsto (ver supabase/schema.sql con RLS por rol).
 */
export interface Repository {
  readonly id: string;
  load(): Database;
  save(db: Database): void;
  reset(): Database;
  /** Notifica cambios hechos desde otra pestaña/ventana (útil para demostrar los 3 roles a la vez). */
  subscribe(cb: (db: Database) => void): () => void;
}
