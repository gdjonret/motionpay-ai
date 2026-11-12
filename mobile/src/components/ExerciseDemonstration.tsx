import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import { ExerciseIllustration } from '@/components/ExerciseIllustration';
import { getIllustration } from '@/data/exerciseIllustrations';
import type { Exercise } from '@/data/exercises';
import { colors, radii } from '@/theme';
import { ExerciseMediaFallback } from '@/components/ExerciseMediaFallback';
import { exerciseGifs } from '@/data/exerciseGifs';

export function ExerciseDemonstration({ exercise }: { exercise: Exercise }) {
  const [gifFailed, setGifFailed] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const image = useRef<Image>(null);
  const sync = useCallback((play: boolean) => {
    if (Platform.OS !== 'web') void (play ? image.current?.startAnimating() : image.current?.stopAnimating())?.catch(() => {});
  }, []);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(reduced => { if (active) setPlaying(!reduced); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', reduced => { setPlaying(!reduced); sync(!reduced); });
    return () => { active = false; sub.remove(); };
  }, [sync]);
  useFocusEffect(useCallback(() => { sync(playing); return () => sync(false); }, [playing, sync]));
  const [alternate, setAlternate] = useState(false);
  const [originalSpeed, setOriginalSpeed] = useState(false);
  const slowed = Boolean(exercise.gifPath?.endsWith('/slow.gif'));
  const source = slowed && !originalSpeed ? { uri: exercise.gifPath! } : exerciseGifs[exercise.id] || { uri: exercise.gifPath! };
  if (exercise.gifPath && !gifFailed) return <View style={s.wrapper}>
    {Platform.OS !== 'web' || playing ? <Image ref={image} source={source} accessibilityLabel={`${exercise.name} demonstration`} contentFit="contain" autoplay={playing} onLoad={() => sync(playing)} onError={() => { if (slowed && !originalSpeed && exerciseGifs[exercise.id]) setOriginalSpeed(true); else setGifFailed(true); }} style={s.gif} /> : <View style={[s.gif, { alignItems: 'center', justifyContent: 'center' }]}><Text style={s.caption}>GIF paused. Tap Play to view the demonstration.</Text></View>}
    <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause GIF' : 'Play GIF'} style={s.link} onPress={() => { setPlaying(!playing); sync(!playing); }}><Text style={s.linkText}>{playing ? 'Pause GIF' : 'Play GIF'}</Text></Pressable>
    <Text style={s.caption}>GIF demonstration</Text>
    {originalSpeed && <Text style={s.caption}>Slower version unavailable. Showing the bundled original at normal speed.</Text>}
    {exercise.gifCredit && <View>
      <Text style={s.caption}>By {exercise.gifCredit.author} · {originalSpeed ? 'Unmodified' : exercise.gifCredit.changes || 'Unmodified'}</Text>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(exercise.gifCredit!.source).catch(() => setLinkFailed(true))} style={s.link}><Text style={s.linkText}>Source: Wikimedia Commons ↗</Text></Pressable>
      <Pressable accessibilityRole="link" onPress={() => Linking.openURL(exercise.gifCredit!.licenseUrl).catch(() => setLinkFailed(true))} style={s.link}><Text style={s.linkText}>{exercise.gifCredit.license} ↗</Text></Pressable>
      {linkFailed && <Text style={s.caption}>Unable to open the link. Please try again.</Text>}
    </View>}
  </View>;
  return <View style={{ gap: 12 }}>
    {getIllustration(exercise.id) && !alternate ? <><ExerciseIllustration key={`illustration-${exercise.id}`} exerciseId={exercise.id} /><Pressable accessibilityRole="button" style={s.link} onPress={() => setAlternate(true)}><Text style={s.linkText}>Watch a video tutorial instead →</Text></Pressable></> : <ExerciseMediaFallback key={exercise.id} query={exercise.name} knownVideoId={exercise.youtubeVideoId} />}
  </View>;
}
const s = StyleSheet.create({ wrapper: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 6 }, title: { color: colors.text, fontWeight: '700', fontSize: 15 }, caption: { color: colors.muted, fontSize: 12, lineHeight: 18 }, gif: { width: '100%', height: 260, borderRadius: radii.md, backgroundColor: '#000000', overflow: 'hidden' }, play: { minHeight: 120, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surfaceSunken, borderRadius: 10 }, playText: { color: colors.primary, fontWeight: '700' }, link: { minHeight: 40, justifyContent: 'center' }, linkText: { color: colors.primary, fontWeight: '600', fontSize: 13 } });
