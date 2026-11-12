import { getAssetUrl, getExercise } from '@bryllim/workout-guide';
import { exercises } from '@/data/exercises';

type Illustration = { slug: string; frames: (number | { uri: string })[] };

// Literal imports let Metro bundle these free frames for offline playback.
const bundled: Record<string, Illustration> = {
  'glute-bridge': { slug: 'glute-bridge', frames: [require('@bryllim/workout-guide/assets/glute-bridge/frame-1.png'), require('@bryllim/workout-guide/assets/glute-bridge/frame-2.png'), require('@bryllim/workout-guide/assets/glute-bridge/frame-3.png')] },
  'incline-push-up': { slug: 'incline-push-up', frames: [require('@bryllim/workout-guide/assets/incline-push-up/frame-1.png'), require('@bryllim/workout-guide/assets/incline-push-up/frame-2.png'), require('@bryllim/workout-guide/assets/incline-push-up/frame-3.png')] },
  'dumbbell-row': { slug: 'one-arm-dumbbell-row', frames: [require('@bryllim/workout-guide/assets/one-arm-dumbbell-row/frame-1.png'), require('@bryllim/workout-guide/assets/one-arm-dumbbell-row/frame-2.png'), require('@bryllim/workout-guide/assets/one-arm-dumbbell-row/frame-3.png')] },
  'dead-bug': { slug: 'dead-bug', frames: [require('@bryllim/workout-guide/assets/dead-bug/frame-1.png'), require('@bryllim/workout-guide/assets/dead-bug/frame-2.png'), require('@bryllim/workout-guide/assets/dead-bug/frame-3.png')] },
};

// The extended library streams frames from the package's versioned CDN to avoid bundling ~30 MB of artwork.
const remote = new Map<string, Illustration>();

export function getIllustration(exerciseId: string): Illustration | undefined {
  if (bundled[exerciseId]) return bundled[exerciseId];
  const cached = remote.get(exerciseId);
  if (cached) return cached;
  const slug = exercises.find(exercise => exercise.id === exerciseId)?.illustration;
  const urls = slug ? ([1, 2, 3] as const).map(index => getAssetUrl(slug, index)) : [];
  if (!slug || urls.some(url => !url)) return undefined;
  const illustration = { slug, frames: urls.map(uri => ({ uri: uri! })) };
  remote.set(exerciseId, illustration);
  return illustration;
}

export function getIllustrationMetadata(id: string) {
  const item = getIllustration(id);
  return item ? getExercise(item.slug) : null;
}
