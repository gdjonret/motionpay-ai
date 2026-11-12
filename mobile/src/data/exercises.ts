import catalog from './catalog.json';

export const muscleGroups = ['Glutes', 'Legs', 'Chest', 'Back', 'Shoulders', 'Arms', 'Core', 'Full body', 'Cardio', 'Mobility'] as const;
export const equipmentTypes = ['Bodyweight', 'Dumbbells', 'Bands', 'Kettlebell', 'Pull-up bar', 'Barbell', 'Machine', 'Cable', 'Cardio', 'Other'] as const;
export const difficulties = ['Beginner', 'Intermediate', 'Advanced'] as const;
export const upperBody: readonly string[] = ['Chest', 'Back', 'Shoulders', 'Arms'];

export type Exercise = {
  id: string;
  name: string;
  equipment: typeof equipmentTypes[number];
  muscle: typeof muscleGroups[number];
  target?: string;
  difficulty: typeof difficulties[number];
  instructions: string[];
  videoPath: string | null;
  gifPath: string | null;
  gifCredit?: { author: string; source: string; license: string; licenseUrl: string; changes?: string };
  youtubeVideoId?: string;
  illustration?: string;
  reviewStatus: 'draft' | 'reviewed';
};

// Draft metadata: media and content review must be completed before AI recommendations.
export const exercises = catalog as Exercise[];

export function filterExercises(query: string, equipment: string, muscle: string, difficulty: string, pool: Exercise[] = exercises) {
  const search = query.trim().toLowerCase();
  return pool.filter(e => `${e.name} ${e.muscle} ${e.target ?? ''} ${e.equipment}`.toLowerCase().includes(search)
    && (equipment === 'All' || e.equipment === equipment)
    && (muscle === 'All' || e.muscle === muscle || (muscle === 'Upper body' && upperBody.includes(e.muscle)))
    && (difficulty === 'All' || e.difficulty === difficulty));
}

export const recommendationReady = (exercise: Exercise) => exercise.reviewStatus === 'reviewed' && Boolean(exercise.videoPath);

const aliases: Record<string, string[]> = {
  'jumping-jacks': ['jumping jack', 'jumping jacks'],
  'push-up': ['push up', 'push ups', 'pushup', 'pushups'],
  'bodyweight-squat': ['squat', 'squats', 'bodyweight squat'],
  'glute-bridge': ['glute bridge', 'glute bridges', 'bridge'],
  'dumbbell-rdl': ['rdl', 'romanian deadlift', 'dumbbell deadlift'],
  'incline-push-up': ['incline push up', 'incline push ups', 'incline pushup', 'incline pushups'],
  'dumbbell-row': ['dumbbell row', 'dumbbell rows'],
  'dead-bug': ['dead bug', 'deadbug'],
};
const normalize = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Local name/alias lookup until the hosted interpretation service is connected.
export function matchExercise(request: string): Exercise | undefined {
  const input = ` ${normalize(request)} `;
  const matches = exercises.filter(exercise => [exercise.name, ...(aliases[exercise.id] ?? [])].some(alias => input.includes(` ${normalize(alias)} `)));
  return matches.length === 1 ? matches[0] : undefined;
}
