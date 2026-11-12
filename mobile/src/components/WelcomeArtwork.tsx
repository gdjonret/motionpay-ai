import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function WelcomeArtwork({ squat = false }: { squat?: boolean }) {
  return <View style={{ width: '100%', aspectRatio: squat ? 4 / 5 : 4 / 3, overflow: 'hidden', borderRadius: squat ? 14 : 0 }}>
    <Image accessible={false} source={squat ? require('../../assets/welcome/exercise-demo.jpg') : require('../../assets/welcome/fitness-coach.jpg')} style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]} resizeMode="cover" />
    {!squat && <LinearGradient colors={['transparent', '#0A0C11']} style={{ position: 'absolute', bottom: 0, width: '100%', height: 28 }} />}
  </View>;
}
