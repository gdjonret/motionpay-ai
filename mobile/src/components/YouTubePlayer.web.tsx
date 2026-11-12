import type { YouTubePlayerProps } from './YouTubePlayer';

export function YouTubePlayer({ videoId, onError }: YouTubePlayerProps) {
  return <iframe
    title="Exercise tutorial on YouTube"
    src={`https://www.youtube.com/embed/${videoId}?playsinline=1`}
    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
    allowFullScreen
    referrerPolicy="strict-origin-when-cross-origin"
    onError={onError}
    style={{ width: '100%', height: 300, border: 0, background: '#0A0C11', borderRadius: 14 }}
  />;
}
