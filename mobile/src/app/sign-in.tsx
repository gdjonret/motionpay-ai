import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Brand } from '@/components/Brand';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { Notice } from '@/components/Notice';
import { colors, radii, type } from '@/theme';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function SignInScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [mode, setMode] = useState<'sign-in' | 'create'>('sign-in');
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  if (session) return <Redirect href={next === 'program' ? '/program' : next === 'plan-builder' ? '/plan-builder' : '/(tabs)'} />;
  const submit = async () => {
    if (busy) return;
    if (!supabase) { setNotice('Account sign-in is not configured yet. You can still browse the demo.'); return; }
    if (!email.trim() || password.length < 8) { setNotice('Enter your email and a password of at least 8 characters.'); return; }
    setBusy(true); setNotice('');
    try {
      const result = mode === 'create'
        ? await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim() } } })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) { setNotice(result.error.message); return; }
      setPassword('');
      if (!result.data.session) setNotice('Check your email to confirm your account, then return here and sign in.');
    } catch { setNotice('Unable to connect to sign-in. Please try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Screen bottomSafe contentStyle={styles.screen}>
      <Brand />
      <View style={styles.header}>
        <Text style={type.display}>{mode === 'sign-in' ? 'Welcome back' : 'Create your account'}</Text>
        <Text style={type.body}>{mode === 'sign-in' ? 'Sign in to access your programs and purchases.' : 'Save program access and pick up where you left off.'}</Text>
      </View>
      <View style={styles.segment}>
        {(['sign-in', 'create'] as const).map(item => <Pressable key={item} accessibilityRole="tab" accessibilityState={{ selected: mode === item }} onPress={() => setMode(item)} style={[styles.segmentButton, mode === item && styles.segmentActive]}><Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>{item === 'sign-in' ? 'Sign in' : 'Create account'}</Text></Pressable>)}
      </View>
      <View style={styles.form}>
        {mode === 'create' && <TextField label="Full name" icon="person-outline" value={name} onChangeText={setName} maxLength={100} placeholder="Jane Doe" autoComplete="name" />}
        <TextField label="Email" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" />
        <TextField label="Password" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} onSubmitEditing={() => { void submit(); }} />
        {mode === 'sign-in' && <Pressable accessibilityRole="button" onPress={() => router.push('/recover')} style={styles.forgot}><Text style={type.link}>Forgot password?</Text></Pressable>}
        {notice !== '' && <Notice tone="info">{notice}</Notice>}
        <PrimaryButton disabled={busy} loading={busy} label={busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Create account'} onPress={() => { void submit(); }} />
        {mode === 'create' && <PrimaryButton variant="ghost" icon={null} size="md" disabled={busy} label="Resend confirmation email" onPress={() => {
          if (!supabase || !email.trim()) { setNotice('Enter your email first.'); return; }
          setBusy(true);
          void supabase.auth.resend({ type: 'signup', email: email.trim() }).then(({ error }) => setNotice(error ? error.message : 'If eligible, a confirmation email has been sent.')).catch(() => setNotice('Unable to resend. Please try again.')).finally(() => setBusy(false));
        }} />}
      </View>
      <View style={styles.divider}><View style={styles.line} /><Text style={type.caption}>or</Text><View style={styles.line} /></View>
      <PrimaryButton variant="secondary" icon={null} leadingIcon="compass-outline" label="Browse without an account" onPress={() => router.replace('/(tabs)')} />
      <Text style={[type.caption, styles.terms]}>An account will be required to save purchased program access.</Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  screen: { gap: 24, paddingTop: 20 },
  header: { gap: 8, marginTop: 8 },
  segment: { flexDirection: 'row', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: 4 },
  segmentButton: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: radii.sm },
  segmentActive: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.borderStrong },
  segmentText: { color: colors.muted, fontWeight: '600', fontSize: 14 },
  segmentTextActive: { color: colors.text },
  form: { gap: 16 },
  forgot: { alignSelf: 'flex-end', minHeight: 32, justifyContent: 'center', marginTop: -6 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  line: { height: 1, backgroundColor: colors.border, flex: 1 },
  terms: { textAlign: 'center' },
});
