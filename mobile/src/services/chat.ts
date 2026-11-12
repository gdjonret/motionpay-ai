import { backendUrl, authHeaders } from '@/services/api';
import { exercises } from '@/data/exercises';
export { backendUrl } from '@/services/api';

export type ChatTurn = { role: 'user' | 'assistant'; content: string; exercise_id?: string | null; related_exercise_ids?: string[]; youtube_query?: string | null };
export type CoachReply = { text: string; exercise_id: string | null; provider: 'groq' | 'catalog'; related_exercise_ids?: string[]; follow_ups?: string[]; gif_url?: string | null; youtube_query?: string | null; program_id?: 'beginner-strength' | 'custom-plan' | null };

export async function askCoach(message: string, history: ChatTurn[], signal?: AbortSignal): Promise<CoachReply> {
  const baseUrl = backendUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...await authHeaders() },
      body: JSON.stringify({ message, history: history.slice(-12) }),
      signal: controller.signal,
    });
    const data = await response.json();
    if (response.status === 503) throw new Error('The coach is not available yet. Please try again shortly.');
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'The coach could not answer. Please try again.');
    if (typeof data.text !== 'string' || !['groq', 'catalog'].includes(data.provider) || (data.exercise_id !== null && !exercises.some(exercise => exercise.id === data.exercise_id))) {
      throw new Error('The coach returned an unsupported response. Please try again.');
    }
    if (data.related_exercise_ids != null && (!Array.isArray(data.related_exercise_ids) || data.related_exercise_ids.length > 6 || data.related_exercise_ids.some((id: unknown) => !exercises.some(exercise => exercise.id === id)))) throw new Error('Unsupported exercise list.');
    // Suggestions are optional UI hints: drop malformed ones instead of failing the reply.
    data.follow_ups = Array.isArray(data.follow_ups) ? data.follow_ups.filter((item: unknown) => typeof item === 'string' && item.trim().length > 1 && item.length <= 60).slice(0, 3) : [];
    if (data.gif_url) {
      if (data.gif_url !== `/api/exercises/${data.exercise_id}/slow.gif`) throw new Error('Unsupported GIF response.');
      data.gif_url = `${baseUrl}${data.gif_url}`;
    }
    if (data.youtube_query != null && (typeof data.youtube_query !== 'string' || data.youtube_query.length > 120)) throw new Error('Unsupported tutorial request.');
    if (data.program_id != null && !['beginner-strength', 'custom-plan'].includes(data.program_id)) throw new Error('Unsupported program recommendation.');
    return data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('The coach took too long to respond. Please try again.');
    if (error instanceof TypeError) throw new Error('Unable to reach the coach. Please check your connection and try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
