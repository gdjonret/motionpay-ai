import { Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="MotionPay AI">
      <View style={[styles.mark, compact && styles.markCompact]}>
        <Ionicons name="pulse" size={compact ? 17 : 22} color={colors.onPrimary} />
      </View>
      <Text style={[styles.name, compact && styles.nameCompact]}>MotionPay<Text style={styles.ai}> AI</Text></Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  markCompact: { width: 30, height: 30, borderRadius: 9 },
  name: { color: colors.text, fontWeight: '800', fontSize: 22, letterSpacing: -0.6 },
  nameCompact: { fontSize: 17, letterSpacing: -0.4 },
  ai: { color: colors.muted, fontWeight: '700' },
});
