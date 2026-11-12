import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Tag } from '@/components/Notice';
import { ExerciseThumb } from '@/components/ExerciseThumb';
import { exercises } from '@/data/exercises';
import type { ProgramContent } from '@/services/payments';
import { colors, radii, type } from '@/theme';

export function WeekCard({ week, badge }: { week: ProgramContent['weeks'][number]; badge?: string }) {
  return <Card style={{ gap: 14 }}>
    <View style={s.head}>
      <View style={s.badge}><Text style={s.num}>{week.week}</Text></View>
      <View style={{ flex: 1 }}><Text style={type.overline}>Week {week.week}</Text><Text style={type.heading}>{week.focus}</Text></View>
      {badge && <Tag label={badge} tone="success" />}
    </View>
    {week.sessions.map(day => <View key={day.day} style={s.session}>
      <Text style={[type.subheading, { color: colors.accent }]}>{day.day}</Text>
      {day.exercises.map(item => <Pressable key={item.exercise_id} accessibilityRole="button" style={({ pressed }) => [s.exercise, pressed && { backgroundColor: colors.surfaceRaised }]} onPress={() => router.push({ pathname: '/exercise', params: { id: item.exercise_id } })}>
        <ExerciseThumb exerciseId={item.exercise_id} size={44} />
        <View style={{ flex: 1, gap: 2 }}><Text style={[type.subheading, { fontWeight: '500' }]}>{exercises.find(exercise => exercise.id === item.exercise_id)?.name || 'Exercise'}</Text><Text style={type.caption}>{item.prescription}</Text></View>
        <View style={s.play}><Ionicons name="play" size={12} color={colors.primary} /></View>
      </Pressable>)}
    </View>)}
    {week.guidance !== '' && <Text style={type.caption}>{week.guidance}</Text>}
  </Card>;
}

export function LockedWeekCard({ week, focus, sessions }: { week: number; focus: string; sessions: number }) {
  return <View style={s.locked}>
    <View style={[s.badge, { backgroundColor: colors.surfaceRaised }]}><Ionicons name="lock-closed" size={16} color={colors.muted} /></View>
    <View style={{ flex: 1 }}><Text style={type.overline}>Week {week}</Text><Text style={[type.subheading, { color: colors.textSecondary }]}>{focus}</Text></View>
    <Text style={type.caption}>{sessions} sessions</Text>
  </View>;
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  num: { color: colors.accent, fontWeight: '800', fontSize: 16 },
  session: { gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  exercise: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, marginHorizontal: -10, borderRadius: radii.sm },
  play: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong },
});
