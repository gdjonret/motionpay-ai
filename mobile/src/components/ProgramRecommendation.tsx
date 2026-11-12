import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/components/AuthProvider';
import { Tag } from '@/components/Notice';
import { featuredProgram } from '@/data/programs';
import { priceLabel } from '@/services/payments';
import { useProgram } from '@/hooks/useProgram';
import { colors, radii, type } from '@/theme';

export function ProgramRecommendation() {
  const { session } = useAuth();
  return <AccountRecommendation key={session?.user.id || 'guest'} userId={session?.user.id} />;
}

function AccountRecommendation({ userId }: { userId?: string }) {
  const { summary, access, error, loading, refresh } = useProgram(userId);
  const owned = access?.unlocked;
  const status = loading ? 'Checking program details…' : error ? 'Access could not be checked. Open details or retry.' : owned ? 'Access already unlocked for your account.' : summary ? `${priceLabel(summary)} · one-time sandbox purchase · no real money` : 'View current price and contents on the program screen.';
  return <View style={s.card}>
    <Pressable accessibilityRole="button" onPress={() => router.push('/program')} style={({ pressed }) => [s.main, pressed && { opacity: 0.85 }]}>
      <View style={s.top}>
        <View style={s.icon}><Ionicons name="barbell" size={22} color={colors.primary} /></View>
        <Tag label={owned ? 'Unlocked' : 'Optional program'} tone={owned ? 'success' : 'primary'} />
      </View>
      <View style={{ gap: 4 }}>
        <Text style={type.heading}>{featuredProgram.title}</Text>
        <Text style={type.small}>{featuredProgram.description}</Text>
      </View>
      <View style={s.meta}>
        {[['time-outline', featuredProgram.duration], ['repeat-outline', featuredProgram.frequency], ['body-outline', 'Dumbbells + bodyweight']].map(([icon, label]) => <View key={label} style={s.metaItem}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={14} color={colors.muted} /><Text style={type.caption}>{label}</Text></View>)}
      </View>
      <View style={s.footer}>
        <Text style={[type.small, { flex: 1, color: owned ? colors.success : colors.textSecondary }]}>{status}</Text>
        <View style={s.cta}><Text style={s.ctaText}>{loading || error ? 'Details' : owned ? 'Open' : 'View'}</Text><Ionicons name="arrow-forward" size={14} color={colors.onPrimary} /></View>
      </View>
    </Pressable>
    {!owned && <Text style={[type.caption, s.hint]}>Review the contents and price before choosing PayPal checkout.</Text>}
    {error !== '' && <Pressable accessibilityRole="button" onPress={refresh} style={s.retry}><Ionicons name="refresh" size={14} color={colors.primary} /><Text style={type.link}>Retry access check</Text></Pressable>}
  </View>;
}

const s = StyleSheet.create({
  card: { borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  main: { padding: 18, gap: 14 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  icon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 14, minHeight: 36, borderRadius: radii.pill },
  ctaText: { color: colors.onPrimary, fontWeight: '700', fontSize: 13 },
  hint: { paddingHorizontal: 18, paddingBottom: 16, marginTop: -4 },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 18, borderTopWidth: 1, borderTopColor: colors.border },
});
