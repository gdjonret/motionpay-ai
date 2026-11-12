import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getIllustration } from '@/data/exerciseIllustrations';
import { exerciseGifs } from '@/data/exerciseGifs';
import { colors, radii } from '@/theme';

// Static preview: the mid-movement illustration frame, or the bundled GIF without autoplay.
export const ExerciseThumb = memo(function ExerciseThumb({ exerciseId, size = 52 }: { exerciseId: string; size?: number }) {
  const frames = getIllustration(exerciseId)?.frames;
  const source = frames ? frames[1] ?? frames[0] : exerciseGifs[exerciseId];
  return <View style={[s.box, { width: size, height: size }]}>
    {source ? <Image source={source} autoplay={false} contentFit="contain" transition={150} accessible={false} style={s.image} /> : <Ionicons name="barbell-outline" size={size * 0.42} color={colors.primary} />}
  </View>;
});

const s = StyleSheet.create({
  box: { borderRadius: radii.md, backgroundColor: '#1E2430', borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '118%', height: '118%' },
});
