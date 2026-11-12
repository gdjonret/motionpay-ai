import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ExerciseBrowser } from '@/components/ExerciseBrowser';
import { BackButton } from '@/components/ScreenHeader';
import { getCollection } from '@/data/collections';
import { colors, radii, type } from '@/theme';

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const collection = getCollection(id);
  if (!collection) return <Redirect href="/(tabs)/library" />;
  const counts = (['Beginner', 'Intermediate', 'Advanced'] as const).map(level => [level, collection.exercises.filter(e => e.difficulty === level).length] as const).filter(([, n]) => n > 0);
  return <ExerciseBrowser key={collection.id} bottomSafe pool={collection.exercises} header={<View style={s.header}>
    <BackButton label="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/library')} />
    <View style={[s.hero, { borderColor: `${collection.tint}55` }]}>
      <View style={[s.icon, { backgroundColor: `${collection.tint}1F` }]}><Ionicons name={collection.icon} size={26} color={collection.tint} /></View>
      <View style={{ gap: 6 }}>
        <Text style={[type.overline, { color: collection.tint }]}>Collection</Text>
        <Text accessibilityRole="header" style={type.title}>{collection.title}</Text>
        <Text style={type.body}>{collection.description}</Text>
      </View>
      <View style={s.stats}>
        <View style={s.stat}><Text style={s.statValue}>{collection.exercises.length}</Text><Text style={type.caption}>Exercises</Text></View>
        {counts.map(([level, n]) => <View key={level} style={s.stat}><Text style={s.statValue}>{n}</Text><Text style={type.caption}>{level}</Text></View>)}
      </View>
    </View>
  </View>} />;
}

const s = StyleSheet.create({
  header: { gap: 18 },
  hero: { gap: 16, padding: 18, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: 1 },
  icon: { width: 52, height: 52, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  stat: { flex: 1, gap: 2 },
  statValue: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
});
