import { useCallback, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProgramSummary, paymentRequest, type ProgramSummary, type ProgramAccess } from '@/services/payments';

export function useProgram(userId?: string) {
  const [summary, setSummary] = useState<ProgramSummary | null>(null);
  const [access, setAccess] = useState<ProgramAccess | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision(value => value + 1), []);
  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async (requestedRevision = revision) => {
      try {
        const [nextSummary, nextAccess] = await Promise.all([getProgramSummary(), userId ? paymentRequest<ProgramAccess>('/api/programs/beginner-strength/access') : Promise.resolve(null)]);
        if (active && requestedRevision === revision) { setSummary(nextSummary); setAccess(nextAccess); setError(''); }
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : 'Unable to check program access.'); }
      finally { if (active) setLoading(false); }
    };
    void load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { active = false; subscription.remove(); };
  }, [userId, revision]));
  return { summary, access, setAccess, error, loading, refresh };
}
