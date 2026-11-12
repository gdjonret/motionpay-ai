import { WebView } from 'react-native-webview';

export type ExerciseVideoProps = { url: string; onError: () => void };

export function ExerciseVideo({ url, onError }: ExerciseVideoProps) {
  const escaped = url.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return <WebView
    source={{ html: `<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#0A0C11"><video controls autoplay loop muted playsinline style="width:100%;height:100%;object-fit:contain" onerror="window.ReactNativeWebView.postMessage('error')"><source src="${escaped}" type="video/mp4"></video></body></html>` }}
    allowsInlineMediaPlayback
    mediaPlaybackRequiresUserAction={false}
    onMessage={event => { if (event.nativeEvent.data === 'error') onError(); }}
    onError={onError}
    style={{ width: '100%', height: 340, backgroundColor: '#0A0C11' }}
  />;
}
