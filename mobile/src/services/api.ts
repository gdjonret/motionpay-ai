import { Platform } from 'react-native';
import { supabase } from '@/services/supabase';

export const backendUrl = () => process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || (Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000');
export async function authHeaders(required = false): Promise<Record<string, string>> {
  const result = await supabase?.auth.getSession();
  const token = result?.data.session?.access_token;
  if (required && !token) throw new Error('Sign in to continue.');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
