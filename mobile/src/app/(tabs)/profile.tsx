import { useCallback, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Notice, Tag } from '@/components/Notice';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/services/supabase';
import { colors, radii, type } from '@/theme';
import { paymentRequest } from '@/services/payments';
import { listPlans, type PlanSummary } from '@/services/plans';

export default function ProfileScreen() {
  const { session, loading } = useAuth();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signOut = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await supabase?.auth.signOut();
      if (result?.error) setError(result.error.message);
    } catch { setError('Unable to sign out. Please try again.'); }
    finally { setBusy(false); }
  };
  const email = session?.user.email;
  return <Screen contentStyle={s.screen}>
    <ScreenHeader eyebrow="Profile" title="Your account" />
    <View style={s.identity}>
      <View style={s.avatar}>{email ? <Text style={s.avatarText}>{email.slice(0, 1).toUpperCase()}</Text> : <Ionicons name="person-outline" size={26} color={colors.textSecondary} />}</View>
      <View style={{ flex: 1, gap: 4 }}>
        {loading ? <ActivityIndicator color={colors.primary} style={{ alignSelf: 'flex-start' }} /> : <Text style={type.subheading} numberOfLines={1}>{session ? email : 'Guest'}</Text>}
        <Text style={type.caption}>{loading ? 'Loading account…' : session ? 'Signed in' : 'You’re browsing as a guest.'}</Text>
      </View>
      {!loading && <Tag label={session ? 'Member' : 'Guest'} tone={session ? 'success' : 'neutral'} />}
    </View>
    {!loading && !session && <PrimaryButton label="Sign in or create account" onPress={() => router.push('/sign-in')} />}
    {error !== '' && <Notice tone="error">{error}</Notice>}
    {session && <MyPlans key={`plans-${session.user.id}`} />}
    {session && <PurchaseHistory key={session.user.id} />}
    <View style={s.group}>
      <Text style={[type.overline, s.groupLabel]}>More</Text>
      <View style={s.list}>
        <Row icon="barbell-outline" label="Training program" onPress={() => router.push('/program')} />
        <Row icon="shield-checkmark-outline" label="Data and demo information" onPress={() => router.push('/privacy')} last />
      </View>
    </View>
    {!loading && session && <PrimaryButton variant="secondary" icon={null} leadingIcon="log-out-outline" disabled={busy} loading={busy} label={busy ? 'Signing out…' : 'Sign out'} onPress={() => { void signOut(); }} />}
  </Screen>;
}

function Row({ icon, label, onPress, last, trailing }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; last?: boolean; trailing?: ReactNode }) {
  return <Pressable accessibilityRole="button" disabled={!onPress} onPress={onPress} style={({ pressed }) => [s.row, !last && s.rowBorder, pressed && { backgroundColor: colors.surfaceRaised }]}>
    <View style={s.rowIcon}><Ionicons name={icon} size={18} color={colors.textSecondary} /></View>
    <Text style={[type.subheading, { flex: 1, fontWeight: '500' }]}>{label}</Text>
    {trailing ?? <Ionicons name="chevron-forward" size={18} color={colors.muted} />}
  </Pressable>;
}

function MyPlans() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    void listPlans().then(value => { if (active) { setPlans(Array.isArray(value) ? value : []); setError(''); } }).catch(() => { if (active) setError('Your plans are unavailable. Reopen this screen to retry.'); });
    return () => { active = false; };
  }, []));
  return <View style={s.group}>
    <Text style={[type.overline, s.groupLabel]}>My AI plans</Text>
    <View style={s.list}>
      {plans.map(plan => <Pressable key={plan.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/plan', params: { id: plan.id } })} style={({ pressed }) => [s.row, s.rowBorder, pressed && { backgroundColor: colors.surfaceRaised }]}>
        <View style={s.rowIcon}><Ionicons name="sparkles-outline" size={18} color={colors.textSecondary} /></View>
        <View style={{ flex: 1, gap: 2 }}><Text style={type.subheading} numberOfLines={1}>{plan.title}</Text><Text style={type.caption}>{plan.preferences.days_per_week} days/wk · {new Date(plan.created_at).toLocaleDateString()}</Text></View>
        <Tag label={plan.unlocked_at ? 'Unlocked' : 'Preview'} tone={plan.unlocked_at ? 'success' : 'neutral'} />
      </Pressable>)}
      {error !== '' && <View style={[s.row, s.rowBorder]}><Text style={type.small}>{error}</Text></View>}
      <Row icon="add-circle-outline" label={plans.length ? 'Build another plan' : 'Build your first AI plan'} onPress={() => router.push('/plan-builder')} last />
    </View>
  </View>;
}

function PurchaseHistory() {
  const [rows, setRows] = useState<{ program_id: string; checkout_title?: string | null; status: string; amount_cents: number; currency: string; created_at: string }[]>([]);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    void paymentRequest<typeof rows>('/api/purchases').then(value => { if (active) setRows(value); }).catch(() => { if (active) setError('Purchase history is unavailable. Reopen this screen to retry.'); });
    return () => { active = false; };
  }, []));
  return <View style={s.group}>
    <Text style={[type.overline, s.groupLabel]}>Sandbox purchase history</Text>
    <View style={s.list}>
      {rows.map((row, index) => <View key={index} style={[s.row, s.rowBorder]}>
        <View style={s.rowIcon}><Ionicons name="receipt-outline" size={18} color={colors.textSecondary} /></View>
        <View style={{ flex: 1, gap: 2 }}><Text style={type.subheading} numberOfLines={1}>{row.checkout_title || `${(row.amount_cents / 100).toFixed(2)} ${row.currency}`}</Text><Text style={type.caption}>{(row.amount_cents / 100).toFixed(2)} {row.currency} · {new Date(row.created_at).toLocaleDateString()}</Text></View>
        <Tag label={row.status} tone={/complet|captur|paid/i.test(row.status) ? 'success' : 'neutral'} />
      </View>)}
      {!rows.length && !error && <View style={[s.row, s.rowBorder]}><Text style={type.small}>No purchases yet.</Text></View>}
      {error !== '' && <View style={[s.row, s.rowBorder]}><Text style={type.small}>{error}</Text></View>}
      <Row icon="lock-open-outline" label="View program access" onPress={() => router.push('/program')} last />
    </View>
  </View>;
}

const s = StyleSheet.create({
  screen: { gap: 24 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.accent, fontSize: 22, fontWeight: '700' },
  group: { gap: 10 },
  groupLabel: { paddingHorizontal: 4 },
  list: { borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIcon: { width: 32, height: 32, borderRadius: radii.sm, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
});
