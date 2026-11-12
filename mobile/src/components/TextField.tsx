import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, type } from '@/theme';

type Props = TextInputProps & { label?: string; icon?: keyof typeof Ionicons.glyphMap };

export function TextField({ label, icon, style, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.wrap}>
    {label && <Text style={styles.label}>{label}</Text>}
    <View style={[styles.field, focused && styles.focused]}>
      {icon && <Ionicons name={icon} size={18} color={focused ? colors.primary : colors.muted} />}
      <TextInput
        accessibilityLabel={props.accessibilityLabel ?? label ?? props.placeholder}
        placeholderTextColor={colors.muted}
        onFocus={event => { setFocused(true); onFocus?.(event); }}
        onBlur={event => { setFocused(false); onBlur?.(event); }}
        style={[styles.input, style]}
        {...props}
      />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { ...type.small, fontWeight: '600', color: colors.text },
  field: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSunken },
  focused: { borderColor: colors.primary, backgroundColor: colors.surface },
  input: { flex: 1, minHeight: 50, color: colors.text, fontSize: 15, outlineStyle: 'none' } as never,
});
