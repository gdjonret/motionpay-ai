import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { TextField } from '@/components/TextField';
import { Notice } from '@/components/Notice';
import { useAuth } from '@/components/AuthProvider';
import { createPlan, estimatePrice, goals, levels, planEquipment, sessionLengths, type PlanRequest } from '@/services/plans';
import { colors, radii, type } from '@/theme';

const steps = ['Reading your goal and schedule…', 'Filtering 300+ exercises by your equipment…', 'Balancing push, pull, legs and core…', 'Writing your weekly progression…'];

export default function PlanBuilderScreen() {
  const { session, loading } = useAuth();
  const [goal, setGoal] = useState<PlanRequest['goal']>('strength');
  const [level, setLevel] = useState<PlanRequest['level']>('Beginner');
  const [days, setDays] = useState(3);
  const [equipment, setEquipment] = useState<PlanRequest['equipment']>(['Bodyweight', 'Dumbbells']);
  const [minutes, setMinutes] = useState<PlanRequest['session_minutes']>(30);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setStep(value => Math.min(value + 1, steps.length - 1)), 1400);
    return () => clearInterval(timer);
  }, [busy]);
  const toggle = (item: PlanRequest['equipment'][number]) => setEquipment(current => current.includes(item) ? current.length > 1 ? current.filter(value => value !== item) : current : [...current, item]);
  const build = async () => {
    if (busy) return;
    if (!session) { router.push({ pathname: '/sign-in', params: { next: 'plan-builder' } }); return; }
    setBusy(true); setStep(0); setError('');
    try {
      const plan = await createPlan({ goal, level, days_per_week: days, equipment, session_minutes: minutes, notes: notes.trim() || undefined });
      if (mounted.current) router.replace({ pathname: '/plan', params: { id: plan.id } });
    } catch (failure) { if (mounted.current) setError(failure instanceof Error ? failure.message : 'Unable to build your plan. Please try again.'); }
    finally { if (mounted.current) setBusy(false); }
  };
  if (busy) return <View style={s.building}>
    <View style={s.orb}><ActivityIndicator size="large" color={colors.primary} /></View>
    <Text style={[type.title, { textAlign: 'center' }]}>Building your plan</Text>
    <View style={{ gap: 10, alignSelf: 'stretch' }}>{steps.map((label, index) => <View key={label} style={s.stepRow}>
      <Ionicons name={index < step ? 'checkmark-circle' : index === step ? 'ellipse' : 'ellipse-outline'} size={18} color={index <= step ? colors.primary : colors.muted} />
      <Text style={[type.small, index > step && { color: colors.muted }]}>{label}</Text>
    </View>)}</View>
  </View>;
  return <Screen bottomSafe contentStyle={s.screen}>
    <ScreenHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} eyebrow="AI plan builder" title="Build your 4-week plan" subtitle="Answer a few questions. The coach picks exercises from the library, balances your week, and writes your progression." />
    <Section label="Your goal">
      <View style={s.grid}>{goals.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: goal === item.id }} onPress={() => setGoal(item.id)} style={[s.goal, goal === item.id && s.selected]}>
        <Ionicons name={item.icon} size={20} color={goal === item.id ? colors.primary : colors.textSecondary} />
        <Text style={[s.goalText, goal === item.id && { color: colors.text }]}>{item.label}</Text>
      </Pressable>)}</View>
    </Section>
    <Section label="Experience level"><Chips options={levels} value={level} onChange={setLevel} /></Section>
    <Section label="Days per week"><Chips options={[2, 3, 4, 5] as const} value={days} onChange={setDays} format={value => `${value} days`} /></Section>
    <Section label="Session length"><Chips options={sessionLengths} value={minutes} onChange={setMinutes} format={value => `${value} min`} /></Section>
    <Section label="Equipment you have">
      <View style={s.wrap}>{planEquipment.map(item => <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked: equipment.includes(item) }} onPress={() => toggle(item)} style={[s.chip, equipment.includes(item) && s.chipActive]}>
        {equipment.includes(item) && <Ionicons name="checkmark" size={14} color={colors.background} />}
        <Text style={[s.chipText, equipment.includes(item) && s.chipTextActive]}>{item === 'Gym' ? 'Full gym' : item}</Text>
      </Pressable>)}</View>
    </Section>
    <TextField label="Anything else? (optional)" icon="create-outline" value={notes} onChangeText={setNotes} maxLength={200} placeholder="e.g. short on time, prefer home workouts" />
    {error !== '' && <Notice tone="error">{error}</Notice>}
    <View style={s.price}>
      <View style={{ flex: 1, gap: 2 }}><Text style={type.overline}>Full plan unlock</Text><Text style={s.priceValue}>{estimatePrice(days).toFixed(2)} USD</Text><Text style={type.caption}>Week 1 preview is free · PayPal Sandbox · no real money</Text></View>
      <Ionicons name="logo-paypal" size={28} color={colors.primary} />
    </View>
    <PrimaryButton disabled={loading} leadingIcon="sparkles" icon={null} label={session ? 'Build my plan' : 'Sign in to build your plan'} onPress={() => { void build(); }} />
  </Screen>;
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={{ gap: 10 }}><Text style={type.overline}>{label}</Text>{children}</View>;
}

function Chips<T extends string | number>({ options, value, onChange, format = String }: { options: readonly T[]; value: T; onChange: (value: T) => void; format?: (value: T) => string }) {
  return <View style={s.wrap}>{options.map(option => <Pressable key={String(option)} accessibilityRole="button" accessibilityState={{ selected: option === value }} onPress={() => onChange(option)} style={[s.chip, option === value && s.chipActive]}>
    <Text style={[s.chipText, option === value && s.chipTextActive]}>{format(option)}</Text>
  </Pressable>)}</View>;
}

const s = StyleSheet.create({
  screen: { gap: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  goal: { width: '48.5%', minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  goalText: { color: colors.textSecondary, fontWeight: '600', fontSize: 14, flexShrink: 1 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  chipTextActive: { color: colors.background },
  price: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  priceValue: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  building: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32 },
  orb: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primaryBorder, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
