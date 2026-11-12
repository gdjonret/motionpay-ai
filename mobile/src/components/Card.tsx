import { PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radii, spacing } from '@/theme';

export function Card({ children, style, tone = 'default' }: PropsWithChildren<{ style?: StyleProp<ViewStyle>; tone?: 'default' | 'raised' | 'highlight' }>) {
  return <View style={[styles.card, tone === 'raised' && styles.raised, tone === 'highlight' && styles.highlight, style]}>{children}</View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md + 2 },
  raised: { backgroundColor: colors.surfaceRaised },
  highlight: { backgroundColor: colors.surface, borderColor: colors.primaryBorder },
});
