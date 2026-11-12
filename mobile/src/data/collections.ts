import type { Ionicons } from '@expo/vector-icons';
import { exercises, upperBody, type Exercise } from '@/data/exercises';

export type Collection = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  exercises: Exercise[];
};

const training = (e: Exercise) => !['Mobility', 'Cardio'].includes(e.muscle);
const byIds = (ids: string[]) => ids.map(id => exercises.find(e => e.id === id)).filter((e): e is Exercise => Boolean(e));

type Definition = Omit<Collection, 'exercises'> & ({ pick: (e: Exercise) => boolean; ids?: never } | { ids: string[]; pick?: never });

const definitions: Definition[] = [
  { id: 'beginner-foundations', title: 'Beginner foundations', description: 'Simple, low-skill movements with bodyweight or dumbbells to build a base.', icon: 'leaf-outline', tint: '#3DD68C', pick: e => training(e) && e.difficulty === 'Beginner' && ['Bodyweight', 'Dumbbells'].includes(e.equipment) },
  { id: 'no-equipment', title: 'No-equipment home', description: 'Train anywhere using only your bodyweight and household items.', icon: 'home-outline', tint: '#4C8DFF', pick: e => training(e) && e.equipment === 'Bodyweight' },
  { id: 'dumbbell-only', title: 'Dumbbell only', description: 'A full toolbox of movements with a single pair of dumbbells.', icon: 'barbell-outline', tint: '#A78BFA', pick: e => e.equipment === 'Dumbbells' },
  { id: 'glutes-legs', title: 'Glutes & legs', description: 'Squats, hinges, lunges, and bridges for a strong lower body.', icon: 'walk-outline', tint: '#F472B6', pick: e => training(e) && ['Glutes', 'Legs'].includes(e.muscle) },
  { id: 'upper-body', title: 'Upper body', description: 'Push, pull, and press variations for chest, back, shoulders, and arms.', icon: 'body-outline', tint: '#38BDF8', pick: e => upperBody.includes(e.muscle) },
  { id: 'core-abs', title: 'Core & abs', description: 'Anti-rotation, bracing, and flexion work for a stable midsection.', icon: 'grid-outline', tint: '#F5B544', pick: e => e.muscle === 'Core' },
  { id: 'hiit-conditioning', title: 'HIIT & conditioning', description: 'Fast-paced moves to raise your heart rate and build work capacity.', icon: 'flash-outline', tint: '#F2686E', ids: ['jumping-jacks', 'burpee', 'half-burpee', 'squat-thrust', 'mountain-climber', 'high-knees', 'jump-squat', 'plank-jack', 'seal-jack', 'fast-feet', 'skater-hop', 'lateral-shuffle', 'sprawl', 'bear-crawl', 'explosive-push-up', 'kettlebell-swing', 'jump-rope', 'battle-ropes', 'assault-bike'] },
  { id: 'resistance-bands', title: 'Resistance bands', description: 'Portable, joint-friendly resistance for warm-ups and full workouts.', icon: 'git-commit-outline', tint: '#34D399', pick: e => e.equipment === 'Bands' },
  { id: 'calisthenics', title: 'Calisthenics skills', description: 'Challenging bodyweight and bar progressions for advanced control.', icon: 'trophy-outline', tint: '#FBBF24', pick: e => ['Bodyweight', 'Pull-up bar'].includes(e.equipment) && e.difficulty !== 'Beginner' && training(e) },
  { id: 'gym-strength', title: 'Gym strength', description: 'Barbell, machine, and cable lifts for a fully equipped gym.', icon: 'business-outline', tint: '#818CF8', pick: e => ['Barbell', 'Machine', 'Cable'].includes(e.equipment) },
  { id: 'mobility', title: 'Mobility & stretching', description: 'Gentle stretches to warm up, cool down, and move more freely.', icon: 'flower-outline', tint: '#2DD4BF', pick: e => e.muscle === 'Mobility' },
  { id: 'cardio', title: 'Cardio', description: 'Steady-state and machine cardio for endurance and recovery days.', icon: 'heart-outline', tint: '#FB7185', pick: e => e.muscle === 'Cardio' },
];

export const collections: Collection[] = definitions.map(({ pick, ids, ...rest }) => ({ ...rest, exercises: ids ? byIds(ids) : exercises.filter(pick!) }));

export const getCollection = (id?: string) => collections.find(collection => collection.id === id);
