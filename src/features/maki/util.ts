import { makiMetrics } from '@/analytics/metrics';
import type { Database, ID } from '@/domain/types';

export const analyticsSafe = (db: Database, makiId: ID) => makiMetrics(db, makiId);
