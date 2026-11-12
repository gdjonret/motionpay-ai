import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Brand } from '@/components/Brand';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { WelcomeArtwork } from '@/components/WelcomeArtwork';
import { ProgramRecommendation } from '@/components/ProgramRecommendation';
import { PlanBuilderCard } from '@/components/PlanBuilderCard';
import { useAuth } from '@/components/AuthProvider';
import { CollectionCard } from '@/components/CollectionCard';
import { collections } from '@/data/collections';
import { exercises } from '@/data/exercises';
import { colors, radii, type } from '@/theme';

const count = (match: (muscle: string) => boolean) => exercises.filter(e => match(e.muscle)).length;
const categories = [
  { name: 'Legs', icon: 'walk-outline', muscle: 'Legs', hint: `${count(m => m === 'Legs')} moves` },
  { name: 'Glutes', icon: 'fitness-outline', muscle: 'Glutes', hint: `${count(m => m === 'Glutes')} moves` },
  { name: 'Upper body', icon: 'barbell-outline', muscle: 'Upper body', hint: `${count(m => ['Chest', 'Back', 'Shoulders', 'Arms'].includes(m))} moves` },
] as const;

export default function HomeScreen() {
  const { session } = useAuth();
  const [prompt, setPrompt] = useState('');
  const ask = (question: string) => {
    if (!question.trim()) return;
    router.push({ pathname: '/(tabs)/coach', params: { question: question.trim(), requestId: `${Date.now()}` } });
    setPrompt('');
  };
  const initial = session?.user.email?.slice(0, 1).toUpperCase();
  return <Screen contentStyle={s.screen}>
    <View style={s.header}>
      <Brand compact />
      <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => router.push('/(tabs)/profile')} style={s.avatar}>
        {initial ? <Text style={s.avatarText}>{initial}</Text> : <Ionicons name="person-outline" size={18} color={colors.textSecondary} />}
      </Pressable>
    </View>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open AI Coach"
      onPress={() => router.push('/(tabs)/coach')}
      style={({ pressed }) => [s.hero, pressed && s.heroPressed]}
    >
      <WelcomeArtwork />
      <LinearGradient
        colors={['transparent', 'rgba(10,12,17,0.44)', 'rgba(10,12,17,0.98)']}
        locations={[0, 0.48, 1]}
        style={s.heroOverlay}
      />
      <View style={s.heroContent}>
        <View style={s.heroCopy}>
          <Text style={s.heroLabel}>AI Coach</Text>
          <Text accessibilityRole="header" style={s.heroTitle}>See how it’s done.</Text>
          <Text style={s.heroSubtitle}>Ask for a movement and see it in action.</Text>
        </View>
        <View style={s.heroCta}><Ionicons name="arrow-forward" size={19} color={colors.onPrimary} /></View>
      </View>
    </Pressable>
    <View style={s.askGroup}>
      <View style={s.askBox}>
        <Ionicons name="sparkles" size={18} color={colors.primary} />
        <TextInput accessibilityLabel="Ask about an exercise" value={prompt} onChangeText={setPrompt} placeholder="Ask about an exercise…" placeholderTextColor={colors.muted} style={s.input} returnKeyType="send" onSubmitEditing={() => ask(prompt)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Send exercise question" disabled={!prompt.trim()} onPress={() => ask(prompt)} style={[s.send, !prompt.trim() && s.dim]}><Ionicons name="arrow-up" size={18} color={colors.onPrimary} /></Pressable>
      </View>
      <View style={s.chipRow}>{['Show me a squat', 'How do I do an RDL?'].map(question => <Pressable key={question} accessibilityRole="button" onPress={() => ask(question)} style={({ pressed }) => [s.chip, pressed && s.pressed]}><Text style={s.chipText}>{question}</Text></Pressable>)}</View>
    </View>
    <PlanBuilderCard />
    <View style={s.section}>
      <SectionHeader title="Collections" action="Browse library" onAction={() => router.push('/(tabs)/library')} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.bleed} contentContainerStyle={s.carousel}>
        {collections.map(collection => <CollectionCard key={collection.id} collection={collection} width={150} />)}
      </ScrollView>
    </View>
    <View style={s.section}>
      <SectionHeader title="Explore by muscle" action={`All ${exercises.length}`} onAction={() => router.push('/(tabs)/library')} />
      <View style={s.categories}>{categories.map(category => <Pressable key={category.name} accessibilityRole="button" onPress={() => router.push({ pathname: '/(tabs)/library', params: { muscle: category.muscle } })} style={({ pressed }) => [s.category, pressed && s.pressed]}>
        <View style={s.categoryIcon}><Ionicons name={category.icon} size={20} color={colors.primary} /></View>
        <View style={{ gap: 2 }}><Text style={type.subheading}>{category.name}</Text><Text style={type.caption}>{category.hint}</Text></View>
      </Pressable>)}</View>
    </View>
    <View style={s.section}>
      <SectionHeader title="Training programs" tag="Sandbox" />
      <ProgramRecommendation />
    </View>
  </Screen>;
}
const s = StyleSheet.create({
  screen: { gap: 22 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.text, fontWeight: '700', fontSize: 15 },
  askGroup: { gap: 10 },
  askBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 16, paddingRight: 6, paddingVertical: 6, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderStrong },
  input: { flex: 1, minHeight: 44, color: colors.text, fontSize: 15, outlineStyle: 'none' } as never,
  send: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.35 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  pressed: { backgroundColor: colors.surfaceRaised },
  hero: { borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.surface },
  heroPressed: { opacity: 0.92 },
  heroOverlay: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  heroContent: { position: 'absolute', left: 18, right: 18, bottom: 18, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  heroCopy: { flex: 1, gap: 3 },
  heroLabel: { color: colors.accent, fontWeight: '700', fontSize: 12, lineHeight: 17 },
  heroTitle: { color: colors.text, fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -1 },
  heroSubtitle: { color: '#CDD5E2', fontSize: 13, lineHeight: 18 },
  heroCta: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 12 },
  bleed: { marginHorizontal: -20 },
  carousel: { gap: 10, paddingHorizontal: 20 },
  categories: { flexDirection: 'row', gap: 10 },
  category: { flex: 1, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, padding: 14, gap: 14 },
  categoryIcon: { width: 38, height: 38, borderRadius: radii.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
