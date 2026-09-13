import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../src/components/ui/Text';
import { ToggleSwitch } from '../src/components/ui/ToggleSwitch';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Palette,
  Bell,
  MessageSquare,
  Zap,
  Heart,
  Database,
  Shield,
  HelpCircle,
  Info,
} from 'lucide-react-native';
import { useSettings } from '../src/hooks/useSettings';
import { useAppUser } from '../src/hooks/useAppUser';
import { useSmartNotifications } from '../src/hooks/useSmartNotifications';
import { useBackTo } from '../src/hooks/useBackTo';

const ACCENT_COLORS = ['#C7F464', '#A855F7', '#FF7849', '#5AC8FA', '#FF5DA2', '#FFD93D'];

export default function SettingsScreen() {
  const router = useRouter();
  const goBack = useBackTo('/(tabs)/profile');
  const { user } = useAppUser();
  const { settings, updateSetting, isLoaded } = useSettings();
  const { recomputeEveningCheckIn, recomputeInactivityNudge } = useSmartNotifications();

  if (!isLoaded) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#C7F464" />
      </View>
    );
  }

  const cycleTheme = () => {
    const themes: ('Dark'|'Light'|'System')[] = ['Dark', 'Light', 'System'];
    const nextIndex = (themes.indexOf(settings.theme) + 1) % themes.length;
    updateSetting('theme', themes[nextIndex]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Appearance */}
        <Text style={styles.sectionLabel}>APPEARANCE</Text>
        <View style={styles.card}>
          {/* Theme */}
          <TouchableOpacity style={styles.settingRow} onPress={cycleTheme} activeOpacity={0.7}>
            <View style={[styles.settingIcon, { backgroundColor: '#27272A' }]}>
              <Moon size={18} color="#5AC8FA" />
            </View>
            <Text style={[styles.settingLabel, { flex: 1 }]}>Theme</Text>
            <View style={styles.themeBadge}>
              <Text style={styles.themeBadgeText}>{settings.theme}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.separator} />

          {/* Accent Color */}
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: '#27272A' }]}>
              <Palette size={18} color="#A855F7" />
            </View>
            <Text style={styles.settingLabel}>Accent Color</Text>
          </View>
          <View style={styles.colorPicker}>
            {ACCENT_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorDot, { backgroundColor: c }, settings.accentColor === c && styles.colorDotActive]}
                onPress={() => updateSetting('accentColor', c)}
              />
            ))}
          </View>
        </View>

        {/* Notifications */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          {[
            {
              icon: <Bell size={18} color="#FF7849" />, iconBg: '#FF784920', label: 'Evening Check-in',
              val: settings.remindersEnabled,
              set: (v: boolean) => { updateSetting('remindersEnabled', v); recomputeEveningCheckIn().catch(e => console.error(e)); },
            },
            {
              icon: <MessageSquare size={18} color="#C7F464" />, iconBg: '#C7F46420', label: 'Motivational Quotes',
              val: settings.motivationalQuotes,
              set: (v: boolean) => updateSetting('motivationalQuotes', v),
            },
            {
              icon: <Zap size={18} color="#FFD93D" />, iconBg: '#FFD93D20', label: 'Streak Alerts',
              val: settings.streakAlerts,
              set: (v: boolean) => { updateSetting('streakAlerts', v); recomputeEveningCheckIn().catch(e => console.error(e)); },
            },
            {
              icon: <Heart size={18} color="#FF5DA2" />, iconBg: '#FF5DA220', label: 'Bring Me Back',
              val: settings.inactivityNudgeEnabled,
              set: (v: boolean) => { updateSetting('inactivityNudgeEnabled', v); recomputeInactivityNudge().catch(e => console.error(e)); },
            },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={styles.settingRow}>
                <View style={[styles.settingIcon, { backgroundColor: item.iconBg }]}>{item.icon}</View>
                <Text style={[styles.settingLabel, { flex: 1 }]}>{item.label}</Text>
                <ToggleSwitch value={item.val} onValueChange={item.set} />
              </View>
              {i < arr.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>

        {/* General */}
        <Text style={styles.sectionLabel}>GENERAL</Text>
        <View style={styles.card}>
          {[
            { icon: <Database size={18} color="#5AC8FA" />, iconBg: '#5AC8FA20', label: 'Backup & Sync', route: '/backup' },
            { icon: <Shield size={18} color="#A855F7" />, iconBg: '#A855F720', label: 'Privacy', route: '/privacy' },
            { icon: <HelpCircle size={18} color="#C7F464" />, iconBg: '#C7F46420', label: 'Help & Support', route: '/help' },
            { icon: <Info size={18} color="#707070" />, iconBg: '#27272A', label: 'About Habit Tracker', route: '/about' },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <TouchableOpacity style={styles.settingRow} onPress={() => router.push(item.route as any)}>
                <View style={[styles.settingIcon, { backgroundColor: item.iconBg }]}>{item.icon}</View>
                <Text style={[styles.settingLabel, { flex: 1 }]}>{item.label}</Text>
                <ChevronRight size={16} color="#707070" />
              </TouchableOpacity>
              {i < arr.length - 1 && <View style={styles.separator} />}
            </View>
          ))}
        </View>

        {/* App Version */}
        <Text style={styles.version}>Habit Tracker v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingTop: 56 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backBtn: { backgroundColor: '#1C1C1F', padding: 10, borderRadius: 50, borderWidth: 1, borderColor: '#27272A' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#707070', letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },
  card: {
    backgroundColor: '#1C1C1F',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 15, color: '#FFFFFF', fontWeight: '500' },
  separator: { height: 1, backgroundColor: '#27272A', marginLeft: 50 },

  themeBadge: { backgroundColor: '#C7F46420', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  themeBadgeText: { fontSize: 12, color: '#C7F464', fontWeight: '700' },

  colorPicker: { flexDirection: 'row', gap: 12, paddingBottom: 14, paddingLeft: 50 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: '#FFFFFF', transform: [{ scale: 1.2 }] },

  version: { textAlign: 'center', fontSize: 12, color: '#3F3F3F', marginTop: -12 },
});
