import { useMemo, useState, type ReactElement } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TextField } from '@/components/TextField';
import { ExerciseRow } from '@/components/ExerciseRow';
import { difficulties, equipmentTypes, exercises as allExercises, filterExercises, muscleGroups, type Exercise } from '@/data/exercises';
import { colors, radii, type } from '@/theme';

type Props = {
  header: ReactElement;
  pool?: Exercise[];
  muscle?: string;
  onMuscleChange?: (value: string) => void;
  bottomSafe?: boolean;
};

export function ExerciseBrowser({ header, pool = allExercises, muscle: controlledMuscle, onMuscleChange, bottomSafe = false }: Props) {
  const [query, setQuery] = useState('');
  const [equipment, setEquipment] = useState('All');
  const [localMuscle, setLocalMuscle] = useState('All');
  const [difficulty, setDifficulty] = useState('All');
  const muscle = controlledMuscle ?? localMuscle;
  const setMuscle = onMuscleChange ?? setLocalMuscle;
  const present = useMemo(() => ({
    muscles: ['All', ...muscleGroups.filter(m => pool.some(e => e.muscle === m))],
    equipment: ['All', ...equipmentTypes.filter(q => pool.some(e => e.equipment === q))],
    difficulty: ['All', ...difficulties.filter(d => pool.some(e => e.difficulty === d))],
  }), [pool]);
  const muscleOptions = useMemo(() => present.muscles.length > 3 && pool.some(e => ['Chest', 'Back', 'Shoulders', 'Arms'].includes(e.muscle)) ? [...present.muscles.slice(0, 1), 'Upper body', ...present.muscles.slice(1)] : present.muscles, [present, pool]);
  const results = useMemo(() => filterExercises(query, equipment, muscle, difficulty, pool), [query, equipment, muscle, difficulty, pool]);
  const filtered = query !== '' || equipment !== 'All' || muscle !== 'All' || difficulty !== 'All';
  const reset = () => { setQuery(''); setEquipment('All'); setMuscle('All'); setDifficulty('All'); };
  return <SafeAreaView style={s.safe} edges={bottomSafe ? ['top', 'bottom'] : ['top']}>
    <FlatList
      data={results}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <ExerciseRow exercise={item} />}
      contentContainerStyle={s.content}
      ItemSeparatorComponent={Separator}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      initialNumToRender={12}
      windowSize={7}
      ListHeaderComponent={<View style={s.header}>
        {header}
        <TextField accessibilityLabel="Search exercises" icon="search" placeholder="Search exercises or muscles" value={query} onChangeText={setQuery} returnKeyType="search" />
        <View style={s.filters}>
          {muscleOptions.length > 2 && <Filter label="Muscle group" options={muscleOptions} value={muscle} onChange={setMuscle} />}
          {present.equipment.length > 2 && <Filter label="Equipment" options={present.equipment} value={equipment} onChange={setEquipment} />}
          {present.difficulty.length > 2 && <Filter label="Difficulty" options={present.difficulty} value={difficulty} onChange={setDifficulty} />}
        </View>
        <View style={s.row}><Text style={type.caption}>{results.length} {results.length === 1 ? 'exercise' : 'exercises'}</Text>{filtered && <Pressable accessibilityRole="button" onPress={reset} style={s.reset}><Ionicons name="close-circle" size={14} color={colors.primary} /><Text style={type.link}>Reset filters</Text></Pressable>}</View>
      </View>}
      ListEmptyComponent={<View style={s.empty}><View style={s.emptyIcon}><Ionicons name="search-outline" size={24} color={colors.muted} /></View><Text style={type.heading}>No matching exercises</Text><Text style={type.small}>Try another search or reset your filters.</Text></View>}
    />
  </SafeAreaView>;
}

const Separator = () => <View style={{ height: 10 }} />;

function Filter({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <View style={s.filter}><Text style={type.overline}>{label}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{options.map(option => <Pressable key={option} accessibilityRole="button" accessibilityLabel={`${label}: ${option}`} accessibilityState={{ selected: option === value }} onPress={() => onChange(option)} style={[s.chip, option === value && s.active]}><Text style={[s.chipText, option === value && s.activeText]}>{option}</Text></Pressable>)}</ScrollView></View>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 },
  header: { gap: 20, marginBottom: 12 },
  filters: { gap: 14 },
  filter: { gap: 8 },
  chips: { gap: 8 },
  chip: { minHeight: 36, paddingHorizontal: 14, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, justifyContent: 'center' },
  active: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  activeText: { color: colors.background },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28, marginBottom: -8 },
  reset: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  empty: { gap: 8, paddingVertical: 40, alignItems: 'center' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
