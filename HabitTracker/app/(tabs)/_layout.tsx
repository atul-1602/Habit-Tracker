import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Home, Calendar, BarChart2, User, Plus } from 'lucide-react-native';
import { useEffect } from 'react';
import { requestNotificationPermissions } from '../../src/hooks/useNotifications';

function AddHabitFAB() {
  const router = useRouter();
  return (
    // `tabBarButton` replaces the tab bar's own slot wrapper entirely — the
    // other 4 tabs get centered within their equal-width slot by the
    // library's default wrapper, but this custom one doesn't unless we
    // provide the same `flex: 1` + centering ourselves. Without this, the
    // fixed-size button below renders left-aligned within its slot instead
    // of centered, visibly off-center next to its siblings.
    <View style={styles.fabSlot}>
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => router.push('/create-habit')}
      >
        <Plus size={28} color="#111111" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#C7F464',
        tabBarInactiveTintColor: '#707070',
        tabBarShowLabel: false,
        // Cross-fades tab content instead of an instant hard cut — the
        // built-in, native-thread-driven transition Expo Router's tab
        // navigator supports (also available: 'shift' for a subtle slide).
        animation: 'fade',
        // Without this, the native scene container defaults to white and
        // can flash briefly during the fade transition above, before this
        // screen's own dark background paints on top.
        sceneStyle: { backgroundColor: '#111111' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTab : undefined}>
              <Home size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTab : undefined}>
              <Calendar size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarButton: () => <AddHabitFAB />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTab : undefined}>
              <BarChart2 size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeTab : undefined}>
              <User size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1C1C1F',
    borderTopWidth: 1,
    borderTopColor: '#27272A',
    height: 72,
    paddingBottom: 12,
    paddingTop: 10,
    elevation: 0,
  },
  fabSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C7F464',
    alignItems: 'center',
    justifyContent: 'center',
    // Lifts the button so it floats above the tab bar's top edge instead of
    // sitting inline with the other icons. `top` offsets without pulling it
    // out of the flex flow, so the surrounding tabs stay in place.
    top: -24,
    borderWidth: 5,
    borderColor: '#111111',
    shadowColor: '#C7F464',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  activeTab: {
    backgroundColor: '#C7F46420',
    borderRadius: 12,
    padding: 6,
  },
});
