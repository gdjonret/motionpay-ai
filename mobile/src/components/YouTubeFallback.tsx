import { useEffect, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';
import { YouTubePlayer } from '@/components/YouTubePlayer';
import { backendUrl } from '@/services/chat';
import { colors } from '@/theme';

export function YouTubeFallback({ query, knownVideoId }: { query: string; knownVideoId?: string }) {
  const [result, setResult] = useState<{ videoId?: string; title?: string; channel?: string; done: boolean }>({ videoId: knownVideoId, done: Boolean(knownVideoId) });
  const [failed, setFailed] = useState(false);
  const [linkFailed, setLinkFailed] = useState(false);
  useEffect(() => {
    if (knownVideoId) return;
    const abort = new AbortController();
    let active = true;
    const timer = setTimeout(() => abort.abort(), 15000);
    fetch(`${backendUrl()}/api/tutorial?q=${encodeURIComponent(query)}`, { signal: abort.signal })
      .then(response => { if (!response.ok) throw new Error('Search unavailable'); return response.json(); })
      .then(data => { if (active) setResult({ videoId: typeof data.video_id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(data.video_id) ? data.video_id : undefined, title: typeof data.title === 'string' ? data.title : undefined, channel: typeof data.channel === 'string' ? data.channel : undefined, done: true }); })
      .catch(() => { if (active) setResult({ done: true }); })
      .finally(() => clearTimeout(timer));
    return () => { active = false; clearTimeout(timer); abort.abort(); };
  }, [query, knownVideoId]);
  const open = (url: string) => Linking.openURL(url).catch(() => setLinkFailed(true));
  return <View style={{ gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 20, overflow: 'hidden' }}>
    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>YouTube tutorial</Text>
    <Text style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>{!result.done ? 'Finding a short tutorial…' : result.videoId ? 'No GIF available? Watch this exercise tutorial.' : 'No embedded tutorial is available right now. Search YouTube for this exercise.'}</Text>
    {result.title && <Text style={{ color: colors.text, fontSize: 13 }}>{result.title}</Text>}
    {result.channel && <Text style={{ color: colors.muted, fontSize: 11 }}>By {result.channel} · YouTube</Text>}
    {result.videoId && !failed && <YouTubePlayer videoId={result.videoId} onError={() => setFailed(true)} />}
    {failed && <Text style={{ color: colors.muted }}>This video could not load here. Try opening YouTube.</Text>}
    {result.videoId && <Pressable accessibilityRole="link" onPress={() => open(`https://www.youtube.com/watch?v=${result.videoId}`)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Watch on YouTube ↗</Text></Pressable>}
    <Pressable accessibilityRole="link" onPress={() => open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' exercise tutorial #shorts')}`)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={{ color: colors.primary, fontWeight: '700' }}>Find more short tutorials ↗</Text></Pressable>
    {linkFailed && <Text style={{ color: colors.muted }}>Unable to open YouTube. Please try again.</Text>}
  </View>;
}
