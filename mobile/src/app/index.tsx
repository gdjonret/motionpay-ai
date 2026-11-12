import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { Brand } from '@/components/Brand';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { WelcomeArtwork } from '@/components/WelcomeArtwork';
import { colors, radii, type } from '@/theme';
import { useAuth } from '@/components/AuthProvider';

const features = [
  { icon: 'play-circle-outline', title: 'Exercise demos', body: 'Visual demonstrations with step-by-step form cues.' },
  { icon: 'calendar-outline', title: 'Guided training', body: 'A structured four-week beginner strength program.' },
  { icon: 'shield-checkmark-outline', title: 'Secure checkout', body: 'Unlock programs with PayPal. Sandbox, no real money.' },
] as const;

export default function WelcomeScreen() {
  const { session, loading } = useAuth();
  if (loading) return <View style={s.loading}><Brand /><ActivityIndicator color={colors.primary} /><Text style={type.caption}>Restoring your account…</Text></View>;
  if (session) return <Redirect href="/(tabs)" />;
  return <Screen bottomSafe contentStyle={s.screen}>
    <View style={s.brand}><Brand /></View>
    <View style={s.hero}>
      <WelcomeArtwork />
      <LinearGradient colors={['transparent', colors.background]} style={s.fade} />
    </View>
    <View style={s.copy}>
      <Text style={[type.overline, { color: colors.primary }]}>AI fitness coach</Text>
      <Text style={s.title}>Learn every move.{'\n'}Train with confidence.</Text>
      <Text style={[type.body, s.center]}>Ask about any exercise, see a clear demonstration, and follow a guided program built for beginners.</Text>
    </View>
    <View style={s.features}>{features.map((f, i) => <Pressable key={f.title} accessibilityRole="button" onPress={() => router.push({ pathname: '/onboarding', params: { step: i } })} style={({ pressed }) => [s.feature, pressed && s.pressed]}>
      <View style={s.icon}><Ionicons name={f.icon} size={20} color={colors.primary} /></View>
      <View style={s.featureCopy}><Text style={type.subheading}>{f.title}</Text><Text style={type.small}>{f.body}</Text></View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>)}</View>
    <View style={s.actions}>
      <PrimaryButton label="Get started" onPress={() => router.push('/onboarding')} />
      <PrimaryButton variant="ghost" icon={null} label="I already have an account" onPress={() => router.push('/sign-in')} />
    </View>
  </Screen>;
}
const s = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 },
  screen: { paddingHorizontal: 20, gap: 24, paddingBottom: 12 },
  brand: { alignItems: 'center', paddingTop: 8 },
  hero: { borderRadius: radii.xl, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 80 },
  copy: { gap: 10, alignItems: 'center', marginTop: -8 },
  title: { ...type.display, fontSize: 30, lineHeight: 36, textAlign: 'center' },
  center: { textAlign: 'center', maxWidth: 340 },
  features: { gap: 10 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pressed: { backgroundColor: colors.surfaceRaised },
  icon: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  featureCopy: { flex: 1, gap: 2 },
  actions: { gap: 6 },
});
