import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, radii, type } from '@/theme';
export default function NotFound() {
  return <View style={styles.screen}>
    <View style={styles.icon}><Ionicons name="compass-outline" size={28} color={colors.primary} /></View>
    <Text style={type.title}>Screen not found</Text>
    <Text style={[type.body, { textAlign: 'center' }]}>The page you’re looking for doesn’t exist.</Text>
    <PrimaryButton label="Return to MotionPay AI" onPress={() => router.replace('/')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24 }, icon: { width: 64, height: 64, borderRadius: radii.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 } });
