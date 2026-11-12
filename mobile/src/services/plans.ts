import { authHeaders, backendUrl } from '@/services/api';
import type { ProgramContent } from '@/services/payments';

export const goals = [
  { id: 'strength', label: 'Build strength', icon: 'barbell-outline' },
  { id: 'muscle', label: 'Build muscle', icon: 'body-outline' },
  { id: 'conditioning', label: 'Burn fat', icon: 'flash-outline' },
  { id: 'glutes', label: 'Glutes & legs', icon: 'walk-outline' },
  { id: 'general', label: 'General fitness', icon: 'heart-outline' },
] as const;
export const planEquipment = ['Bodyweight', 'Dumbbells', 'Bands', 'Kettlebell', 'Pull-up bar', 'Gym'] as const;
export const levels = ['Beginner', 'Intermediate', 'Advanced'] as const;
export const sessionLengths = [20, 30, 45, 60] as const;

export type PlanRequest = {
  goal: typeof goals[number]['id'];
  level: typeof levels[number];
  days_per_week: number;
  equipment: (typeof planEquipment[number])[];
  session_minutes: typeof sessionLengths[number];
  notes?: string;
};
export type PlanContent = ProgramContent & { summary: string; generated_by: 'ai' | 'rules'; weeks: (ProgramContent['weeks'][number])[] };
export type Plan = {
  id: string; title: string; preferences: PlanRequest; generated_by: 'ai' | 'rules'; price_cents: number; currency: string; created_at: string;
  unlocked: boolean; pending_order_id: string | null; pending_amount_cents: number | null; pending_currency: string | null;
  content: PlanContent; locked_weeks: { week: number; focus: string; sessions: number }[];
};
export type PlanSummary = { id: string; title: string; generated_by: 'ai' | 'rules'; price_cents: number; currency: string; unlocked_at: string | null; created_at: string; preferences: PlanRequest };

// Mirrors the backend formula so users see the price before generating; the server price is authoritative.
export const estimatePrice = (days: number) => (399 + 100 * days) / 100;
export const money = (cents: number, currency: string) => `${(cents / 100).toFixed(2)} ${currency}`;

async function request<T>(path: string, method = 'GET', body?: unknown, timeoutMs = 60000): Promise<T> {
  const headers = { ...await authHeaders(true), ...(body ? { 'Content-Type': 'application/json' } : {}) };
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  try {
    const response = await fetch(backendUrl() + path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: abort.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'Something went wrong. Please try again.');
    return result;
  } catch (error) {
    if (error instanceof TypeError) throw new Error('Unable to reach MotionPay. Check your connection.');
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
    throw error;
  } finally { clearTimeout(timer); }
}

const isPlan = (value: Plan) => typeof value?.id === 'string' && typeof value.title === 'string' && Number.isInteger(value.price_cents) && Array.isArray(value.content?.weeks) && Array.isArray(value.locked_weeks);

export async function createPlan(input: PlanRequest) {
  const plan = await request<Plan>('/api/plans', 'POST', input, 90000);
  if (!isPlan(plan)) throw new Error('The plan could not be read. Please try again.');
  return plan;
}
export async function getPlan(id: string) {
  const plan = await request<Plan>(`/api/plans/${encodeURIComponent(id)}`);
  if (!isPlan(plan)) throw new Error('The plan could not be read. Please try again.');
  return plan;
}
export const listPlans = () => request<PlanSummary[]>('/api/plans');
export const checkoutPlan = (id: string) => request<{ order_id: string; approval_url: string | null }>(`/api/plans/${encodeURIComponent(id)}/checkout`, 'POST');
export const capturePlanOrder = (orderId: string) => request<{ unlocked: boolean; plan_id: string | null }>(`/api/paypal/orders/${encodeURIComponent(orderId)}/capture`, 'POST');
