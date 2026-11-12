import { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, Linking, Pressable, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { getIllustration, getIllustrationMetadata } from '@/data/exerciseIllustrations';
import { colors } from '@/theme';

export function ExerciseIllustration({ exerciseId }: { exerciseId: string }) {
  const illustration = getIllustration(exerciseId);
  const metadata = getIllustrationMetadata(exerciseId);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [linkError, setLinkError] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => { if (mounted) setPlaying(!reduced); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => setPlaying(!reduced));
    return () => { mounted = false; subscription.remove(); };
  }, []);
  useFocusEffect(useCallback(() => {
    if (!playing || !illustration) return;
    const timer = setInterval(() => setFrame(previous => (previous + 1) % illustration.frames.length), 850);
    return () => clearInterval(timer);
  }, [playing, illustration]));
  if (!illustration || !metadata) return null;
  const open = (url: string) => Linking.openURL(url).catch(() => setLinkError(true));
  return <View style={{ gap: 6, padding: 12, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
    <View style={{ height: 240, backgroundColor: colors.surfaceSunken, borderRadius: 14, overflow: 'hidden', marginBottom: 4 }}>
      {illustration.frames.map((source, index) => <Image key={index} source={source} accessibilityLabel={`${metadata.name}: position ${index + 1}`} accessible={index === frame} contentFit="contain" style={{ position: 'absolute', width: '100%', height: '100%', opacity: index === frame ? 1 : 0 }} />)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause demonstration' : 'Play demonstration'} onPress={() => setPlaying(value => !value)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '600' }}>{playing ? 'Ⅱ Pause' : '▶ Play'} · Illustrated movement · {frame + 1}/3</Text></Pressable>
    <Text style={{ color: colors.text, fontSize: 12 }}>Primary: {metadata.primaryMuscle}</Text>
    <Text style={{ color: colors.muted, fontSize: 12 }}>Secondary: {metadata.secondaryMuscles.join(', ') || '—'}</Text>
    <Pressable accessibilityRole="link" onPress={() => open('https://github.com/bryllim/workout-guide')} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 11 }}>Artwork: Bryl Lim / Workout Guide{metadata.attribution.source ? ', based on Everkinetic' : ''} ↗</Text></Pressable>
    <Pressable accessibilityRole="link" onPress={() => open(metadata.attribution.licenseUrl)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 11 }}>CC BY-SA 4.0 · Frames unchanged; sequenced in app ↗</Text></Pressable>
    {metadata.attribution.source && <Pressable accessibilityRole="link" onPress={() => open(metadata.attribution.source!.url)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontSize: 11 }}>Original pose source ↗</Text></Pressable>}
    {linkError && <Text style={{ color: colors.muted }}>Unable to open link.</Text>}
  </View>;
}
