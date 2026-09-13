import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../../src/components/ui/Text';
import { FadeInView } from '../../src/components/ui/FadeInView';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { useHabits } from '../../src/hooks/useHabits';
import { useCompletions, useToggleCompletion } from '../../src/hooks/useCompletions';
import { useMonthCompletions } from '../../src/hooks/useCompletions';
import { buildCalendarGrid, dayToISO, MONTH_SHORT, isHabitScheduledForDate } from '../../src/lib/dateUtils';

const DAYS_HEADER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function CalendarTab() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(now.getDate());

  const selectedISO = dayToISO(year, month, selected);

  const { data: monthMap = {}, isLoading: monthLoading } = useMonthCompletions(year, month);
  const { data: habits = [], isLoading: habitsLoading } = useHabits();
  const { data: completionMap = {} } = useCompletions(selectedISO);
  const { mutate: toggleCompletion } = useToggleCompletion(selectedISO);

  const days = buildCalendarGrid(year, month);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(1);
  };

  // Only habits actually scheduled for the selected day — a "weekdays" or
  // "custom" habit shouldn't appear (or count toward the ratio) on a day
  // it's not meant to run.
  const scheduledHabits = habits.filter(h => isHabitScheduledForDate(h, selectedISO));

  const getIntensity = (day: number) => {
    const iso = dayToISO(year, month, day);
    const count = monthMap[iso] ?? 0;
    const total = habits.filter(h => isHabitScheduledForDate(h, iso)).length;
    if (total === 0 || count === 0) return 0;
    const ratio = count / total;
    if (ratio < 0.33) return 1;
    if (ratio < 0.66) return 2;
    return 3;
  };

  const dotColors = ['#27272A', '#C7F46440', '#C7F46480', '#C7F464'];

  return (
    <FadeInView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#111111" />

      <View style={styles.header}>
        <Text style={styles.title}>Calendar</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Month Navigator */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <ChevronLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{MONTH_SHORT[month]} {year}</Text>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <ChevronRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Day Headers */}
        <View style={styles.dayRow}>
          {DAYS_HEADER.map((d, i) => <Text key={i} style={styles.dayHeader}>{d}</Text>)}
        </View>

        {/* Calendar Grid */}
        <View style={styles.calGrid}>
          {days.map((day, i) => {
            const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
            const isSelected = day === selected;
            const intensity = day ? getIntensity(day) : 0;

            return (
              <TouchableOpacity
                key={i}
                style={[styles.dayCell, isSelected && styles.selectedCell, isToday && !isSelected && styles.todayCell]}
                onPress={() => day && setSelected(day)}
                disabled={!day}
              >
                {day ? (
                  <>
                    <Text style={[styles.dayNum, isSelected && styles.selectedDayNum, isToday && !isSelected && styles.todayNum]}>
                      {day}
                    </Text>
                    {intensity > 0 && (
                      <View style={[styles.intensityDot, { backgroundColor: dotColors[intensity] }]} />
                    )}
                  </>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Detail */}
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{MONTH_SHORT[month]} {selected}, {year}</Text>
          {!habitsLoading && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {scheduledHabits.filter(h => completionMap[h.id]).length}/{scheduledHabits.length}
              </Text>
            </View>
          )}
        </View>

        {habitsLoading ? (
          <ActivityIndicator color="#C7F464" style={{ marginTop: 24 }} />
        ) : habits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No habits yet. Add one from the Home tab!</Text>
          </View>
        ) : scheduledHabits.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No habits scheduled for this day.</Text>
          </View>
        ) : (
          scheduledHabits.map(h => (
            <TouchableOpacity
              key={h.id}
              style={styles.habitRow}
              onPress={() => toggleCompletion({ habitId: h.id, completed: !completionMap[h.id] })}
            >
              <View style={styles.habitLeft}>
                <View style={[styles.habitIcon, { backgroundColor: `${h.color}25` }]}>
                  <Text style={{ fontSize: 16 }}>{h.emoji}</Text>
                </View>
                <Text style={styles.habitTitle}>{h.name}</Text>
              </View>
              {completionMap[h.id]
                ? <CheckCircle2 size={24} color="#C7F464" />
                : <Circle size={24} color="#27272A" />}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111111', paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { backgroundColor: '#1C1C1F', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#27272A' },
  monthLabel: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  dayRow: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: '#707070' },

  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 24 },
  dayCell: { width: '14.28%', aspectRatio: 0.85, alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 4 },
  selectedCell: { backgroundColor: '#C7F464' },
  todayCell: { borderWidth: 1, borderColor: '#C7F464' },
  dayNum: { fontSize: 14, color: '#FFFFFF', fontWeight: '500' },
  selectedDayNum: { color: '#111111', fontWeight: '700' },
  todayNum: { color: '#C7F464' },
  intensityDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  badge: { backgroundColor: '#C7F46420', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 13, color: '#C7F464', fontWeight: '700' },

  habitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1C1C1F', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#27272A' },
  habitLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  habitIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  habitTitle: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },

  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#707070', textAlign: 'center' },
});
