import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/services/supabase';

const AuthContext = createContext<{ session: Session | null; loading: boolean }>({ session: null, loading: true });
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let changed = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      changed = true;
      if (active) { setSession(next); setLoading(false); }
    });
    void client.auth.getSession().then(({ data }) => {
      if (active && !changed) { setSession(data.session); setLoading(false); }
    }).catch(() => { if (active) setLoading(false); });
    const refresh = (state: string | null | undefined) => { if (state === 'active') client.auth.startAutoRefresh(); else client.auth.stopAutoRefresh(); };
    if (Platform.OS !== 'web') refresh(AppState.currentState);
    const appState = Platform.OS !== 'web' ? AppState.addEventListener('change', refresh) : null;
    return () => { active = false; subscription.unsubscribe(); appState?.remove(); if (Platform.OS !== 'web') client.auth.stopAutoRefresh(); };
  }, []);
  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}
