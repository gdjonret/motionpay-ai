import { WebView } from 'react-native-webview';

export type YouTubePlayerProps = { videoId: string; onError: () => void };

export function YouTubePlayer({ videoId, onError }: YouTubePlayerProps) {
  return <WebView
    source={{ uri: `https://www.youtube.com/embed/${videoId}?playsinline=1` }}
    allowsInlineMediaPlayback
    allowsFullscreenVideo
    mediaPlaybackRequiresUserAction
    onError={onError}
    onHttpError={onError}
    style={{ width: '100%', height: 300, backgroundColor: '#0A0C11' }}
  />;
}
