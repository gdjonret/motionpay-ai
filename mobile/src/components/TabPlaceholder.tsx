import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radii, type } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
export function TabPlaceholder({ title, subtitle, icon, items }: { title: string; subtitle: string; icon: IconName; items: string[] }) {
  return <Screen contentStyle={styles.screen}>
    <ScreenHeader title={title} subtitle={subtitle} />
    <Card style={styles.hero}><View style={styles.icon}><Ionicons name={icon} size={28} color={colors.primary} /></View><Text style={type.heading}>Coming soon</Text><Text style={[type.small, { textAlign: 'center' }]}>This destination is wired into navigation and ready for live data in the next frontend slice.</Text></Card>
    <View style={styles.list}>{items.map(item => <View key={item} style={styles.item}><Ionicons name="checkmark-circle" size={18} color={colors.success} /><Text style={[type.small, { flex: 1 }]}>{item}</Text></View>)}</View>
  </Screen>;
}
const styles = StyleSheet.create({
  screen: { gap: 22 },
  hero: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10 },
  icon: { width: 60, height: 60, borderRadius: radii.lg, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  list: { gap: 10 },
  item: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
