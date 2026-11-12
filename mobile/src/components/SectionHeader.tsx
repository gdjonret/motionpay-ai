import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, type } from '@/theme';

export function SectionHeader({ title, action, onAction, tag }: { title: string; action?: string; onAction?: () => void; tag?: string }) {
  return <View style={styles.row}>
    <Text style={type.heading}>{title}</Text>
    {action && onAction ? <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8} style={styles.action}><Text style={type.link}>{action}</Text></Pressable> : null}
    {tag ? <Text style={styles.tag}>{tag}</Text> : null}
  </View>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  action: { minHeight: 44, justifyContent: 'center' },
  tag: { ...type.overline, fontSize: 10, color: colors.warning, backgroundColor: colors.warningSoft, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
});
