import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Brand } from '@/components/Brand';
import { Notice } from '@/components/Notice';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/components/AuthProvider';
import { paymentRequest } from '@/services/payments';
import { colors, type } from '@/theme';

type CaptureResult = { unlocked: boolean; program_id: string; plan_id: string | null };

export default function CheckoutReturnScreen() {
  const { order_id: rawOrderId, status } = useLocalSearchParams<{ order_id?: string; status?: string }>();
  const orderId = typeof rawOrderId === 'string' && /^[A-Z0-9]{8,40}$/.test(rawOrderId) ? rawOrderId : null;
  const { session, loading } = useAuth();
  const started = useRef(false);
  const [error, setError] = useState('');

  const verify = useCallback(async () => {
    if (!orderId || !session || started.current) return;
    started.current = true;
    setError('');
    try {
      const result = await paymentRequest<CaptureResult>(`/api/paypal/orders/${encodeURIComponent(orderId)}/capture`, 'POST');
      if (!result.unlocked) throw new Error('PayPal approval could not be verified.');
      if (result.plan_id) router.replace({ pathname: '/plan', params: { id: result.plan_id } });
      else router.replace('/program');
    } catch (failure) {
      started.current = false;
      setError(failure instanceof Error ? failure.message : 'Unable to verify the PayPal checkout.');
    }
  }, [orderId, session]);

  useEffect(() => {
    const timer = setTimeout(() => { void verify(); }, 0);
    return () => clearTimeout(timer);
  }, [verify]);

  if (status === 'cancelled') return <Screen contentStyle={s.screen}>
    <Brand />
    <Notice tone="info" title="Checkout cancelled">No access was unlocked. You can return whenever you are ready.</Notice>
    <PrimaryButton label="Return to MotionPay" onPress={() => router.replace('/(tabs)')} />
  </Screen>;

  if (!orderId) return <Screen contentStyle={s.screen}>
    <Brand />
    <Notice tone="error" title="Checkout return is incomplete">Open your plan and use Verify payment to safely check the existing order.</Notice>
    <PrimaryButton label="Return to MotionPay" onPress={() => router.replace('/(tabs)')} />
  </Screen>;

  if (!loading && !session) return <Screen contentStyle={s.screen}>
    <Brand />
    <Notice tone="warning" title="Sign in to verify">Sign in with the same MotionPay account that started this checkout, then verify the saved order from your plan.</Notice>
    <PrimaryButton label="Sign in" onPress={() => router.replace('/sign-in')} />
  </Screen>;

  return <Screen contentStyle={s.screen}>
    <Brand />
    <View style={s.status}>
      {!error && <ActivityIndicator color={colors.primary} size="large" />}
      <Text style={type.title}>{error ? 'Verification needs attention' : 'Unlocking your purchase…'}</Text>
      <Text style={[type.body, s.center]}>{error || 'PayPal approval returned successfully. MotionPay is securely verifying the order before granting access.'}</Text>
    </View>
    {error !== '' && <PrimaryButton label="Retry verification" onPress={() => { void verify(); }} />}
  </Screen>;
}

const s = StyleSheet.create({
  screen: { justifyContent: 'center', gap: 24 },
  status: { alignItems: 'center', gap: 14 },
  center: { textAlign: 'center' },
});
