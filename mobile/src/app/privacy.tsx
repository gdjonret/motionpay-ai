import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radii, type } from '@/theme';

const sections = [
  { icon: 'flask-outline', title: 'Prototype & AI', text: 'MotionPay is a hackathon prototype. Chat messages and recent conversation context are sent to Groq to generate replies. Do not include sensitive personal or medical information.' },
  { icon: 'key-outline', title: 'Accounts & storage', text: 'Supabase stores your account and sandbox purchase access. Native sign-in tokens use device secure storage; web sessions use browser storage. Chat messages stay in app memory and clear on account changes or restart.' },
  { icon: 'card-outline', title: 'Payments', text: 'PayPal handles sandbox checkout in its own browser page. MotionPay does not collect card numbers. Sandbox checkout uses test money only.' },
  { icon: 'images-outline', title: 'Media & advice', text: 'Exercise images and videos come from credited third-party sources. Opening YouTube or external sources shares requests with those services. AI answers and the training template are not professionally reviewed or medical advice.' },
  { icon: 'person-remove-outline', title: 'Data requests', text: 'The prototype has no in-app account deletion or refund flow. Contact the project administrator for account data requests. Payment reversals and production commerce are outside this sandbox demo.' },
] as const;

export default function PrivacyScreen() {
  return <Screen bottomSafe contentStyle={{ gap: 20 }}>
    <ScreenHeader onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)/profile')} eyebrow="Privacy" title="Data and demo information" />
    {sections.map(section => <View key={section.title} style={s.item}>
      <View style={s.icon}><Ionicons name={section.icon} size={18} color={colors.primary} /></View>
      <View style={{ flex: 1, gap: 4 }}><Text style={type.subheading}>{section.title}</Text><Text style={type.small}>{section.text}</Text></View>
    </View>)}
  </Screen>;
}
const s = StyleSheet.create({
  item: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  icon: { width: 36, height: 36, borderRadius: radii.sm, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
});
