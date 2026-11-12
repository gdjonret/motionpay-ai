import { backendUrl, authHeaders } from '@/services/api';

export type ProgramAccess = { unlocked: boolean; pending_order_id: string | null; pending_amount_cents?: number | null; pending_currency?: string | null };
export type ProgramSummary = { id: string; title: string; price_cents: number; currency: string; duration: string; frequency: string; sandbox: boolean };
export type ProgramContent = { title: string; note: string; warmup: string; weeks: { week: number; focus: string; guidance: string; sessions: { day: string; exercises: { exercise_id: string; prescription: string }[] }[] }[] };
export async function paymentRequest<T>(path: string, method = 'GET'): Promise<T> {
  const headers = await authHeaders(true);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 60000);
  try {
    const response = await fetch(backendUrl() + path, { method, headers, signal: abort.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Checkout is unavailable. Please try again.');
    if (path.endsWith('/access') && (typeof result.unlocked !== 'boolean' || (result.pending_order_id !== null && typeof result.pending_order_id !== 'string'))) throw new Error('Program access could not be verified. Please retry.');
    if (path.endsWith('/content') && (!Array.isArray(result.weeks) || typeof result.title !== 'string' || !result.weeks.every((week: ProgramContent['weeks'][number]) => Array.isArray(week.sessions) && week.sessions.every(day => Array.isArray(day.exercises) && day.exercises.every(item => typeof item.exercise_id === 'string' && typeof item.prescription === 'string'))))) throw new Error('Program content is unavailable. Please retry.');
    if (path === '/api/purchases' && !Array.isArray(result)) throw new Error('Purchase history is unavailable.');
    return result;
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Unable to reach checkout. Check your connection.');
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Checkout timed out. Retry verification before starting another payment.');
    throw error;
  } finally { clearTimeout(timer); }
}

let summaryRequest: Promise<ProgramSummary> | null = null;
let summaryCache: { value: ProgramSummary; expires: number } | null = null;
export function getProgramSummary(): Promise<ProgramSummary> {
  if (summaryCache && summaryCache.expires > Date.now()) return Promise.resolve(summaryCache.value);
  if (!summaryRequest) summaryRequest = (async () => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 12000);
    try {
      const response = await fetch(backendUrl() + '/api/programs/beginner-strength', { signal: abort.signal });
      const value = await response.json();
      if (!response.ok || value.id !== 'beginner-strength' || !Number.isInteger(value.price_cents) || value.price_cents <= 0 || !/^[A-Z]{3}$/.test(value.currency) || typeof value.title !== 'string') throw new Error('Program details are unavailable. Please retry.');
      summaryCache = { value, expires: Date.now() + 30000 };
      return value as ProgramSummary;
    } finally { clearTimeout(timer); summaryRequest = null; }
  })();
  return summaryRequest;
}

export const priceLabel = (program: ProgramSummary) => `${(program.price_cents / 100).toFixed(2)} ${program.currency}`;
