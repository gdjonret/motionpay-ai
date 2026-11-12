import { useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/components/AuthProvider';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TextField } from '@/components/TextField';
import { Notice } from '@/components/Notice';
import { PrimaryButton } from '@/components/PrimaryButton';
import { supabase } from '@/services/supabase';

export default function RecoverScreen() {
  const { session, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const submit = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    try {
      if (session) {
        if (password.length < 8) { setNotice('Use at least 8 characters.'); return; }
        const result = await supabase.auth.updateUser({ password });
        if (result.error) throw result.error;
        setPassword(''); setNotice('Password updated. You can return to MotionPay.');
      } else {
        const redirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL;
        if (!redirect) { setNotice('Password recovery needs a configured web return URL. Contact the demo administrator.'); return; }
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirect.replace(/\/$/, '') + '/recover' });
        if (result.error) throw result.error;
        setNotice('If an account exists, a recovery link was sent. Open it in your browser to choose a new password.');
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Recovery is unavailable. Please retry.'); }
    finally { setBusy(false); }
  };
  return <Screen contentStyle={{ gap: 24 }}>
    <ScreenHeader onBack={() => router.replace('/sign-in')} backLabel="Return to sign in" eyebrow="Account" title="Recover your account" subtitle={session ? 'Set a new password for your signed-in account.' : 'Enter your email. Complete recovery in the browser opened by the email link.'} />
    <TextField label={session ? 'New password' : 'Email'} icon={session ? 'lock-closed-outline' : 'mail-outline'} value={session ? password : email} onChangeText={session ? setPassword : setEmail} secureTextEntry={Boolean(session)} autoCapitalize="none" keyboardType={session ? 'default' : 'email-address'} placeholder={session ? 'At least 8 characters' : 'you@example.com'} />
    <PrimaryButton disabled={busy || loading || !supabase} loading={busy} label={busy ? 'Please wait…' : session ? 'Update password' : 'Send recovery email'} onPress={() => { void submit(); }} />
    {notice !== '' && <Notice>{notice}</Notice>}
    <PrimaryButton variant="ghost" icon={null} leadingIcon="arrow-back" label="Return to sign in" onPress={() => router.replace('/sign-in')} />
  </Screen>;
}
