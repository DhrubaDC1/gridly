import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/theme';
import BottomNav from '../../src/ui/components/BottomNav';

const TABS = [
  { name: 'index', label: 'Home', icon: 'house', accessibilityLabel: 'Home' },
  {
    name: 'leaderboards',
    label: 'Leaderboards',
    icon: 'trophy',
    accessibilityLabel: 'View Leaderboards',
    soon: true,
  },
  {
    name: 'achievements',
    label: 'Achievements',
    icon: 'award',
    accessibilityLabel: 'View Achievements',
  },
  { name: 'stats', label: 'Stats', icon: 'chart-column', accessibilityLabel: 'View Stats' },
  {
    name: 'profile',
    label: 'Profile',
    icon: 'user',
    accessibilityLabel: 'View Profile',
    soon: true,
  },
];

// expo-router's bottom tabs hand a custom bar `emitter` + `navigateToTab(routeKey)`
// (not `navigation`); this mirrors its default BottomTabBar press handling.
function TabBar({ state, emitter, navigateToTab }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const focused = state.routes[state.index];

  const items = TABS.map((tab) => ({
    ...tab,
    key: tab.name,
    onPress: () => {
      const route = state.routes.find((r) => r.name === tab.name);
      if (!route) return;
      const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (route.key !== focused.key && !event.defaultPrevented) navigateToTab(route.key);
    },
  }));
  const active = focused.name;

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: Math.max(insets.bottom, 12),
        // Home's backdrop gradient ends at bgDeep; the other tabs are flat bg
        backgroundColor: active === 'index' ? theme.bgDeep : theme.bg,
      }}
    >
      <BottomNav
        items={items}
        activeKey={active}
        style={{ maxWidth: 448, width: '100%', alignSelf: 'center' }}
      />
    </View>
  );
}

export default function TabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: theme.bg },
        headerTintColor: theme.ink,
        headerTitleAlign: 'center',
        headerTitleStyle: { fontFamily: 'Figtree_600SemiBold', fontSize: 16 },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: theme.bg },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={tab.name === 'index' ? { headerShown: false } : { title: tab.label }}
        />
      ))}
    </Tabs>
  );
}
