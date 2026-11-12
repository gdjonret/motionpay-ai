import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Small chunks accommodate native keystore size limits. Write the manifest last
// so an interrupted refresh never exposes a partially written session.
async function manifest(key: string): Promise<{ generation: string; count: number } | null> {
  const raw = await SecureStore.getItemAsync(key + '.manifest');
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    return typeof value.generation === 'string' && Number.isInteger(value.count) && value.count > 0 && value.count < 100 ? value : null;
  } catch { return null; }
}
export const sessionStorage = {
  async getItem(key: string) {
    const stored = await manifest(key);
    if (!stored) {
      const legacy = await AsyncStorage.getItem(key);
      if (!legacy) return null;
      await sessionStorage.setItem(key, legacy);
      await AsyncStorage.removeItem(key);
      return legacy;
    }
    const chunks = await Promise.all(Array.from({ length: stored.count }, (_, index) => SecureStore.getItemAsync(`${key}.${stored.generation}.${index}`)));
    return chunks.some(chunk => chunk === null) ? null : chunks.join('');
  },
  async setItem(key: string, value: string) {
    const previous = await manifest(key);
    const generation = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const points = Array.from(value);
    const chunks = Array.from({ length: Math.max(1, Math.ceil(points.length / 400)) }, (_, index) => points.slice(index * 400, (index + 1) * 400).join(''));
    if (chunks.length >= 100) throw new Error('Session exceeds secure storage size limit.');
    try {
      await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${key}.${generation}.${index}`, chunk)));
      await SecureStore.setItemAsync(key + '.manifest', JSON.stringify({ generation, count: chunks.length }));
    } catch (error) {
      await Promise.all(chunks.map((_, index) => SecureStore.deleteItemAsync(`${key}.${generation}.${index}`).catch(() => {})));
      throw error;
    }
    if (previous) await Promise.all(Array.from({ length: previous.count }, (_, index) => SecureStore.deleteItemAsync(`${key}.${previous.generation}.${index}`).catch(() => {})));
  },
  async removeItem(key: string) {
    const stored = await manifest(key);
    await SecureStore.deleteItemAsync(key + '.manifest');
    await AsyncStorage.removeItem(key);
    if (stored) await Promise.all(Array.from({ length: stored.count }, (_, index) => SecureStore.deleteItemAsync(`${key}.${stored.generation}.${index}`)));
  },
};
