import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { Collection } from '@/data/collections';
import { colors, radii, type } from '@/theme';

export function CollectionCard({ collection, width = 168 }: { collection: Collection; width?: number }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${collection.title} collection, ${collection.exercises.length} exercises`} onPress={() => router.push({ pathname: '/collection', params: { id: collection.id } })} style={({ pressed }) => [s.card, { width }, pressed && s.pressed]}>
    <View style={[s.icon, { backgroundColor: `${collection.tint}1F` }]}><Ionicons name={collection.icon} size={20} color={collection.tint} /></View>
    <View style={s.copy}>
      <Text style={type.subheading} numberOfLines={2}>{collection.title}</Text>
      <Text style={type.caption}>{collection.exercises.length} exercises</Text>
    </View>
    <View style={[s.bar, { backgroundColor: collection.tint }]} />
  </Pressable>;
}

const s = StyleSheet.create({
  card: { minHeight: 136, padding: 14, gap: 12, justifyContent: 'space-between', borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  pressed: { backgroundColor: colors.surfaceRaised },
  icon: { width: 38, height: 38, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  copy: { gap: 4 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, opacity: 0.8 },
});
