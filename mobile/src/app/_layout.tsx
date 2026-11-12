import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';
import { AuthProvider } from '@/components/AuthProvider';

export default function RootLayout() {
  return (
    <AuthProvider><View style={styles.viewport}>
      <View style={styles.app}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: 'fade' }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="checkout-return" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="collection" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="program" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="plan-builder" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="plan" options={{ animation: 'slide_from_right' }} />
      </Stack>
      </View>
    </View></AuthProvider>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, backgroundColor: '#05060A', alignItems: 'center' },
  app: {
    flex: 1,
    width: '100%',
    backgroundColor: colors.background,
    ...(Platform.OS === 'web' ? { maxWidth: 440, overflow: 'hidden' as const, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border } : {}),
  },
});
