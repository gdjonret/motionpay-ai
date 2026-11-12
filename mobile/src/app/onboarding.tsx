import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { WelcomeArtwork } from '@/components/WelcomeArtwork';
import { BackButton } from '@/components/ScreenHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radii, type } from '@/theme';

const slides = [
  { eyebrow: 'Step 1 · Learn', title: 'Watch exercise demos', body: 'Learn each exercise with videos and GIFs from your exercise library.' },
  { eyebrow: 'Step 2 · Train', title: 'Guided strength training', body: 'Explore a four-week beginner template with three sessions per week.' },
  { eyebrow: 'Step 3 · Unlock', title: 'PayPal Sandbox', body: 'Review a program, approve a test purchase, and unlock access. No real money.' },
];
export default function OnboardingScreen() {
  const { step } = useLocalSearchParams<{ step?: string }>();
  const [index, setIndex] = useState(() => Math.max(0, Math.min(2, Number(step) || 0)));
  return <Screen bottomSafe contentStyle={s.screen}>
    <View style={s.top}>
      <BackButton label="Previous screen" onPress={() => index > 0 ? setIndex(index - 1) : router.back()} />
      <View style={s.progress}>{slides.map((_, i) => <Pressable key={i} accessibilityRole="button" accessibilityLabel={`Onboarding step ${i + 1}`} accessibilityState={{ selected: index === i }} onPress={() => setIndex(i)} style={s.segmentTouch}><View style={[s.segment, i <= index && s.segmentActive]} /></Pressable>)}</View>
      <Pressable accessibilityRole="button" onPress={() => router.replace('/sign-in')} style={s.skip}><Text style={[type.small, { fontWeight: '600' }]}>Skip</Text></Pressable>
    </View>
    <View style={s.visual}>
      {index === 0 && <View style={s.demo}><View style={s.demoFrame}><WelcomeArtwork squat /></View><Text style={[type.caption, s.center]}>Illustrative preview · Ask the coach to open a working demonstration.</Text></View>}
      {index === 1 && <View style={s.card}>
        <View style={s.cardHead}><Text style={type.heading}>Glute Builder Plan</Text><Text style={type.caption}>Day 1</Text></View>
        {[['Dumbbell Squat', '3 × 12'], ['Hip Thrust', '3 × 12'], ['RDL', '3 × 10']].map(([name, reps]) => <View key={name} style={s.exercise}><View style={{ flex: 1 }}><Text style={type.subheading}>{name}</Text><Text style={type.caption}>{reps}</Text></View><Ionicons name="checkmark-circle" size={20} color={colors.success} /></View>)}
      </View>}
      {index === 2 && <View style={s.card}>
        <View style={s.paypalBrand}><View style={s.paypalIcon}><Ionicons name="logo-paypal" size={26} color={colors.primary} /></View><View><Text style={type.heading}>PayPal</Text><Text style={type.caption}>Sandbox checkout</Text></View></View>
        {['Secure payments', 'Instant program access', 'Review before you pay'].map(item => <View key={item} style={s.check}><Ionicons name="checkmark-circle" size={20} color={colors.success} /><Text style={type.subheading}>{item}</Text></View>)}
      </View>}
    </View>
    <View style={s.copy}>
      <Text style={[type.overline, { color: colors.primary }]}>{slides[index].eyebrow}</Text>
      <Text style={[type.title, s.center]}>{slides[index].title}</Text>
      <Text style={[type.body, s.center]}>{slides[index].body}</Text>
    </View>
    <PrimaryButton accessibilityLabel={index === 2 ? 'Finish onboarding' : 'Next onboarding step'} label={index === 2 ? 'Create your account' : 'Continue'} onPress={() => index < 2 ? setIndex(index + 1) : router.replace('/sign-in')} />
  </Screen>;
}
const s = StyleSheet.create({
  screen: { gap: 28, paddingBottom: 16 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  segmentTouch: { flex: 1, minHeight: 44, justifyContent: 'center' },
  segment: { height: 4, borderRadius: 2, backgroundColor: colors.border },
  segmentActive: { backgroundColor: colors.primary },
  skip: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  visual: { flex: 1, minHeight: 320, justifyContent: 'center', alignItems: 'center' },
  demo: { width: '100%', alignItems: 'center', gap: 14 },
  demoFrame: { width: '72%', borderRadius: radii.xl, padding: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  center: { textAlign: 'center' },
  card: { width: '100%', borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 20, gap: 16 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  exercise: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  paypalBrand: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  paypalIcon: { width: 52, height: 52, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { alignItems: 'center', gap: 10, paddingHorizontal: 8 },
});
