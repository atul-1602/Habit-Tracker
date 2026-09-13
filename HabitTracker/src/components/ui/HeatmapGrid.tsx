import { View, StyleSheet } from 'react-native';
import { Text } from './Text';

interface HeatmapGridProps {
  /** [dayIndex 0-6 (Mon-Sun)][weekIndex 0-4 (oldest→newest)] → intensity 0-3 */
  data?: number[][];
  days?: string[];
}

const COLORS = ['#27272A', '#C7F46440', '#C7F46480', '#C7F464'];
const WEEKS = 5;

export function HeatmapGrid({ data, days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] }: HeatmapGridProps) {
  return (
    <View style={styles.container}>
      <View style={styles.grid}>
        {days.map((day, di) => (
          <View key={di} style={styles.column}>
            <Text style={styles.dayLabel}>{day}</Text>
            {Array.from({ length: WEEKS }).map((_, wi) => {
              const intensity = data?.[di]?.[wi] ?? 0;
              return (
                <View
                  key={wi}
                  style={[styles.dot, { backgroundColor: COLORS[intensity] }]}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 11,
    color: '#707070',
    marginBottom: 2,
  },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 8,
  },
});
