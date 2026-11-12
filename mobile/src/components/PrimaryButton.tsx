import { ActivityIndicator, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
type Props = {
  label: string;
  onPress: () => void;
  icon?: IconName | null;
  leadingIcon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  style?: ViewStyle;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
};

export function PrimaryButton({ label, onPress, icon = 'arrow-forward', leadingIcon, variant = 'primary', size = 'lg', style, disabled = false, loading = false, accessibilityLabel }: Props) {
  const tint = variant === 'primary' ? colors.onPrimary : variant === 'secondary' ? colors.text : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.base, size === 'md' && styles.md, styles[variant], pressed && styles[`${variant}Pressed`], (disabled || loading) && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator size="small" color={tint} /> : leadingIcon ? <Ionicons name={leadingIcon} size={18} color={tint} /> : null}
      <Text style={[styles.label, size === 'md' && styles.labelMd, { color: tint }]}>{label}</Text>
      {icon && !loading ? <View><Ionicons name={icon} size={18} color={tint} /></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: 54, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 22 },
  md: { minHeight: 46, paddingHorizontal: 18, borderRadius: radii.sm + 2 },
  primary: { backgroundColor: colors.primary },
  primaryPressed: { backgroundColor: colors.primaryPressed },
  secondary: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
  secondaryPressed: { backgroundColor: colors.border },
  ghost: { backgroundColor: 'transparent' },
  ghostPressed: { backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.45 },
  label: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },
  labelMd: { fontSize: 14 },
});
