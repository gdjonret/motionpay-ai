import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Notice, Tag } from '@/components/Notice';
import { ExerciseDemonstration } from '@/components/ExerciseDemonstration';
import { difficultyTone } from '@/components/ExerciseRow';
import { exercises } from '@/data/exercises';
import { colors, type } from '@/theme';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const exercise = exercises.find(item => item.id === id);
  if (!id) return <Redirect href="/(tabs)/library" />;
  const back = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/library');
  return <Screen bottomSafe contentStyle={s.screen}>
    {!exercise ? <>
      <ScreenHeader onBack={back} backLabel="Exercise library" title="Exercise not found" subtitle="Choose an exercise from the library to view its details." />
    </> : <>
      <ScreenHeader onBack={back} backLabel="Exercise library" eyebrow={exercise.target ?? exercise.muscle} title={exercise.name} />
      <View style={s.tags}><Tag label={exercise.muscle} tone="primary" /><Tag label={exercise.equipment} /><Tag label={exercise.difficulty} tone={difficultyTone[exercise.difficulty]} /></View>
      <ExerciseDemonstration key={exercise.id} exercise={exercise} />
      <Card style={{ gap: 14 }}>
        <Text style={type.heading}>Movement instructions</Text>
        {exercise.instructions.map((instruction, i) => <View key={instruction} style={s.step}><Text style={s.number}>{i + 1}</Text><Text style={[type.body, s.instruction]}>{instruction}</Text></View>)}
      </Card>
      {exercise.reviewStatus === 'draft' && <Notice tone="warning">Draft exercise entry · Content review pending</Notice>}
    </>}
  </Screen>;
}
const s = StyleSheet.create({
  screen: { gap: 20 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: -6 },
  step: { flexDirection: 'row', gap: 12 },
  number: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primarySoft, color: colors.accent, fontWeight: '700', fontSize: 13, textAlign: 'center', lineHeight: 26, overflow: 'hidden' },
  instruction: { flex: 1 },
});
