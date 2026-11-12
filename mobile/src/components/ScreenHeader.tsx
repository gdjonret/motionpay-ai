import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, type } from '@/theme';

export function BackButton({ onPress, label = 'Back' }: { onPress: () => void; label?: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
    <Ionicons name="chevron-back" size={20} color={colors.text} />
  </Pressable>;
}

export function ScreenHeader({ title, eyebrow, subtitle, onBack, backLabel, right }: { title: string; eyebrow?: string; subtitle?: string; onBack?: () => void; backLabel?: string; right?: ReactNode }) {
  return <View style={styles.wrap}>
    {(onBack || right) && <View style={styles.bar}>{onBack ? <BackButton onPress={onBack} label={backLabel} /> : <View />}{right}</View>}
    <View style={styles.copy}>
      {eyebrow && <Text style={[type.overline, { color: colors.primary }]}>{eyebrow}</Text>}
      <Text accessibilityRole="header" style={type.title}>{title}</Text>
      {subtitle && <Text style={type.body}>{subtitle}</Text>}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 18 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  back: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  pressed: { backgroundColor: colors.surfaceRaised },
  copy: { gap: 6 },
});
