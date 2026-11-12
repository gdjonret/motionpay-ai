import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, type } from '@/theme';

const tones = {
  info: { icon: 'information-circle', color: colors.primary, bg: colors.primarySoft },
  success: { icon: 'checkmark-circle', color: colors.success, bg: colors.successSoft },
  warning: { icon: 'alert-circle', color: colors.warning, bg: colors.warningSoft },
  error: { icon: 'close-circle', color: colors.danger, bg: colors.dangerSoft },
} as const;

export function Notice({ tone = 'info', title, children, action }: { tone?: keyof typeof tones; title?: string; children?: ReactNode; action?: ReactNode }) {
  const t = tones[tone];
  return <View accessibilityRole={tone === 'error' ? 'alert' : undefined} accessibilityLiveRegion="polite" style={[styles.wrap, { backgroundColor: t.bg }]}>
    <Ionicons name={t.icon} size={18} color={t.color} style={styles.icon} />
    <View style={styles.copy}>
      {title && <Text style={type.subheading}>{title}</Text>}
      {typeof children === 'string' ? <Text style={type.small}>{children}</Text> : children}
      {action}
    </View>
  </View>;
}

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'primary' | 'success' | 'warning' }) {
  const palette = { neutral: [colors.surfaceRaised, colors.textSecondary], primary: [colors.primarySoft, colors.accent], success: [colors.successSoft, colors.success], warning: [colors.warningSoft, colors.warning] }[tone];
  return <View style={[styles.tag, { backgroundColor: palette[0] }]}><Text style={[styles.tagText, { color: palette[1] }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: radii.md },
  icon: { marginTop: 1 },
  copy: { flex: 1, gap: 4 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: radii.xs },
  tagText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
});
