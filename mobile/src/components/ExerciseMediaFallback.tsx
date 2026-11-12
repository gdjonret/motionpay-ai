import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { ExerciseVideo } from '@/components/ExerciseVideo';
import { YouTubeFallback } from '@/components/YouTubeFallback';
import { backendUrl } from '@/services/chat';
import { colors } from '@/theme';

export function ExerciseMediaFallback({ query, knownVideoId }: { query: string; knownVideoId?: string }) {
  return <ExerciseMediaSearch key={`${query}:${knownVideoId || ''}`} query={query} knownVideoId={knownVideoId} />;
}

function ExerciseMediaSearch({ query, knownVideoId }: { query: string; knownVideoId?: string }) {
  const [result, setResult] = useState<{ name: string; url: string } | null>(null);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const workoutxEnabled = process.env.EXPO_PUBLIC_DEMONSTRATION_PROVIDER === 'workoutx';
  useEffect(() => {
    if (!workoutxEnabled) return;
    const abort = new AbortController();
    let active = true;
    const timer = setTimeout(() => abort.abort(), 10000);
    fetch(`${backendUrl()}/api/demonstration?q=${encodeURIComponent(query)}`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error('Search unavailable'); return response.json(); })
      .then(data => {
        if (active && data.status === 'found' && typeof data.name === 'string' && typeof data.video_url === 'string' && data.video_url.startsWith('https://')) setResult({ name: data.name, url: data.video_url });
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); if (active) setDone(true); });
    return () => { active = false; clearTimeout(timer); abort.abort(); };
  }, [query, workoutxEnabled]);
  if (!workoutxEnabled) return <YouTubeFallback key={query} query={query} knownVideoId={knownVideoId} />;
  if (!done) return <Text style={{ color: colors.muted }}>Finding an exercise animation…</Text>;
  if (!result || failed) return <YouTubeFallback query={query} knownVideoId={knownVideoId} />;
  return <View style={{ gap: 10 }}>
    <Text style={{ color: colors.text, fontWeight: '700' }}>{result.name}</Text>
    <ExerciseVideo url={result.url} onError={() => setFailed(true)} />
    <Pressable accessibilityRole="link" onPress={() => { void Linking.openURL('https://workoutxapp.com/').catch(() => {}); }} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontSize: 12 }}>Exercise animation by WorkoutX · Free previews may be watermarked ↗</Text>
    </Pressable>
  </View>;
}
