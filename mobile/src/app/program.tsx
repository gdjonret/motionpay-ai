import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Notice, Tag } from '@/components/Notice';
import { featuredProgram } from '@/data/programs';
import { colors, radii, type } from '@/theme';
import { useAuth } from '@/components/AuthProvider';
import { paymentRequest, priceLabel, type ProgramContent } from '@/services/payments';
import { useProgram } from '@/hooks/useProgram';
import { exercises } from '@/data/exercises';

export default function ProgramScreen() {
  const { session } = useAuth();
  return <AccountProgram key={session?.user.id || 'guest'} />;
}

function AccountProgram() {
  const { session, loading } = useAuth();
  const { access, setAccess, summary, error: accessError, loading: accessLoading, refresh } = useProgram(session?.user.id);
  const [content, setContent] = useState<ProgramContent | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const perform = async (action: 'checkout' | 'verify' | 'content') => {
    if (lock.current) return;
    if (!session) { router.push({ pathname: '/sign-in', params: { next: 'program' } }); return; }
    if (accessError || accessLoading || !summary || !access) { refresh(); return; }
    lock.current = true; setBusy(true); setNotice('');
    try {
      if (action === 'checkout') {
        const order = await paymentRequest<{ order_id: string; approval_url: string | null }>('/api/paypal/orders', 'POST');
        setAccess({ unlocked: false, pending_order_id: order.order_id });
        if (order.approval_url) {
          if (!/^https:\/\/(www\.)?sandbox\.paypal\.com\//.test(order.approval_url)) throw new Error('Invalid checkout link.');
          await Linking.openURL(order.approval_url);
          setNotice('After approving in PayPal, hosted web checkout verifies automatically. In the mobile app, return here and tap Verify payment.');
        } else setNotice('This order is ready to verify. Tap Verify payment.');
      } else if (action === 'verify' && access?.pending_order_id) {
        await paymentRequest(`/api/paypal/orders/${encodeURIComponent(access.pending_order_id)}/capture`, 'POST');
        setAccess({ unlocked: true, pending_order_id: null });
        setNotice('Payment verified. Your program is unlocked.');
      } else if (action === 'content') {
        setContent(await paymentRequest<ProgramContent>('/api/programs/beginner-strength/content'));
      }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Unable to complete checkout. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const price = access?.pending_amount_cents != null ? `${(access.pending_amount_cents / 100).toFixed(2)} ${access.pending_currency}` : summary ? priceLabel(summary) : 'Checking current price…';
  const waiting = busy || loading || Boolean(session && accessLoading);
  return <Screen bottomSafe contentStyle={s.screen}>
    <ScreenHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} eyebrow="Training program · PayPal Sandbox" title={featuredProgram.title} subtitle={featuredProgram.description} />
    <View style={s.stats}>
      {[['time-outline', 'Duration', featuredProgram.duration], ['repeat-outline', 'Frequency', featuredProgram.frequency.replace(' / week', '/wk')], ['body-outline', 'Level', 'Beginner']].map(([icon, label, value]) => <View key={label} style={s.stat}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} /><Text style={type.subheading}>{value}</Text><Text style={type.caption}>{label}</Text></View>)}
    </View>
    <Card style={{ gap: 14 }}>
      <Text style={type.heading}>What’s included</Text>
      {featuredProgram.includes.map(item => <View key={item} style={s.item}><Ionicons name="checkmark-circle" size={20} color={colors.success} /><Text style={[type.small, { flex: 1 }]}>{item}</Text></View>)}
    </Card>
    <Card tone="highlight" style={{ gap: 14 }}>
      <View style={s.priceRow}><View style={{ gap: 2, flex: 1 }}><Text style={type.overline}>One-time program access</Text><Text style={s.price}>{price}</Text></View>{access?.unlocked ? <Tag label="Unlocked" tone="success" /> : <Tag label="Sandbox" tone="warning" />}</View>
      <Text style={type.small}>Sandbox test only. No real money. No recurring subscription.</Text>
      {access?.pending_order_id && <Notice tone="warning">Resuming your existing checkout at its saved price.</Notice>}
      <PrimaryButton leadingIcon={access?.unlocked ? 'lock-open-outline' : session ? 'logo-paypal' : 'log-in-outline'} icon={null} disabled={busy || loading || Boolean(session && (accessLoading || accessError || !access || !summary))} loading={waiting} label={waiting ? 'Please wait…' : access?.unlocked ? 'Open your program' : session ? access?.pending_order_id ? 'Resume PayPal checkout' : 'Continue to PayPal · Sandbox' : 'Sign in to purchase'} onPress={() => { void perform(access?.unlocked ? 'content' : 'checkout'); }} />
      {access?.pending_order_id && !access.unlocked && <PrimaryButton variant="secondary" icon="checkmark" disabled={busy} label="Verify payment" onPress={() => { void perform('verify'); }} />}
    </Card>
    {accessError !== '' && <Notice tone="error" action={<Pressable onPress={refresh} accessibilityRole="button" style={{ minHeight: 36, justifyContent: 'center' }}><Text style={type.link}>Retry program access check</Text></Pressable>}>{accessError}</Notice>}
    {notice !== '' && <Notice tone={/verified|unlocked/i.test(notice) ? 'success' : 'info'}>{notice}</Notice>}
    {session && content && <View style={{ gap: 16 }}>
      <View style={{ gap: 6 }}><Text style={type.title}>{content.title}</Text><Text style={type.small}>{content.note}</Text></View>
      <Notice title="Warm-up">{content.warmup}</Notice>
      {content.weeks.map(week => <Card key={week.week} style={{ gap: 14 }}>
        <View style={s.weekHead}><View style={s.weekBadge}><Text style={s.weekNum}>{week.week}</Text></View><View style={{ flex: 1 }}><Text style={type.overline}>Week {week.week}</Text><Text style={type.heading}>{week.focus}</Text></View></View>
        {week.sessions.map(day => <View key={day.day} style={s.session}>
          <Text style={[type.subheading, { color: colors.accent }]}>{day.day}</Text>
          {day.exercises.map(item => <Pressable key={item.exercise_id} accessibilityRole="button" style={({ pressed }) => [s.exercise, pressed && { backgroundColor: colors.surfaceRaised }]} onPress={() => router.push({ pathname: '/exercise', params: { id: item.exercise_id } })}>
            <View style={{ flex: 1, gap: 2 }}><Text style={[type.subheading, { fontWeight: '500' }]}>{exercises.find(exercise => exercise.id === item.exercise_id)?.name || 'Exercise'}</Text><Text style={type.caption}>{item.prescription}</Text></View>
            <View style={s.play}><Ionicons name="play" size={12} color={colors.primary} /></View>
          </Pressable>)}
        </View>)}
        <Text style={type.caption}>{week.guidance}</Text>
      </Card>)}
    </View>}
    <PrimaryButton variant="ghost" leadingIcon="chatbubble-ellipses-outline" icon={null} label="Ask the coach about an exercise" onPress={() => router.push('/(tabs)/coach')} />
  </Screen>;
}
const s = StyleSheet.create({
  screen: { gap: 20 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, gap: 4, padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  item: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  price: { color: colors.text, fontWeight: '800', fontSize: 28, letterSpacing: -0.8, marginTop: 4 },
  weekHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  weekBadge: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  weekNum: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  session: { gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  exercise: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginHorizontal: -10, borderRadius: radii.sm },
  play: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
