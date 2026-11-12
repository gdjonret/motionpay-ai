import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Tag } from '@/components/Notice';
import { ExerciseThumb } from '@/components/ExerciseThumb';
import type { Exercise } from '@/data/exercises';
import { colors, radii, type } from '@/theme';

const difficultyTone = { Beginner: 'success', Intermediate: 'warning', Advanced: 'primary' } as const;

export const ExerciseRow = memo(function ExerciseRow({ exercise }: { exercise: Exercise }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${exercise.name}, ${exercise.difficulty}, ${exercise.equipment}`} onPress={() => router.push({ pathname: '/exercise', params: { id: exercise.id } })} style={({ pressed }) => [s.card, pressed && s.pressed]}>
    <ExerciseThumb exerciseId={exercise.id} size={56} />
    <View style={s.copy}>
      <Text style={type.subheading} numberOfLines={1}>{exercise.name}</Text>
      <Text style={type.caption} numberOfLines={1}>{exercise.target && exercise.target !== exercise.muscle ? exercise.target : exercise.muscle} · {exercise.equipment}</Text>
      <View style={s.tags}><Tag label={exercise.difficulty} tone={difficultyTone[exercise.difficulty]} /><Tag label={exercise.gifPath ? 'GIF' : exercise.youtubeVideoId ? 'Video' : exercise.illustration ? 'Illustrated' : 'Demo options'} /></View>
    </View>
    <Ionicons name="chevron-forward" size={18} color={colors.muted} />
  </Pressable>;
});

export { difficultyTone };

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg },
  pressed: { backgroundColor: colors.surfaceRaised },
  copy: { flex: 1, gap: 4 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 4 },
});
