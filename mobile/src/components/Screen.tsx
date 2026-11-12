import { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export function Screen({ children, contentStyle, bottomSafe = false }: PropsWithChildren<{ contentStyle?: ViewStyle; bottomSafe?: boolean }>) {
  return (
    <SafeAreaView style={styles.safe} edges={bottomSafe ? ['top', 'bottom'] : ['top']}>
      <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, paddingHorizontal: spacing.lg - 4, paddingTop: spacing.sm, paddingBottom: spacing.xl } });
