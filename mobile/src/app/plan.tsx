import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Notice, Tag } from '@/components/Notice';
import { LockedWeekCard, WeekCard } from '@/components/WeekCard';
import { useAuth } from '@/components/AuthProvider';
import { capturePlanOrder, checkoutPlan, getPlan, goals, money, type Plan } from '@/services/plans';
import { colors, radii, type } from '@/theme';

export default function PlanScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { session, loading } = useAuth();
  if (!id) return <Redirect href="/plan-builder" />;
  if (!loading && !session) return <Redirect href={{ pathname: '/sign-in', params: { next: 'plan-builder' } }} />;
  return <PlanView key={`${session?.user.id}:${id}`} id={id} />;
}

function PlanView({ id }: { id: string }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const load = useCallback(async () => {
    try { setPlan(await getPlan(id)); setLoadError(''); }
    catch (failure) { setLoadError(failure instanceof Error ? failure.message : 'Unable to load this plan.'); }
  }, [id]);
  useFocusEffect(useCallback(() => {
    void load();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => subscription.remove();
  }, [load]));
  const perform = async (action: 'checkout' | 'verify') => {
    if (lock.current || !plan) return;
    lock.current = true; setBusy(true); setNotice('');
    try {
      if (action === 'checkout') {
        const order = await checkoutPlan(plan.id);
        setPlan({ ...plan, pending_order_id: order.order_id });
        if (order.approval_url) {
          if (!/^https:\/\/(www\.)?sandbox\.paypal\.com\//.test(order.approval_url)) throw new Error('Invalid checkout link.');
          await Linking.openURL(order.approval_url);
          setNotice('After approving in PayPal, hosted web checkout verifies automatically. In the mobile app, return here and tap Verify payment.');
        } else setNotice('This order is ready to verify. Tap Verify payment.');
      } else if (plan.pending_order_id) {
        await capturePlanOrder(plan.pending_order_id);
        await load();
        setNotice('Payment verified. Your full plan is unlocked.');
      }
    } catch (failure) { setNotice(failure instanceof Error ? failure.message : 'Unable to complete checkout. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const back = () => router.canGoBack() ? router.back() : router.replace('/(tabs)');
  if (!plan) return <Screen contentStyle={{ gap: 20 }}>
    <ScreenHeader onBack={back} title={loadError ? 'Plan unavailable' : 'Loading plan…'} />
    {loadError ? <Notice tone="error" action={<Pressable accessibilityRole="button" onPress={() => { void load(); }} style={{ minHeight: 36, justifyContent: 'center' }}><Text style={type.link}>Retry</Text></Pressable>}>{loadError}</Notice> : <ActivityIndicator color={colors.primary} />}
  </Screen>;
  const prefs = plan.preferences;
  const price = plan.pending_amount_cents != null && plan.pending_currency ? money(plan.pending_amount_cents, plan.pending_currency) : money(plan.price_cents, plan.currency);
  return <Screen bottomSafe contentStyle={s.screen}>
    <ScreenHeader onBack={back} eyebrow={plan.generated_by === 'ai' ? 'AI-built plan' : 'Plan · built by fallback rules'} title={plan.title} subtitle={plan.content.summary} />
    <View style={s.tags}>
      <Tag label={goals.find(goal => goal.id === prefs.goal)?.label ?? prefs.goal} tone="primary" />
      <Tag label={prefs.level} />
      {prefs.equipment.map(item => <Tag key={item} label={item === 'Gym' ? 'Full gym' : item} />)}
    </View>
    <View style={s.stats}>
      {[['calendar-outline', '4 weeks', 'Duration'], ['repeat-outline', `${prefs.days_per_week}/wk`, 'Sessions'], ['time-outline', `${prefs.session_minutes} min`, 'Per session']].map(([icon, value, label]) => <View key={label} style={s.stat}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} /><Text style={type.subheading}>{value}</Text><Text style={type.caption}>{label}</Text>
      </View>)}
    </View>
    {!plan.unlocked && <Card tone="highlight" style={{ gap: 14 }}>
      <View style={s.priceRow}>
        <View style={{ gap: 2, flex: 1 }}><Text style={type.overline}>Unlock weeks 2–4</Text><Text style={s.price}>{price}</Text></View>
        <Tag label="Sandbox" tone="warning" />
      </View>
      <Text style={type.small}>One-time PayPal sandbox purchase for this plan. Price set by the server before checkout. No real money, no subscription.</Text>
      {plan.pending_order_id && <Notice tone="warning">Resuming your existing checkout at its saved price.</Notice>}
      <PrimaryButton leadingIcon="logo-paypal" icon={null} loading={busy} disabled={busy} label={busy ? 'Please wait…' : plan.pending_order_id ? 'Resume PayPal checkout' : 'Unlock with PayPal · Sandbox'} onPress={() => { void perform('checkout'); }} />
      {plan.pending_order_id && <PrimaryButton variant="secondary" icon="checkmark" disabled={busy} label="Verify payment" onPress={() => { void perform('verify'); }} />}
    </Card>}
    {plan.unlocked && <Notice tone="success" title="Full plan unlocked">All four weeks are available. Tap any exercise to see its demonstration.</Notice>}
    {notice !== '' && <Notice tone={/verified|unlocked/i.test(notice) ? 'success' : 'info'}>{notice}</Notice>}
    <Notice title="Warm-up">{plan.content.warmup}</Notice>
    {plan.content.weeks.map(week => <WeekCard key={week.week} week={week} badge={!plan.unlocked && week.week === 1 ? 'Free preview' : undefined} />)}
    {plan.locked_weeks.map(week => <LockedWeekCard key={week.week} {...week} />)}
    <Text style={[type.caption, { textAlign: 'center' }]}>{plan.content.note}</Text>
    <PrimaryButton variant="ghost" leadingIcon="refresh" icon={null} label="Build a different plan" onPress={() => router.push('/plan-builder')} />
  </Screen>;
}

const s = StyleSheet.create({
  screen: { gap: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 4, padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  price: { color: colors.text, fontWeight: '800', fontSize: 28, letterSpacing: -0.8, marginTop: 4 },
});
