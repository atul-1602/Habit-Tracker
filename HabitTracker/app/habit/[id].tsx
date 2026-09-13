import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, MoreVertical, CheckCircle2, Flame, Zap, Target, Trash2, Pencil } from 'lucide-react-native';
import { useHabit, useArchiveHabit } from '../../src/hooks/useHabits';
import { useCompletions, useToggleCompletion } from '../../src/hooks/useCompletions';
import { useHabitStats, useStatsHistory } from '../../src/hooks/useStats';
import { todayISO, buildCalendarGrid, weekdayShort, MONTH_SHORT } from '../../src/lib/dateUtils';

const TODAY = todayISO();
const DAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function WeekBars({ habitId, color }: { habitId: string; color: string }) {
  // Real last-7-days completion for THIS habit specifically (rate is 0 or 1
  // per day since it's a single habit, not an aggregate across all habits).
  const { data: history = [] } = useStatsHistory(7, habitId);

  return (
    <View style={styles.weekChart}>
      {history.map((day) => {
        const done = day.rate >= 1;
        const label = weekdayShort(day.date)[0];
        return (
          <View key={day.date} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${done ? 100 : 8}%`,
                    backgroundColor: done ? color : '#27272A',
                  },
                ]}
              />
            </View>
            <Text style={styles.barLabel}>{label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: habit, isLoading } = useHabit(id ?? '');
  const { data: completionMap = {} } = useCompletions(TODAY);
  const { data: stats } = useHabitStats(id ?? '');
  const { mutate: toggle, isPending: isToggling } = useToggleCompletion(TODAY);
  const { mutate: archive } = useArchiveHabit();

  const isCompletedToday = !!completionMap[id ?? ''];

  const handleArchive = () => {
    Alert.alert(
      'Archive Habit',
      `Are you sure you want to archive "${habit?.name}"? You can restore it later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            archive(id ?? '', { onSuccess: () => router.back() });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color="#C7F464" size="large" />
      </View>
    );
  }

  if (!habit) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: '#707070' }}>Habit not found.</Text>
      </View>
    );
  }

  const now = new Date();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ChevronLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headerEmoji, { backgroundColor: `${habit.color}25` }]}>
            <Text style={{ fontSize: 32 }}>{habit.emoji}</Text>
          </View>
          <Text style={styles.habitTitle}>{habit.name}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: `${habit.color}25` }]}>
            <Text style={[styles.categoryText, { color: habit.color }]}>{habit.category}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => router.push(`/edit-habit/${id}`)} style={styles.iconBtn}>
            <Pencil size={20} color="#C7F464" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleArchive} style={styles.iconBtn}>
            <Trash2 size={20} color="#FF7849" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { icon: <Flame size={16} color="#FF7849" />, bg: '#FF784920', val: stats?.current_streak ?? 0, lbl: 'Current Streak' },
            { icon: <Zap size={16} color="#FFD93D" />, bg: '#FFD93D20', val: stats?.longest_streak ?? 0, lbl: 'Longest Streak' },
            { icon: <Target size={16} color="#C7F464" />, bg: '#C7F46420', val: `${Math.round((stats?.completion_rate ?? 0) * 100)}%`, lbl: 'Success Rate' },
          ].map(s => (
            <View key={s.lbl} style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>{s.icon}</View>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLbl}>{s.lbl}</Text>
            </View>
          ))}
        </View>

        {/* Mini Month Calendar */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{MONTH_SHORT[now.getMonth()]} {now.getFullYear()}</Text>
            <Text style={styles.sectionSub}>{stats?.total_completed ?? 0} days completed</Text>
          </View>
          <View style={styles.miniCalHeader}>
            {DAYS_SHORT.map((d, i) => <Text key={i} style={styles.miniDayHeader}>{d}</Text>)}
          </View>
          <View style={styles.miniCalGrid}>
            {buildCalendarGrid(now.getFullYear(), now.getMonth()).map((day, i) => (
              <View
                key={i}
                style={[
                  styles.miniDay,
                  day === now.getDate() && styles.miniDayToday,
                  day && day < now.getDate() ? styles.miniDayFull : styles.miniDayEmpty,
                ]}
              />
            ))}
          </View>
        </View>

        {/* This Week */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <Text style={styles.sectionSub}>{habit.frequency}</Text>
          </View>
          <WeekBars habitId={id ?? ''} color={habit.color} />
        </View>

        {/* Mark as Done */}
        <TouchableOpacity
          style={[styles.doneBtn, isCompletedToday && styles.doneBtnCompleted]}
          onPress={() => toggle({ habitId: id ?? '', completed: !isCompletedToday })}
          disabled={isToggling}
          activeOpacity={0.8}
        >
          {isToggling ? (
            <ActivityIndicator color="#111111" />
          ) : (
            <>
              <CheckCircle2 size={22} color={isCompletedToday ? '#111111' : '#111111'} />
              <Text style={styles.doneBtnText}>
                {isCompletedToday ? 'Completed Today ✓' : 'Mark as Done'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 24 },
  iconBtn: { backgroundColor: '#1C1C1F', padding: 10, borderRadius: 50, borderWidth: 1, borderColor: '#27272A', marginTop: 4 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerEmoji: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  habitTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 6 },
  categoryBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  categoryText: { fontSize: 13, fontWeight: '700' },

  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: '#1C1C1F', borderRadius: 16, borderWidth: 1, borderColor: '#27272A', padding: 14, alignItems: 'center' },
  statIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statVal: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 2 },
  statLbl: { fontSize: 10, color: '#707070', textAlign: 'center' },

  section: { backgroundColor: '#1C1C1F', borderRadius: 20, borderWidth: 1, borderColor: '#27272A', padding: 18, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  sectionSub: { fontSize: 13, color: '#707070' },

  miniCalHeader: { flexDirection: 'row', marginBottom: 8 },
  miniDayHeader: { flex: 1, textAlign: 'center', fontSize: 11, color: '#707070' },
  miniCalGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  miniDay: { width: '14.28%', aspectRatio: 1, padding: 2, borderRadius: 6 },
  miniDayEmpty: {},
  miniDayFull: { backgroundColor: '#C7F46440' },
  miniDayToday: { backgroundColor: '#C7F464' },

  weekChart: { flexDirection: 'row', justifyContent: 'space-between', height: 100 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { flex: 1, width: 28, backgroundColor: '#27272A', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden', marginBottom: 6 },
  barFill: { borderRadius: 8 },
  barLabel: { fontSize: 11, color: '#707070' },

  doneBtn: {
    backgroundColor: '#C7F464', borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 4,
  },
  doneBtnCompleted: { backgroundColor: '#27272A', borderWidth: 1, borderColor: '#C7F46460' },
  doneBtnText: { fontSize: 17, fontWeight: 'bold', color: '#111111' },
});
