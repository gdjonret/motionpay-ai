import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SectionHeader } from '@/components/SectionHeader';
import { ExerciseBrowser } from '@/components/ExerciseBrowser';
import { CollectionCard } from '@/components/CollectionCard';
import { collections } from '@/data/collections';
import { exercises, muscleGroups } from '@/data/exercises';

const linkable: readonly string[] = [...muscleGroups, 'Upper body'];

export default function LibraryScreen() {
  const params = useLocalSearchParams<{ muscle?: string }>();
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const muscle = params.muscle && linkable.includes(params.muscle) ? params.muscle : selectedMuscle;
  const setMuscle = (value: string) => { setSelectedMuscle(value); router.setParams({ muscle: undefined }); };
  return <ExerciseBrowser muscle={muscle} onMuscleChange={setMuscle} header={<View style={s.header}>
    <ScreenHeader eyebrow="Library" title="Exercises" subtitle={`${exercises.length} movements with illustrated demonstrations and form cues.`} />
    <View style={s.section}>
      <SectionHeader title="Collections" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.carousel} style={s.bleed}>
        {collections.map(collection => <CollectionCard key={collection.id} collection={collection} />)}
      </ScrollView>
    </View>
    <SectionHeader title="All exercises" />
  </View>} />;
}

const s = StyleSheet.create({
  header: { gap: 20 },
  section: { gap: 8 },
  bleed: { marginHorizontal: -20 },
  carousel: { gap: 10, paddingHorizontal: 20 },
});
