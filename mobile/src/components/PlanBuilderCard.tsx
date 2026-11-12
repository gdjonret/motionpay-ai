import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, type } from '@/theme';

export function PlanBuilderCard({ compact = false }: { compact?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel="Build my AI plan" onPress={() => router.push('/plan-builder')} style={({ pressed }) => [s.wrap, pressed && { opacity: 0.9 }]}>
    <LinearGradient colors={['rgba(76,141,255,0.22)', 'rgba(124,196,255,0.06)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.card, compact && s.compact]}>
      <View style={s.top}>
        <View style={s.icon}><Ionicons name="sparkles" size={20} color={colors.onPrimary} /></View>
        <View style={s.pill}><Ionicons name="logo-paypal" size={12} color={colors.accent} /><Text style={s.pillText}>Unlock with PayPal</Text></View>
      </View>
      <View style={{ gap: 4 }}>
        <Text style={type.heading}>Build my AI plan</Text>
        <Text style={type.small}>Get a 4-week plan for your goals, schedule, and equipment. Preview week 1 free.</Text>
      </View>
      <View style={s.cta}><Text style={s.ctaText}>Start building</Text><Ionicons name="arrow-forward" size={16} color={colors.onPrimary} /></View>
    </LinearGradient>
  </Pressable>;
}

const s = StyleSheet.create({
  wrap: { borderRadius: radii.xl, overflow: 'hidden', borderWidth: 1, borderColor: colors.primaryBorder },
  card: { padding: 18, gap: 14, backgroundColor: colors.surface },
  compact: { padding: 14, gap: 10 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: radii.pill, backgroundColor: 'rgba(10,12,17,0.6)', borderWidth: 1, borderColor: colors.border },
  pillText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, paddingHorizontal: 16, minHeight: 40, borderRadius: radii.pill },
  ctaText: { color: colors.onPrimary, fontWeight: '700', fontSize: 14 },
});
