import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (active: IconName, inactive: IconName) => function TabIcon({ color, focused }: { color: unknown; focused: boolean }) { return <Ionicons name={focused ? active : inactive} color={color as string} size={22} />; };

export default function TabLayout() {
  const { bottom } = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelPosition: 'below-icon',
      tabBarStyle: {
        backgroundColor: colors.surfaceSunken,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: 76 + bottom,
        paddingTop: 6,
        paddingBottom: 8 + bottom,
      },
      tabBarLabelStyle: { fontWeight: '600', fontSize: 11, lineHeight: 15, marginTop: 2 },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach', tabBarIcon: icon('sparkles', 'sparkles-outline') }} />
      <Tabs.Screen name="library" options={{ title: 'Library', tabBarIcon: icon('albums', 'albums-outline') }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person', 'person-outline') }} />
    </Tabs>
  );
}
