import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { HabitCard } from '../../src/components/ui/HabitCard';
import { ProgressRing } from '../../src/components/ui/ProgressRing';
import { FadeInView } from '../../src/components/ui/FadeInView';
import { Flame, Bell, ChevronRight, Plus } from 'lucide-react-native';
import { useAppUser } from '../../src/hooks/useAppUser';
import { useUserProfile } from '../../src/hooks/useUser';
import { useHabits } from '../../src/hooks/useHabits';
import { useCompletions, useToggleCompletion } from '../../src/hooks/useCompletions';
import { useStats } from '../../src/hooks/useStats';
import { useNotificationLog } from '../../src/hooks/useNotificationLog';
import { todayISO, isHabitScheduledForDate } from '../../src/lib/dateUtils';
import { useRouter } from 'expo-router';

const TODAY = todayISO();

export default function HomeTab() {
  const router = useRouter();
  const { user } = useAppUser();
  const { data: profile } = useUserProfile();
  const clerkName = user?.firstName || user?.username || user?.fullName?.split(' ')[0];
  const dbName = profile?.display_name && profile.display_name !== 'Habit Tracker User' ? profile.display_name.split(' ')[0] : null;
  const firstName = dbName || clerkName || 'there';

  const { data: habits = [], isLoading: habitsLoading } = useHabits();
  const { data: completionMap = {} } = useCompletions(TODAY);
  const { data: stats } = useStats();
  const { mutate: toggleCompletion } = useToggleCompletion(TODAY);
  const { unreadCount } = useNotificationLog();

  // Only habits actually scheduled for today (respects weekdays/custom
  // frequency) — a habit set to "weekdays only" shouldn't show up, or count
  // toward today's progress, on a Saturday.
  const todaysHabits = habits.filter(h => isHabitScheduledForDate(h, TODAY));

  const completed = todaysHabits.filter(h => completionMap[h.id]).length;
  const total = todaysHabits.length;
  const progress = total > 0 ? completed / total : 0;

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning,';
    if (h < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  return (
    <FadeInView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name}>{firstName} 👋</Text>
          <Text style={styles.subtitle}>Let's make today amazing!</Text>
        </View>
        <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')}>
          <Bell size={20} color="#FFFFFF" />
          {unreadCount > 0 && <View style={styles.bellDot} />}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Streak Banner */}
        <View style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <Flame size={28} color="#FF7849" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.streakValue}>
                {stats?.current_streak ?? 0} Day Streak
              </Text>
              <Text style={styles.streakSub}>
                {(stats?.current_streak ?? 0) > 0 ? 'Keep it up! 🔥' : 'Start your streak today!'}
              </Text>
            </View>
          </View>
          <View style={styles.flameBg}>
            <Flame size={110} color="#FF7849" />
          </View>
        </View>

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.sectionTitle}>Today's Progress</Text>
            <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/(tabs)/analytics')}>
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={14} color="#C7F464" />
            </TouchableOpacity>
          </View>
          <View style={styles.progressRow}>
            <ProgressRing progress={progress} size={140} strokeWidth={13} label={`${completed} / ${total} done`} />
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.statNum}>{completed}</Text>
                <Text style={styles.statLbl}>Completed</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.progressStat}>
                <Text style={styles.statNum}>{total - completed}</Text>
                <Text style={styles.statLbl}>Remaining</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.progressStat}>
                <Text style={[styles.statNum, { color: '#C7F464' }]}>{Math.round(progress * 100)}%</Text>
                <Text style={styles.statLbl}>Rate</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Today's Habits */}
        <View style={styles.habitsHeader}>
          <Text style={styles.sectionTitle}>Today's Habits</Text>
          <TouchableOpacity onPress={() => router.push('/create-habit')}>
            <Text style={styles.editText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {habitsLoading ? (
          <ActivityIndicator color="#C7F464" style={{ marginTop: 32 }} />
        ) : habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>✨</Text>
            <Text style={styles.emptyTitle}>No habits yet!</Text>
            <Text style={styles.emptySub}>Let's change that 🚀{'\n'}Start small, dream big.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/create-habit')}>
              <Plus size={16} color="#111111" />
              <Text style={styles.emptyBtnText}>Add Your First Habit</Text>
            </TouchableOpacity>
          </View>
        ) : todaysHabits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48 }}>🎉</Text>
            <Text style={styles.emptyTitle}>Nothing scheduled today</Text>
            <Text style={styles.emptySub}>Enjoy your day off — check the calendar{'\n'}to see what's coming up.</Text>
          </View>
        ) : (
          todaysHabits.map(habit => (
            <HabitCard
              key={habit.id}
              id={habit.id}
              title={habit.name}
              subtitle={habit.category}
              emoji={habit.emoji}
              iconColor={habit.color}
              isCompleted={!!completionMap[habit.id]}
              frequency={habit.frequency}
              frequencyDays={habit.frequency_days}
              reminderEnabled={habit.reminder_enabled}
              reminderTime={habit.reminder_time}
              onToggle={() =>
                toggleCompletion({ habitId: habit.id, completed: !completionMap[habit.id] })
              }
            />
          ))
        )}

        {habits.length > 0 && (
          <TouchableOpacity style={styles.addMore} onPress={() => router.push('/create-habit')}>
            <Text style={styles.addMoreText}>+ Add a new habit</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingTop: 56 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 24, marginBottom: 24,
  },
  greeting: { fontSize: 16, color: '#B5B5B5' },
  name: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginTop: 2 },
  subtitle: { fontSize: 13, color: '#707070', marginTop: 4 },
  bellBtn: {
    backgroundColor: '#1C1C1F', padding: 12, borderRadius: 50,
    borderWidth: 1, borderColor: '#27272A',
  },
  bellDot: {
    position: 'absolute', top: 10, right: 10, width: 8, height: 8,
    borderRadius: 4, backgroundColor: '#FF7849', borderWidth: 1, borderColor: '#111111',
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  streakCard: {
    backgroundColor: '#1C1C1F', borderRadius: 20, borderWidth: 1,
    borderColor: '#FF784930', padding: 20, flexDirection: 'row', alignItems: 'center',
    marginBottom: 16, overflow: 'hidden',
  },
  streakLeft: { flexDirection: 'row', alignItems: 'center', zIndex: 1, flex: 1 },
  streakValue: { fontSize: 18, fontWeight: 'bold', color: '#FF7849' },
  streakSub: { fontSize: 12, color: '#707070', marginTop: 2 },
  flameBg: { position: 'absolute', right: -20, opacity: 0.08 },

  progressCard: {
    backgroundColor: '#1C1C1F', borderRadius: 20, borderWidth: 1,
    borderColor: '#27272A', padding: 20, marginBottom: 24,
  },
  progressHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 13, color: '#C7F464', fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  progressStats: { flex: 1 },
  progressStat: { alignItems: 'center', paddingVertical: 6 },
  statNum: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  statLbl: { fontSize: 11, color: '#707070', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#27272A', marginVertical: 4 },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  habitsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  editText: { fontSize: 14, color: '#C7F464', fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginTop: 12, marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#707070', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#C7F464', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14,
  },
  emptyBtnText: { fontSize: 15, fontWeight: 'bold', color: '#111111' },

  addMore: {
    marginTop: 8, borderWidth: 1, borderColor: '#27272A', borderRadius: 14,
    padding: 16, alignItems: 'center', borderStyle: 'dashed',
  },
  addMoreText: { fontSize: 14, color: '#707070' },
});
