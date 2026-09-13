import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { FadeInView } from '../../src/components/ui/FadeInView';
import { ProgressBar } from '../../src/components/ui/ProgressBar';
import { HeatmapGrid } from '../../src/components/ui/HeatmapGrid';
import { Share2, Flame, Zap, Target } from 'lucide-react-native';
import { useState } from 'react';
import { useHabits } from '../../src/hooks/useHabits';
import { useStats, useStatsHistory, useHabitStats } from '../../src/hooks/useStats';
import { DailyHistoryPoint, Habit } from '../../src/domain/types';
import { todayISO, mondayFirstDayIndex } from '../../src/lib/dateUtils';
import Svg, { Polyline, Circle } from 'react-native-svg';

/** Real daily-history sparkline — one point per day in the selected range.
 * `width="100%"` + `viewBox` (rather than a fixed pixel width) lets it fill
 * the card's actual width on any screen size; the internal W/H below are
 * just the coordinate space used to compute point positions. */
function MiniSparkline({ history }: { history: DailyHistoryPoint[] }) {
  const W = 300, H = 110, PAD = 10;
  if (history.length === 0) return <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} />;

  const step = history.length > 1 ? (W - PAD * 2) / (history.length - 1) : 0;
  const coords = history.map((pt, i) => ({
    x: PAD + i * step,
    y: H - PAD - pt.rate * (H - PAD * 2),
  }));
  const pts = coords.map((c) => `${c.x},${c.y}`).join(' ');
  const last = coords[coords.length - 1];

  return (
    <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`}>
      <Polyline points={pts} fill="none" stroke="#A855F7" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {last && <Circle cx={last.x} cy={last.y} r={4} fill="#A855F7" />}
    </Svg>
  );
}

const TABS = [
  { label: 'Week', days: 7 },
  { label: 'Month', days: 30 },
  { label: 'Year', days: 365 },
];

/**
 * Reshapes an ascending (oldest→newest, ending today) history array into the
 * [dayIndex 0-6][weekIndex 0-4] grid `HeatmapGrid` expects. The history query
 * is deliberately sized so it starts on a Monday 4 weeks back — this just
 * pads the still-in-progress current week (today → Sunday) with empty cells
 * so the grid always renders a full 5×7 rectangle.
 */
function buildHeatmapData(history: DailyHistoryPoint[]): number[][] {
  const grid: number[][] = Array.from({ length: 7 }, () => Array(5).fill(0));
  const padded = history.slice(0, 35);
  while (padded.length < 35) padded.push({ date: '', completed: 0, total: 0, rate: 0 });

  padded.forEach((pt, i) => {
    const dayIdx = i % 7;
    const weekIdx = Math.floor(i / 7);
    const intensity =
      pt.completed === 0 ? 0 : pt.rate < 0.33 ? 1 : pt.rate < 0.66 ? 2 : 3;
    grid[dayIdx][weekIdx] = intensity;
  });
  return grid;
}

/** One row of the "Habits Performance" list — its own component so it can
 * pull this specific habit's real stats via `useHabitStats`, rather than the
 * whole list sharing one global completion rate. */
function HabitPerformanceRow({ habit, isLast }: { habit: Habit; isLast: boolean }) {
  const { data: habitStats } = useHabitStats(habit.id);
  const rate = habitStats?.completion_rate ?? 0;

  return (
    <View style={[styles.perfRow, !isLast && { marginBottom: 16 }]}>
      <View style={styles.perfLeft}>
        <Text style={{ fontSize: 18 }}>{habit.emoji}</Text>
        <Text style={styles.perfTitle} numberOfLines={1}>{habit.name}</Text>
      </View>
      <View style={styles.perfBarWrap}>
        <ProgressBar progress={rate} color={habit.color} />
      </View>
      <Text style={[styles.perfPct, { color: habit.color }]}>{Math.round(rate * 100)}%</Text>
    </View>
  );
}

export default function AnalyticsTab() {
  const [activeTab, setActiveTab] = useState(0);
  const { data: habits = [] } = useHabits();
  const { data: stats, isLoading } = useStats();
  const { data: history = [] } = useStatsHistory(TABS[activeTab].days);
  // Heatmap always shows a fixed 5-Monday-aligned-week window, independent
  // of the Week/Month/Year toggle above.
  const heatmapDays = mondayFirstDayIndex(todayISO()) + 1 + 28;
  const { data: heatmapHistory = [] } = useStatsHistory(heatmapDays);
  const heatmapData = buildHeatmapData(heatmapHistory);

  const completionRate = Math.round((stats?.completion_rate ?? 0) * 100);

  const handleShare = () => {
    Share.share({
      message:
        `🏆 My Habit Tracker progress\n\n` +
        `🔥 ${stats?.current_streak ?? 0}-day current streak (best: ${stats?.longest_streak ?? 0})\n` +
        `📊 ${completionRate}% consistency\n` +
        `✅ ${stats?.total_completed ?? 0} habits completed total\n\n` +
        `Tracked with Habit Tracker`,
    }).catch(() => {
      // User cancelled the share sheet — nothing to do.
    });
  };

  return (
    <FadeInView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Share2 size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Period Toggle */}
        <View style={styles.toggle}>
          {TABS.map((t, i) => (
            <TouchableOpacity
              key={t.label}
              style={[styles.toggleBtn, activeTab === i && styles.toggleActive]}
              onPress={() => setActiveTab(i)}
            >
              <Text style={[styles.toggleText, activeTab === i && styles.toggleTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <ActivityIndicator color="#C7F464" style={{ marginTop: 48 }} />
        ) : (
          <>
            {/* Consistency Score Card */}
            <View style={styles.consistencyCard}>
              <View style={styles.consistencyTop}>
                <View>
                  <Text style={styles.cardLabel}>Consistency Score</Text>
                  <Text style={styles.bigStat}>{completionRate}%</Text>
                </View>
                <View style={styles.smileWrap}>
                  <Text style={{ fontSize: 24, lineHeight: 30 }}>
                    {completionRate >= 80 ? '😊' : completionRate >= 50 ? '😐' : '😔'}
                  </Text>
                </View>
              </View>
              <MiniSparkline history={history} />
            </View>

            {/* Quick Stats */}
            <View style={styles.statsRow}>
              {[
                { icon: <Flame size={18} color="#FF7849" />, bg: '#FF784920', val: `${stats?.current_streak ?? 0}d`, lbl: 'Current Streak' },
                { icon: <Target size={18} color="#C7F464" />, bg: '#C7F46420', val: `${completionRate}%`, lbl: 'Completion' },
                { icon: <Zap size={18} color="#A855F7" />, bg: '#A855F720', val: stats?.total_completed ?? 0, lbl: 'Total Done' },
              ].map(s => (
                <View key={s.lbl} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: s.bg }]}>{s.icon}</View>
                  <Text style={styles.statVal}>{s.val}</Text>
                  <Text style={styles.statLbl}>{s.lbl}</Text>
                </View>
              ))}
            </View>

            {/* Month Stats Row */}
            <View style={styles.monthRow}>
              {[
                { label: 'Total Days', value: stats?.total_days_tracked ?? 0 },
                { label: 'Completed', value: stats?.total_completed ?? 0, color: '#C7F464' },
                { label: 'Best Streak', value: `${stats?.longest_streak ?? 0}d`, color: '#FF7849' },
              ].map(s => (
                <View key={s.label} style={styles.monthCard}>
                  <Text style={[styles.monthVal, s.color ? { color: s.color } : {}]}>{s.value}</Text>
                  <Text style={styles.monthLbl}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* Heatmap */}
            <Text style={styles.sectionTitle}>Activity Heatmap</Text>
            <View style={styles.card}>
              <HeatmapGrid data={heatmapData} />
            </View>

            {/* Performance */}
            {habits.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Habits Performance</Text>
                <View style={styles.card}>
                  {habits.map((habit, index) => (
                    <HabitPerformanceRow key={habit.id} habit={habit} isLast={index === habits.length - 1} />
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  shareBtn: { backgroundColor: '#1C1C1F', padding: 10, borderRadius: 50, borderWidth: 1, borderColor: '#27272A' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  toggle: { flexDirection: 'row', backgroundColor: '#1C1C1F', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  toggleActive: { backgroundColor: '#27272A' },
  toggleText: { fontSize: 14, color: '#707070', fontWeight: '600' },
  toggleTextActive: { color: '#FFFFFF' },

  consistencyCard: { backgroundColor: '#1C1C1F', borderRadius: 20, borderWidth: 1, borderColor: '#27272A', padding: 20, marginBottom: 16 },
  consistencyTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  cardLabel: { fontSize: 13, color: '#707070', marginBottom: 4 },
  // Explicit lineHeight is required here: the shared <Text> component always
  // applies NativeWind's `text-base` class (line-height: 24), which clips
  // any custom fontSize larger than that unless overridden in the same style.
  bigStat: { fontSize: 40, lineHeight: 48, fontWeight: 'bold', color: '#FFFFFF' },
  smileWrap: {
    backgroundColor: '#C7F46415', borderRadius: 50,
    width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#1C1C1F', borderRadius: 16, borderWidth: 1, borderColor: '#27272A', padding: 14, alignItems: 'center' },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statVal: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 2 },
  statLbl: { fontSize: 10, color: '#707070', textAlign: 'center' },

  monthRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  monthCard: { flex: 1, backgroundColor: '#1C1C1F', borderRadius: 14, borderWidth: 1, borderColor: '#27272A', padding: 14, alignItems: 'center' },
  monthVal: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  monthLbl: { fontSize: 11, color: '#707070', marginTop: 2 },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  card: { backgroundColor: '#1C1C1F', borderRadius: 20, borderWidth: 1, borderColor: '#27272A', padding: 20, marginBottom: 20 },

  perfRow: { flexDirection: 'row', alignItems: 'center' },
  perfLeft: { flexDirection: 'row', alignItems: 'center', width: 110, gap: 8 },
  perfTitle: { fontSize: 13, color: '#FFFFFF', fontWeight: '500', flex: 1 },
  perfBarWrap: { flex: 1, marginHorizontal: 10 },
  perfPct: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },
});
