import type { ExerciseVideoProps } from './ExerciseVideo';

export function ExerciseVideo({ url, onError }: ExerciseVideoProps) {
  return <video src={url} controls autoPlay loop muted playsInline onError={onError} aria-label="Exercise demonstration" style={{ width: '100%', height: 340, objectFit: 'contain', background: '#0A0C11', borderRadius: 14 }} />;
}
